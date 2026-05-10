'use server'

import { prisma } from '@/lib/prisma'
import z from 'zod'

const verifyStockReturnCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
  stockReturnId: z.string().min(1, 'Identifiant de demande invalide').optional(),
})

export const verifyStockReturnValidationCode = async (
  value: z.infer<typeof verifyStockReturnCodeSchema>
) => {
  try {
    const parsed = verifyStockReturnCodeSchema.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const validationCode = await prisma.validationCode.findFirst({
      where: {
        type: 'STOCK_RETURN',
        code: parsed.data.code,
        ...(parsed.data.stockReturnId ? { stockReturnId: parsed.data.stockReturnId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        stockReturnId: true,
        code: true,
        createdAt: true,
        usedAt: true,
        stockReturn: {
          select: {
            status: true,
            type: true,
            requestId: true,
            quantityToApply: true,
            product: {
              select: { name: true, ref: true },
            },
          },
        },
      },
    })

    if (!validationCode) {
      return { ok: false, message: 'Code invalide pour cette demande' }
    }

    if (validationCode.usedAt) {
      return { ok: false, message: 'Ce code a déjà été utilisé' }
    }

    if (!validationCode.stockReturn) {
      return { ok: false, message: "La demande liée à ce code est introuvable" }
    }

    if (validationCode.stockReturn.type !== 'STOCK_RETURN') {
      return {
        ok: false,
        message: `Ce code ne correspond pas à une restitution de stock (type: ${validationCode.stockReturn.type})`,
      }
    }

    if (validationCode.stockReturn.status !== 'AWAITING_CONFIRMATION') {
      return { ok: false, message: "Cette demande n'est pas en attente de confirmation" }
    }

    const requestId = validationCode.stockReturn.requestId
    const relatedItems = requestId
      ? await prisma.stockEditHistorique.findMany({
          where: {
            requestId,
            status: 'AWAITING_CONFIRMATION',
            type: 'STOCK_RETURN',
          },
          include: {
            product: {
              select: { name: true, ref: true },
            },
          },
        })
      : [validationCode.stockReturn]

    return {
      ok: true,
      message: 'Code vérifié avec succès',
      data: {
        validationCodeId: validationCode.id,
        stockReturnId: validationCode.stockReturnId,
        products: relatedItems.map((item) => ({
          name: item.product.name,
          ref: item.product.ref,
          quantity: item.quantityToApply,
        })),
        productName: validationCode.stockReturn?.product?.name ?? null,
        productRef: validationCode.stockReturn?.product?.ref ?? null,
        quantity: validationCode.stockReturn?.quantityToApply ?? null,
      },
    }
  } catch (error) {
    console.log(error)
    return { ok: false, message: "Une erreur s'est produite" }
  }
}

export const confirmStockReturnValidationCode = verifyStockReturnValidationCode
