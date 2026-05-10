"use server"

import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import z from "zod"

const markPurchaseDeliveredSchema = z.object({
  purchaseId: z.string().min(1, "Achat invalide"),
})

export const markPurchaseDelivered = async (
  value: z.infer<typeof markPurchaseDeliveredSchema>
) => {
  try {
    const parsed = markPurchaseDeliveredSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Données invalides",
      }
    }

    const userId = await isAuthedId()
    if (!userId)
      return { ok: false as const, message: "Erreur d'authentification" }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true } } },
    })
    if (!user?.worker)
      return {
        ok: false as const,
        message: "Vous n'êtes pas enregistré en tant qu'employé",
      }
    const worker = user.worker

    const purchase = await prisma.purchase.findUnique({
      where: { id: parsed.data.purchaseId },
      include: {
        purchaseItems: {
          include: {
            product: true,
          },
        },
        validationCode: true,
      },
    })

    if (!purchase) return { ok: false as const, message: "Achat introuvable" }
    if (purchase.status === "CONFIRMED") {
      return {
        ok: false as const,
        message: "Cet achat a déjà été confirmé par le stock.",
      }
    }

    const validationWorkers = await prisma.user.findMany({
      where: {
        OR: [
          { role: "superadmin" },
          { particularRole: { has: "Validation code achat" } },
        ],
      },
      select: { id: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: "DELIVERED" },
      })

      // On met à jour l'historique de stock pour chaque item
      for (const item of purchase.purchaseItems) {
        const stockHistory = await tx.stockEditHistorique.findFirst({
          where: {
            purchaseId: purchase.id,
            productId: item.productId!,
            status: "PENDING_VALIDATION",
          },
        })

        if (stockHistory) {
          await tx.stockEditHistorique.update({
            where: { id: stockHistory.id },
            data: {
              status: "AWAITING_CONFIRMATION",
              actualQuantity: item.product?.quantity || 0,
            },
          })
        }
      }

      if (validationWorkers.length > 0 && purchase.validationCode) {
        await tx.notification.create({
          data: {
            emitter: { connect: { id: userId } },
            receiptIds: validationWorkers.map((worker) => worker.id),
            readByIds: validationWorkers.some((worker) => worker.id === userId)
              ? [userId]
              : [],
            type: "PURCHASE",
            title: "Livraison d’achat à confirmer",
            body: `${worker.name} a déclaré la livraison de l'achat "${purchase.purchaseItems.map((item) => item.productName).join(", ")}". Code: ${purchase.validationCode.code}`,
            link: "/interne/purchases",
          },
        })
      }
    })

    revalidatePath("/interne/purchases")
    revalidatePath("/interne/stock")

    return {
      ok: true as const,
      message: "Livraison déclarée. Le stock doit maintenant confirmer.",
    }
  } catch (error) {
    console.log(error)
    return { ok: false as const, message: "Une erreur s'est produite" }
  }
}
