'use server'

import { prisma } from '@/lib/prisma'
import z from 'zod'

const verifySaleCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres'),
})

export const verifySaleValidationCode = async (value: z.infer<typeof verifySaleCodeSchema>) => {
  try {
    const parsed = verifySaleCodeSchema.safeParse(value)
    if (!parsed.success) {
      return { ok: false as const, message: parsed.error.issues[0]?.message ?? 'Données invalides' }
    }

    const row = await prisma.validationCode.findFirst({
      where: { type: 'SALE', code: parsed.data.code },
      orderBy: { createdAt: 'desc' },
      include: {
        finalInvoice: { 
          include: {
            sales: {
              include: {
                product: { select: { name: true, ref: true } }
              }
            }
          }
        },
      },
    })

    if (!row) return { ok: false as const, message: 'Code de vente invalide' }
    if (row.usedAt) return { ok: false as const, message: 'Ce code a déjà été utilisé' }

    const invoice = row.finalInvoice ?? null
    if (!invoice) return { ok: false as const, message: 'Facture liée introuvable' }

    const buyer = invoice.buyer as unknown as { name?: string } | null
    const totals = invoice.totals as unknown as { totalTTC?: number } | null

    return {
      ok: true as const,
      message: 'Code vérifié avec succès',
      data: {
        saleValidationCodeId: row.id,
        finalInvoiceId: row.finalInvoice?.id ?? null,
        invoiceNumber: invoice.number,
        saleDate: invoice.saleDate,
        buyerName: buyer?.name ?? null,
        totalTTC: totals?.totalTTC ?? null,
        products: invoice.sales.map((s: any) => ({
          name: s.product.name,
          ref: s.product.ref,
          quantity: s.quantity,
        })),
      },
    }
  } catch (error) {
    console.log(error)
    return { ok: false as const, message: "Une erreur s'est produite" }
  }
}

