'use server'

import { prisma } from '@/lib/prisma'
import z from 'zod'

const verifyStockOutCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
})

export const verifyStockOutValidationCode = async (
  value: z.infer<typeof verifyStockOutCodeSchema>
) => {
  try {
    const parsed = verifyStockOutCodeSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const validationCode = await prisma.validationCode.findFirst({
      where: {
        type: 'STOCK_OUT',
        code: parsed.data.code,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        stockOutId: true,
        code: true,
        createdAt: true,
        usedAt: true,
        stockOut: {
          select: {
            status: true,
            type: true,
            requestId: true,
            quantityToApply: true,
            product: {
              select: {
                name: true,
                ref: true,
              },
            },
          },
        },
      },
    })

    if (!validationCode) {
      return {
        ok: false,
        message: 'Code invalide pour cette demande',
      }
    }

    if (validationCode.usedAt) {
      return { ok: false, message: 'Ce code a déjà été utilisé' }
    }

    if (!validationCode.stockOut) {
      return { ok: false, message: "La demande liée à ce code est introuvable" }
    }

    if (validationCode.stockOut.type !== 'STOCK_OUT') {
      return {
        ok: false,
        message: `Ce code ne correspond pas à une sortie de stock (type: ${validationCode.stockOut.type})`,
      }
    }

    if (validationCode.stockOut.status !== 'AWAITING_CONFIRMATION') {
      return { ok: false, message: "Cette demande n'est pas en attente de confirmation" }
    }

    const requestId = validationCode.stockOut.requestId
    const relatedItems = requestId
      ? await prisma.stockEditHistorique.findMany({
          where: {
            requestId,
            status: 'AWAITING_CONFIRMATION',
            type: 'STOCK_OUT',
          },
          include: {
            product: {
              select: {
                name: true,
                ref: true,
              },
            },
          },
        })
      : [validationCode.stockOut]

    return {
      ok: true,
      message: 'Code vérifié avec succès',
      data: {
        validationCodeId: validationCode.id,
        stockOutId: validationCode.stockOutId,
        products: relatedItems.map((item) => ({
          name: item.product.name,
          ref: item.product.ref,
          quantity: item.quantityToApply,
        })),
        // Fallback for single product UI if needed (though we'll update the UI)
        productName: validationCode.stockOut?.product?.name ?? null,
        productRef: validationCode.stockOut?.product?.ref ?? null,
        quantity: validationCode.stockOut?.quantityToApply ?? null,
      },
    }
  } catch (error) {
    console.log(error)
    return {
      ok: false,
      message: "Une erreur s'est produite",
    }
  }
}

export const confirmStockOutValidationCode = verifyStockOutValidationCode
