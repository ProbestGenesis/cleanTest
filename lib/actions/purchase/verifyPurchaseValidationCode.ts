"use server"

import { prisma } from "@/lib/prisma"
import z from "zod"

const verifyPurchaseCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
})

export const verifyPurchaseValidationCode = async (
  value: z.infer<typeof verifyPurchaseCodeSchema>
) => {
  try {
    const parsed = verifyPurchaseCodeSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Données invalides",
      }
    }

    const row = await prisma.validationCode.findFirst({
      where: { code: parsed.data.code, type: "PURCHASE" },
      orderBy: { createdAt: "desc" },
      include: {
        purchase: {
          include: {
            provider: { select: { id: true, name: true } },
            purchaseItems: {
              include: {
                product: { select: { id: true, name: true, ref: true } },
              },
            },
          },
        },
      },
    })

    if (!row) return { ok: false as const, message: "Code d’achat invalide" }
    if (row.usedAt)
      return { ok: false as const, message: "Ce code a déjà été utilisé" }
    if (!row.purchase)
      return { ok: false as const, message: "Achat lié introuvable" }
    if (row.purchase.status !== "DELIVERED") {
      return {
        ok: false as const,
        message: "Cet achat n'est pas encore prêt pour la confirmation",
      }
    }

    const products = row.purchase.purchaseItems.map((item) => ({
      name: item.product?.name ?? item.productName,
      ref: item.product?.ref ?? null,
      quantity: item.quantity,
    }))
    const firstProduct = products[0]

    return {
      ok: true as const,
      message: "Code vérifié avec succès",
      data: {
        purchaseValidationCodeId: row.id,
        purchaseId: row.purchase.id,
        supplierName: row.purchase.provider?.name ?? null,
        productName: firstProduct?.name ?? null,
        productRef: firstProduct?.ref ?? null,
        quantity: firstProduct?.quantity ?? null,
        products,
        status: row.purchase.status,
      },
    }
  } catch (error) {
    console.log(error)
    return { ok: false as const, message: "Une erreur s'est produite" }
  }
}
