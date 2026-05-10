'use server'

import { Prisma } from '@/generated/prisma/client'
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import z from 'zod'
import { createNotification } from '@/lib/actions/notifications'

const confirmStockReturnSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
})

export const confirmStockReturnOperation = async (
  value: z.infer<typeof confirmStockReturnSchema>
) => {
  try {
    const parsed = confirmStockReturnSchema.safeParse(value)
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const userId = await isAuthedId()
    if (!userId) return { ok: false, message: "Erreur d'authentification" }

    const confirmer = await prisma.user.findUnique({
      where: { id: userId },
      include: { worker: { select: { id: true, name: true } } },
    })
    if (!confirmer?.worker) return { ok: false, message: "Vous n'êtes pas enregistré en tant qu'employé" }
    const confirmerWorker = confirmer.worker

    const superAdmins = await prisma.user.findMany({
      where: { role: 'superadmin' },
      select: { id: true },
    })

    const result = await prisma.$transaction(
      async (tx) => {
        const codeRow = await tx.validationCode.findFirst({
          where: { type: 'STOCK_RETURN', code: parsed.data.code },
          orderBy: { createdAt: 'desc' },
          include: {
            stockReturn: {
              include: {
                worker: { select: { id: true, name: true } },
                product: { select: { id: true, name: true, ref: true, quantity: true } },
              },
            },
          },
        })

        if (!codeRow?.stockReturn) {
          throw new Error('Code invalide')
        }
        if (codeRow.usedAt) {
          throw new Error('Ce code a déjà été utilisé')
        }
        if (codeRow.stockReturn.type !== 'STOCK_RETURN') {
          throw new Error('Ce code ne correspond pas à une restitution de stock')
        }
        if (codeRow.stockReturn.status !== 'AWAITING_CONFIRMATION') {
          throw new Error("Cette demande n'est pas en attente de confirmation")
        }

        // Identification des articles liés
        const mainItem = codeRow.stockReturn
        const requestId = mainItem.requestId

        const itemsToConfirm = requestId
          ? await tx.stockEditHistorique.findMany({
              where: {
                status: 'AWAITING_CONFIRMATION',
                requestId: requestId,
              },
              include: {
                product: { select: { id: true, name: true, ref: true, quantity: true } },
              },
            })
          : [mainItem]

        const results = []

        for (const item of itemsToConfirm) {
          const before = item.product.quantity
          const delta = item.quantityToApply
          const after = before + delta

          const updatedProduct = await tx.product.update({
            where: { id: item.product.id },
            data: { quantity: after, status: after > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK' },
          })

          await tx.stockEditHistorique.update({
            where: { id: item.id },
            data: {
              status: 'ISVALIDED',
              currentfieldValue: {
                quantityBefore: before,
                quantityAfter: after,
                confirmedAt: new Date().toISOString(),
                confirmedByWorkerId: confirmerWorker.id,
                confirmedByWorkerName: confirmerWorker.name,
                ...(typeof item.currentfieldValue === 'object' && item.currentfieldValue ? item.currentfieldValue : {}),
              },
            },
          })

          const unitCost =
            typeof item.preventfieldValue === 'object' &&
            item.preventfieldValue &&
            'productUnitCost' in item.preventfieldValue
              ? Number((item.preventfieldValue as Record<string, unknown>).productUnitCost ?? 0)
              : 0
          const totalCost = unitCost * delta
          const reason = item.reason ?? 'Restitution magasin'
          const destination = item.destination ?? 'Magasin'
          const reference = requestId ?? parsed.data.code

          await tx.accountingJournalEntry.createMany({
            data: [
              {
                workerId: confirmerWorker.id,
                journalType: 'CHANTIER',
                direction: 'INCOME',
                amount: totalCost,
                title: `Retour magasin - ${item.product.name}`,
                description: `${reason} | Destination: ${destination} | Quantite: ${delta}`,
                reference,
                sourceType: 'STOCK_RETURN_CHANTIER',
                sourceId: item.id,
                isAutomated: true,
                entryDate: new Date(),
              },
              {
                workerId: confirmerWorker.id,
                journalType: 'DEPENSE',
                direction: 'INCOME',
                amount: totalCost,
                title: `Reintegration stock - ${item.product.name}`,
                description: `${reason} | Destination: ${destination} | Quantite: ${delta}`,
                reference,
                sourceType: 'STOCK_RETURN_DEPENSE',
                sourceId: item.id,
                isAutomated: true,
                entryDate: new Date(),
              },
            ],
            skipDuplicates: true,
          })

          results.push({ updatedProduct, before, after, delta })
        }

        await tx.validationCode.update({
          where: { id: codeRow.id },
          data: {
            usedAt: new Date(),
            usedByWorkerId: confirmerWorker.id,
          },
        })

        if (superAdmins.length > 0) {
          const superAdminIds = superAdmins.map((admin) => admin.id)
          await createNotification({
            title: `Restitution de stock confirmée (${itemsToConfirm.length} article(s))`,
            body: `Restitution confirmée par ${confirmerWorker.name}. Code: ${parsed.data.code}`,
            type: 'STOCK',
            link: '/interne/stock',
            receiverIds: superAdminIds,
          })
        }

        return results
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    // notifyStockChange removed as it is missing from lib

    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/sales', 'page')

    return { ok: true, message: 'Restitution confirmée. Le stock a été mis à jour.' }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Une erreur s'est produite"
    console.log(error)
    return { ok: false, message }
  }
}
