'use server'

import { Prisma } from '@/generated/prisma/client'
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { bulkStockOutRequest } from '@/lib/zodschema'
import { revalidatePath } from 'next/cache'
import z from 'zod'
import crypto from 'node:crypto'

type NotifiedProduct = {
  product: { id: string; name: string; ref: string | null; quantity: number; purchasePrice?: number | null }
  quantity: number
}

export const createBulkStockOutRequest = async (value: z.infer<typeof bulkStockOutRequest>) => {
  try {
    const parsed = bulkStockOutRequest.safeParse(value)
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const id = await isAuthedId()
    if (!id) return { ok: false, message: "Erreur d'authentification" }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { worker: { select: { id: true, name: true } } },
    })
    if (!user?.worker) {
      return { ok: false, message: "Vous n'êtes pas enregistré en tant qu'employé" }
    }

    const superAdmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true },
    })

    let createdProducts: NotifiedProduct[] | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        createdProducts = await prisma.$transaction(
          async (tx) => {
            const globalDestination = parsed.data.items[0]?.destination
            const globalReason = parsed.data.items[0]?.reason
            if (!globalDestination || !globalReason) {
              throw new Error('Le demandeur et la raison sont obligatoires')
            }

            const requestedByProductId = new Map<string, number>()
            for (const item of parsed.data.items) {
              requestedByProductId.set(
                item.productId,
                (requestedByProductId.get(item.productId) ?? 0) + item.quantity
              )
            }

            const normalizedItems = [...requestedByProductId.entries()].map(
              ([productId, quantity]) => ({ productId, quantity })
            )
            const productIds = normalizedItems.map((item) => item.productId)

            const [products, pendingReservations] = await Promise.all([
              tx.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, ref: true, quantity: true, purchasePrice: true },
              }),
              tx.stockEditHistorique.groupBy({
                by: ['productId'],
                where: {
                  productId: { in: productIds },
                  status: { in: ['PENDING_VALIDATION', 'AWAITING_CONFIRMATION'] },
                  type: { in: ['PURCHASE', 'SELL', 'STOCK_OUT'] },
                },
                _sum: { quantityToApply: true },
              }),
            ])

            const productsById = new Map(products.map((product) => [product.id, product]))
            const reservedByProductId = new Map(
              pendingReservations.map((entry) => [entry.productId, entry._sum.quantityToApply ?? 0])
            )

            for (const item of normalizedItems) {
              const product = productsById.get(item.productId)
              if (!product) throw new Error(`Le produit ${item.productId} n'existe plus`)

              const reservedQuantity = reservedByProductId.get(product.id) ?? 0
              const availableQuantity = product.quantity - reservedQuantity
              if (item.quantity > availableQuantity) {
                throw new Error(
                  `Quantité insuffisante pour ${product.name}. Stock: ${product.quantity}, réservé (demandes en attente): ${reservedQuantity}, demandé: ${item.quantity}, disponible: ${availableQuantity}.`
                )
              }
            }

            const requestId = crypto.randomUUID()
            for (const item of normalizedItems) {
              const product = productsById.get(item.productId)
              if (!product) {
                throw new Error(`Le produit ${item.productId} n'existe plus`)
              }

              const reservedQuantity = reservedByProductId.get(item.productId) ?? 0
              const availableQuantity = product.quantity - reservedQuantity
              await tx.stockEditHistorique.create({
                data: {
                  workerId: user.worker!.id,
                  productId: item.productId,
                  requestId,
                  actualQuantity: product.quantity,
                  reservedQuantity: availableQuantity - item.quantity,
                  quantityToApply: item.quantity,
                  type: 'STOCK_OUT',
                  reason: globalReason,
                  destination: globalDestination,
                  preventfieldValue: {
                    requestId,
                    requestedAt: new Date().toISOString(),
                    productUnitCost: product.purchasePrice ?? 0,
                    estimatedTotalCost: (product.purchasePrice ?? 0) * item.quantity,
                    quantityBeforeEdit: product.quantity,
                    quantityAfterEdit: product.quantity - item.quantity,
                    reason: globalReason,
                    destination: globalDestination,
                  },
                },
              })
            }

            if (superAdmins.length > 0) {
              const superAdminIds = superAdmins.map((admin) => admin.id)
              await tx.notification.create({
                data: {
                  emitter: { connect: { id } },
                  receiptIds: superAdminIds,
                  readByIds: superAdminIds.includes(id) ? [id] : [],
                  type: 'STOCK',
                  title: 'Nouvelle demande de sortie de stock',
                  body: `${user.worker!.name} a demandé une sortie de stock pour ${normalizedItems.length} produit(s).`,
                  link: '/interne/stock',
                },
              })
            }

            return normalizedItems
              .map((item) => {
                const product = productsById.get(item.productId)
                if (!product) return null
                return { product, quantity: item.quantity }
              })
              .filter((entry) => Boolean(entry)) as NotifiedProduct[]
          },
          {
            maxWait: 10_000,
            timeout: 20_000,
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        )
        break
      } catch (error: unknown) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? (error as { code?: string }).code
            : undefined
        if (code !== 'P2034' || attempt === 2) throw error
      }
    }

    if (!createdProducts) {
      throw new Error("Impossible d'enregistrer la demande pour le moment. Veuillez réessayer.")
    }

    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/sales', 'page')

    return {
      ok: true,
      message:
        'Demande envoyée. Les sorties seront appliquées après validation du super admin et confirmation du chargé du stock.',
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Une erreur s'est produite"
    console.log(error)
    return { ok: false, message }
  }
}
