"use server"

import { Prisma } from "@/generated/prisma/client"
import { createNotification } from "@/lib/actions/notifications"
import { STOCK_OUT_CODE_VALIDATION_TASK_TITLE } from "@/lib/constants/particularTasks"
import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import z from "zod"

const confirmPurchaseSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
})

export const confirmPurchaseOperation = async (
  value: z.infer<typeof confirmPurchaseSchema>
) => {
  try {
    const parsed = confirmPurchaseSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Données invalides",
      }
    }

    const userId = await isAuthedId()
    if (!userId)
      return { ok: false as const, message: "Erreur d'authentification" }

    const confirmer = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true, role: true } } },
    })
    if (!confirmer?.worker)
      return {
        ok: false as const,
        message: "Vous n'êtes pas enregistré en tant qu'employé",
      }
    const confirmerWorker = confirmer.worker

    const canConfirm = (confirmer.particularRole ?? []).includes(
      STOCK_OUT_CODE_VALIDATION_TASK_TITLE
    )
    if (!canConfirm && confirmer.role !== "superadmin") {
      return {
        ok: false as const,
        message: "Vous n'êtes pas autorisé à confirmer cet achat",
      }
    }

    const superAdmins = await prisma.user.findMany({
      where: { role: "superadmin" },
      select: { id: true },
    })

    const result = await prisma.$transaction(
      async (tx) => {
        const codeRow = await tx.validationCode.findFirst({
          where: { code: parsed.data.code, type: "PURCHASE" },
          orderBy: { createdAt: "desc" },
          include: {
            purchase: {
              include: {
                product: {
                  select: { id: true, name: true, ref: true, quantity: true },
                },
              },
            },
          },
        })

        if (!codeRow?.purchase) {
          throw new Error("Code invalide")
        }
        if (codeRow.usedAt) {
          throw new Error("Ce code a déjà été utilisé")
        }
        if (codeRow.purchase.status !== "DELIVERED") {
          throw new Error("Cet achat n'est pas prêt pour confirmation")
        }
        if (!codeRow.purchase.productId || !codeRow.purchase.product) {
          throw new Error("Le produit lié à cet achat est introuvable")
        }
        const product = codeRow.purchase.product

        const stockHistory = await tx.stockEditHistorique.findFirst({
          where: {
            purchaseId: codeRow.purchase.id,
            type: "PURCHASE",
            status: "AWAITING_CONFIRMATION",
          },
        })

        if (!stockHistory) {
          throw new Error(
            "L'historique de stock lié à cet achat est introuvable"
          )
        }

        const quantity =
          Number.parseInt(String(codeRow.purchase.quantity), 10) || 0
        if (quantity <= 0) {
          throw new Error("La quantité de cet achat est invalide")
        }

        const before = product.quantity
        const after = before + quantity

        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: after,
            status: after > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
            purchasePrice: codeRow.purchase.unityPrice,
            sellingPrice: codeRow.purchase.estimatePrice,
            category: codeRow.purchase.category,
            brand: codeRow.purchase.brand,
            unity: codeRow.purchase.unity,
            country: codeRow.purchase.country,
          },
        })

        await tx.stockEditHistorique.update({
          where: { id: stockHistory.id },
          data: {
            type: "PURCHASE",
            status: "ISVALIDED",
            actualQuantity: after,
            currentfieldValue: {
              quantityBefore: before,
              quantityAfter: after,
              confirmedAt: new Date().toISOString(),
              confirmedByWorkerId: confirmerWorker.id,
              confirmedByWorkerName: confirmerWorker.name,
              purchaseCode: parsed.data.code,
            },
          },
        })

        await tx.purchase.update({
          where: { id: codeRow.purchase.id },
          data: { status: "CONFIRMED" },
        })

        await tx.validationCode.update({
          where: { id: codeRow.id },
          data: { usedAt: new Date(), usedByWorkerId: confirmerWorker.id },
        })

        // Notifications will be created after the transaction using the
        // project's notification helper to avoid persisting notifications if
        // the transaction is rolled back.

        return {
          updatedProduct,
          before,
          after,
          quantity,
          purchaseId: codeRow.purchase.id,
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    // Real-time stock notifications handled via createNotification

    if (superAdmins.length > 0) {
      await createNotification({
        title: "Stock mise a jour avec les articles achetées",
        body: `Mise a jour par ${confirmerWorker.name} • Produit: ${result.updatedProduct.name} • Qté ajouté: ${result.quantity}`,
        type: "PURCHASE",
        link: "/interne/purchases",
        receiverIds: superAdmins.map((admin) => admin.id),
      })
    }

    revalidatePath("/interne/purchases")
    revalidatePath("/interne/stock")
    revalidatePath("/interne/products")
    revalidatePath("/")

    return {
      ok: true as const,
      message: "Achat confirmé. Le stock a été mis à jour.",
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Une erreur s'est produite"
    console.log(error)
    return { ok: false as const, message }
  }
}
