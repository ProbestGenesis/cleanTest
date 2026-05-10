'use server'

import { isAuthedId } from '@/lib/isAuthed'
import { STOCK_OUT_CODE_VALIDATION_TASK_TITLE } from '@/lib/constants/particularTasks'
import { createNotification } from '@/lib/actions/notifications'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import z from 'zod'

const confirmSaleSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
})

export const confirmSaleOperation = async (value: z.infer<typeof confirmSaleSchema>) => {
  try {
    const parsed = confirmSaleSchema.safeParse(value)
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const userId = await isAuthedId()
    if (!userId) return { ok: false as const, message: "Erreur d'authentification" }

    const confirmer = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true, role: true } } },
    })
    if (!confirmer?.worker) return { ok: false as const, message: "Vous n'êtes pas enregistré en tant qu'employé" }
    if (!(confirmer.particularRole ?? []).includes(STOCK_OUT_CODE_VALIDATION_TASK_TITLE)) {
      return { ok: false as const, message: "Seul le chargé du stock peut valider ce code" }
    }

    const superAdmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true },
    })

    const result = await prisma.$transaction(async (tx) => {
      const codeRow = await tx.validationCode.findFirst({
          where: { type: 'SALE', code: parsed.data.code },
          orderBy: { createdAt: 'desc' },
          include: {
            finalInvoice: {
              include: {
                sales: {
                  include: {
                    product: { select: { id: true, name: true, ref: true, quantity: true } },
                  },
                },
              },
            },
          },
        })

        const invoice = codeRow?.finalInvoice ?? null
        if (!invoice) throw new Error('Code invalide')
        if (codeRow!.usedAt) throw new Error('Ce code a déjà été utilisé')

        const sales = invoice.sales
        if (!sales || sales.length === 0) throw new Error("Aucune vente liée à cette facture")

        const productIds = Array.from(new Set(sales.map((s) => s.productId)))

        // Sum required quantities per product
        const requiredByProductId = new Map<string, number>()
        for (const s of sales) {
          requiredByProductId.set(s.productId, (requiredByProductId.get(s.productId) ?? 0) + s.quantity)
        }

        // Pending reservations by product
        const pending = await tx.stockEditHistorique.groupBy({
          by: ['productId'],
          where: {
            productId: { in: productIds },
            status: { in: ['PENDING_VALIDATION', 'AWAITING_CONFIRMATION'] },
            type: { in: ['SELL', 'STOCK_OUT'] },
          },
          _sum: { quantityToApply: true },
        })
        const pendingByProductId = new Map(pending.map((p) => [p.productId, p._sum.quantityToApply ?? 0]))

        const invoicePending = await tx.stockEditHistorique.groupBy({
          by: ['productId'],
          where: {
            productId: { in: productIds },
            finalInvoiceId: invoice.id,
            status: 'AWAITING_CONFIRMATION',
          },
          _sum: { quantityToApply: true },
        })
        const invoicePendingByProductId = new Map(
          invoicePending.map((p) => [p.productId, p._sum.quantityToApply ?? 0])
        )

        // Ensure availability (excluding this invoice's reservation)
        for (const [productId, requiredQty] of requiredByProductId.entries()) {
          const product = sales.find((s) => s.productId === productId)?.product
          if (!product) throw new Error('Produit introuvable')
          const pendingQty = pendingByProductId.get(productId) ?? 0
          const invoiceReserved = invoicePendingByProductId.get(productId) ?? 0
          const reservedOther = Math.max(0, pendingQty - invoiceReserved)
          const available = product.quantity - reservedOther
          if (requiredQty > available) {
            throw new Error(
              `Stock insuffisant pour ${product.name}. Stock: ${product.quantity}, réservé (autres demandes): ${reservedOther}, demandé: ${requiredQty}.`
            )
          }
        }

        // Apply stock debit per product
        const productUpdates: Array<{ id: string; before: number; after: number; name: string; ref: string | null }> = []
        for (const [productId, requiredQty] of requiredByProductId.entries()) {
          const product = sales.find((s) => s.productId === productId)?.product
          if (!product) throw new Error('Produit introuvable')
          const before = product.quantity
          const after = before - requiredQty
          if (after < 0) throw new Error(`Stock insuffisant pour ${product.name}`)

          const updated = await tx.product.update({
            where: { id: productId },
            data: { quantity: after, status: after > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK' },
          })

          // Update all pending history rows for this invoice/product
          await tx.stockEditHistorique.updateMany({
            where: {
              finalInvoiceId: invoice.id,
              productId,
              status: 'AWAITING_CONFIRMATION',
            },
            data: {
              status: 'ISVALIDED',
              currentfieldValue: {
                quantityBefore: before,
                quantityAfter: after,
                confirmedAt: new Date().toISOString(),
                confirmedByWorkerId: confirmer.workerId,
                confirmedByWorkerName: confirmer.worker?.name,
                saleCode: parsed.data.code,
              },
            },
          })

          productUpdates.push({
            id: updated.id,
            before,
            after,
            name: updated.name,
            ref: updated.ref ?? null,
          })
        }

        await tx.validationCode.update({
          where: { id: codeRow!.id },
          data: { usedAt: new Date(), usedByWorkerId: confirmer?.worker?.id },
        })

        if (superAdmins.length > 0) {
          const receiptIds = superAdmins.map((admin) => admin.id)
          await createNotification({
            title: 'Vente confirmée (stock débité)',
            body: `Vente confirmée par ${confirmer?.worker?.name} • Code: ${parsed.data.code} • Facture: ${invoice.number}`,
            type: 'SALE',
            link: `/interne/invoices/final/${invoice.id}`,
            receiverIds: receiptIds,
          })
        }

        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          invoiceRoute: `/interne/invoices/final/${invoice.id}`,
          productUpdates,
        }
      })

    // notifyStockChange removed as it is missing from lib

    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/sales', 'page')
    revalidatePath(result.invoiceRoute, 'page')

    return { ok: true as const, message: 'Vente confirmée. Le stock a été débité.' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Une erreur s'est produite"
    console.log(error)
    return { ok: false as const, message }
  }
}

