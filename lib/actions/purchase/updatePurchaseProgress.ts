"use server"

import { isAdminId } from "@/lib/isAdmin"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { PaymentMethod } from "@/generated/prisma/client"

type UpdateProgressInput = {
  purchaseId: string
  amountPaid?: number
  paymentMethod?: PaymentMethod
  interests?: number
  receivedQuantity?: number
  dueDate?: string
  notes?: string
}

export const updatePurchaseProgress = async (input: UpdateProgressInput) => {
  try {
    const userId = await isAdminId()
    if (!userId) {
      return {
        ok: false,
        message: "Vous n'avez pas les autorisations nécessaires.",
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true } } },
    })

    if (!user?.worker) {
      return { ok: false, message: "Compte employé introuvable." }
    }

    const workerId = user.worker.id

    const res = await prisma.$transaction(async (tx) => {
      // 1. Fetch current purchase
      const purchase = await tx.purchase.findUnique({
        where: { id: input.purchaseId },
        include: {
          purchaseItems: { select: { productName: true, quantity: true } },
        },
      })

      if (!purchase) throw new Error("Achat introuvable")

      const newAmountPaid = (purchase.amountPaid || 0) + (input.amountPaid || 0)

      // 2. Update purchase fields
      const updatedPurchase = await tx.purchase.update({
        where: { id: input.purchaseId },
        data: {
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          amountPaid: newAmountPaid,
          isPaid: newAmountPaid >= purchase.totalAmount,
          paymentDate: input.amountPaid ? new Date() : undefined,
        },
      })

      // 3. Create a payment if amountPaid is provided
      if (input.amountPaid && input.amountPaid > 0) {
        if (purchase.providerId) {
          await tx.providerPayment.create({
            data: {
              amount: input.amountPaid,
              paymentDate: new Date().toISOString().split("T")[0],
              method: input.paymentMethod || "CASH",
              notes:
                input.notes ||
                `Paiement pour l'achat ${purchase.invoiceNumber || input.purchaseId}`,
              purchaseId: input.purchaseId,
              providerId: purchase.providerId,
              authorId: workerId,
              userId: userId,
            },
          })
        }
      }

      // 4. Send notification
      const superAdmins = await tx.user.findMany({
        where: { role: "superadmin" },
        select: { id: true },
      })

      const receiptIds = superAdmins.map((u) => u.id)

      if (receiptIds.length > 0) {
        let body = ""
        const firstItem = purchase.purchaseItems[0]
        const purchaseLabel =
          firstItem?.productName ?? purchase.invoiceNumber ?? input.purchaseId
        if (input.receivedQuantity !== undefined) {
          body = `La quantité reçue pour l'achat "${purchaseLabel}" a été mise à jour : ${input.receivedQuantity} / ${firstItem?.quantity ?? 0}.`
        } else if (input.amountPaid) {
          body = `Un paiement de ${input.amountPaid.toLocaleString()} XOF a été enregistré pour l'achat "${purchaseLabel}".`
        }

        if (body) {
          await tx.notification.create({
            data: {
              title: "Mise à jour d'achat",
              body,
              type: "PURCHASE",
              link: "/interne/purchases",
              emitter: { connect: { id: userId } },
              receiptIds,
              readByIds: receiptIds.includes(userId) ? [userId] : [],
            },
          })
        }
      }

      return updatedPurchase
    })

    revalidatePath("/interne/purchases")
    return { ok: true, message: "Progression mise à jour avec succès." }
  } catch (error) {
    console.error("Error updating purchase progress:", error)
    return { ok: false, message: "Erreur lors de la mise à jour." }
  }
}
