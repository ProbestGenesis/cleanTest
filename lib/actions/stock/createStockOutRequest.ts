'use server'

import { isAuthedId } from '@/lib/isAuthed'
import { stockOutRequest } from '@/lib/zodschema'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@/generated/prisma/client'
import z from 'zod'

export const createStockOutRequest = async (value: z.infer<typeof stockOutRequest>) => {
  try {
    const parsed = stockOutRequest.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const id = await isAuthedId()
    if (!id) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!user?.worker) {
      return { ok: false, message: "Vous n'êtes pas enregistré en tant qu'employé" }
    }

    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
      select: {
        id: true,
      },
    })

    let productForNotify: { id: string; name: string; ref: string | null; quantity: number } | null =
      null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        productForNotify = await prisma.$transaction(
          async (tx) => {
            const product = await tx.product.findUnique({
              where: { id: parsed.data.productId },
              select: {
                id: true,
                name: true,
                ref: true,
                quantity: true,
              },
            })

            if (!product) {
              throw new Error("Le produit n'existe plus")
            }

            const pendingReservations = await tx.stockEditHistorique.aggregate({
              where: {
                productId: product.id,
                status: { in: ['PENDING_VALIDATION', 'AWAITING_CONFIRMATION'] },
                type: {
                  in: ['PURCHASE', 'SELL', 'STOCK_OUT'],
                },
              },
              _sum: {
                quantityToApply: true,
              },
            })

            const reservedQuantity = pendingReservations._sum.quantityToApply ?? 0
            const availableQuantity = product.quantity - reservedQuantity
            if (parsed.data.quantity > availableQuantity) {
              throw new Error(
                `Quantité insuffisante pour ${product.name}. Stock: ${product.quantity}, réservé (demandes en attente): ${reservedQuantity}, demandé: ${parsed.data.quantity}, disponible: ${availableQuantity}.`
              )
            }

            await tx.stockEditHistorique.create({
              data: {
                worker: { connect: { id: user.worker!.id } },
                product: { connect: { id: product.id } },
                actualQuantity: product.quantity,
                reservedQuantity: availableQuantity - parsed.data.quantity,
                quantityToApply: parsed.data.quantity,
                type: 'STOCK_OUT',
                reason: parsed.data.reason,
                destination: parsed.data.destination,
                preventfieldValue: {
                  quantityBeforeEdit: product.quantity,
                  quantityAfterEdit: product.quantity - parsed.data.quantity,
                  reason: parsed.data.reason,
                  destination: parsed.data.destination,
                },
              },
            })

            if (superAdmins.length > 0) {
              const superAdminIds = superAdmins.map((admin) => admin.id)
              await tx.notification.create({
                data: {
                  emitter: { connect: { id } },
                  receiptIds: superAdminIds,
                  readByIds: superAdminIds.includes(id) ? [id] : [],
                  type: 'STOCK',
                  title: 'Nouvelle demande de sortie de stock',
                  body: `${user.worker!.name} a demandé une sortie de stock pour ${product.name}.`,
                  link: '/interne/stock',
                },
              })
            }

            return product
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        )
        break
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: string }).code
            : undefined
        if (code !== 'P2034' || attempt === 2) {
          throw error
        }
      }
    }

    if (!productForNotify) {
      throw new Error("Impossible d'enregistrer la demande pour le moment. Veuillez réessayer.")
    }
    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/sales', 'page')

    return {
      ok: true,
      message:
        'Demande envoyée. La sortie sera appliquée après validation du super admin et confirmation du chargé du stock.',
    }
  } catch (error) {
    console.log(error)
    return {
      ok: false,
      message: "Une erreur s'est produite",
    }
  }
}
