'use server'

import { getSellerConfig } from '@/lib/invoice/sellerConfig'
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { generateSaleValidationCode } from '@/lib/stock/validation-code'
import { createNotification } from '@/lib/actions/notifications'
import { createClient, sellProducts as formSchema } from '@/lib/zodschema'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import z from 'zod'

enum ClientType {
  PARTICULAR = 'PARTICULAR',
  ENTREPRISE = 'ENTREPRISE',
}

export const sellProduct = async ({
  value,
  client,
  clientId,
}: {
  value: z.infer<typeof formSchema>
  client?: z.infer<typeof createClient>
  clientId?: string
}) => {
  try {
    const parsedSale = formSchema.safeParse(value)
    if (!parsedSale.success) {
      return {
        ok: false,
        message: parsedSale.error.issues[0]?.message ?? 'Données invalides',
      }
    }
    const saleValue = parsedSale.data

    const id = await isAuthedId()
    if (!id) return { ok: false, message: "Erreur d'authentification" }

    const sellerConfig = getSellerConfig()

    const workerAccount = await prisma.user.findUnique({
      where: { id },
      include: { worker: { select: { id: true, name: true, image: true } } },
    })
    if (!workerAccount?.worker) {
      return { ok: false, message: "Vous n'êtes pas enregistré en tant qu'employé" }
    }
    const worker = workerAccount.worker

    const productIds = Array.from(new Set(saleValue.items.map((item) => item.productId)))

    let clientData: {
      id: string
      name: string
      totalPurchase: number
      email: string | null
      phone: string | null
      address: string | null
      type: string | null
    } | null = null

    if (client) {
      const newClient = await prisma.client.create({
        data: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address ?? '',
          type: client.type as ClientType,
          image: '',
          totalPurchase: 0,
          addedBy: { connect: { id: worker.id } },
        },
      })
      clientData = {
        id: newClient.id,
        name: newClient.name,
        totalPurchase: newClient.totalPurchase,
        email: newClient.email ?? null,
        phone: newClient.phone ?? null,
        address: newClient.address ?? null,
        type: newClient.type ?? null,
      }
    }

    // Cas 2 : client existant
    if (clientId) {
      const existingClient = await prisma.client.findFirstOrThrow({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          totalPurchase: true,
          email: true,
          phone: true,
          address: true,
          type: true,
        },
      })
      clientData = existingClient
    }

    const salesCount = saleValue.items.length
    const grandTotal = saleValue.items.reduce(
      (total, item) => total + Number((item.quantity * item.purchasePrice).toFixed(2)),
      0
    )

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        quantity: true,
        code: true,
        unity: true,
        ref: true,
        designation: true,
      },
    })
    if (products.length !== productIds.length) {
      throw new Error("Un ou plusieurs produits n'existent plus")
    }

    const productsMap = new Map(products.map((product) => [product.id, product]))
    const pendingReservations = await prisma.stockEditHistorique.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        status: { in: ['PENDING_VALIDATION', 'AWAITING_CONFIRMATION'] },
        type: {
          in: ['SELL', 'STOCK_OUT'],
        },
      },
      _sum: { quantityToApply: true },
    })
    const pendingByProduct = new Map(
      pendingReservations.map((entry) => [entry.productId, entry._sum.quantityToApply ?? 0])
    )
    const requestedByProduct = new Map<string, number>()
    for (const item of saleValue.items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity
      )
    }

    for (const [productId, requestedQuantity] of requestedByProduct) {
      const product = productsMap.get(productId)
      if (!product) throw new Error(`Produit introuvable: ${productId}`)

      const alreadyReserved = pendingByProduct.get(productId) ?? 0
      const availableQuantity = product.quantity - alreadyReserved
      if (requestedQuantity > availableQuantity) {
        throw new Error(
          `Quantité insuffisante pour ${product.name}. Stock: ${product.quantity}, réservé (demandes en attente): ${alreadyReserved}, demandé: ${requestedQuantity}, disponible: ${availableQuantity}.`
        )
      }
    }

    const runningReservedByProduct = new Map(pendingByProduct)
    let firstProductId = ''

    const now = new Date()
    const invoiceNumber = `FAC-${format(now, 'yyyyMMdd')}-${nanoid(6).toUpperCase()}`
    const vatRate = sellerConfig.defaults.vatRate
    const currencyCode = sellerConfig.defaults.currencyCode
    const currencyLabel = sellerConfig.defaults.currencyLabel

    const buyer = {
      name: clientData?.name ?? saleValue.name,
      address: clientData?.address ?? client?.address ?? null,
      phone: clientData?.phone ?? client?.phone ?? null,
      email: clientData?.email ?? client?.email ?? null,
      type: clientData?.type ?? client?.type ?? null,
    }

    const items = saleValue.items.map((item, idx) => {
      const product = productsMap.get(item.productId)
      if (!product) throw new Error(`Produit introuvable: ${item.productId}`)
      const lineTotal = Number((item.quantity * item.purchasePrice).toFixed(2))
      return {
        index: idx + 1,
        description: product.designation || product.name,
        reference: product.ref || product.code || null,
        quantity: item.quantity,
        unit: product.unity || null,
        unitPrice: item.purchasePrice,
        lineTotal,
      }
    })

    const totalHT = Number(grandTotal.toFixed(2))
    const vatAmount = Number(((totalHT * vatRate) / 100).toFixed(2))
    const totalTTC = Number((totalHT + vatAmount).toFixed(2))

    const finalInvoice = await prisma.finalInvoice.create({
      data: {
        number: invoiceNumber,
        saleDate: now,
        paymentTerms: sellerConfig.defaults.paymentTerms,
        vatRate,
        currency: currencyCode,
        ...(clientData ? { client: { connect: { id: clientData.id } } } : {}),
        seller: sellerConfig,
        buyer,
        items,
        totals: { totalHT, vatRate, vatAmount, totalTTC, currencyLabel },
      },
      select: { id: true },
    })
    if (!finalInvoice?.id) {
      throw new Error('Échec de création de la facture')
    }

    const saleCode = await (async () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const code = generateSaleValidationCode()
        const exists = await prisma.validationCode.findFirst({
          where: { type: 'SALE', code },
        })
        if (!exists) return code
      }
      throw new Error('Impossible de générer un code de vente unique')
    })()

    await prisma.validationCode.create({
      data: {
        code: saleCode,
        type: 'SALE',
        finalInvoice: { connect: { id: finalInvoice.id } },
      },
    })

    // Envoyer automatiquement le code dans la messagerie du vendeur (l'utilisateur connecté)
    const sellerMessageThreadName =  `Validation de vente-${worker.name}`
    const existingSellerThread = await prisma.discussion.findFirst({
      where: { createdBy: id, name: sellerMessageThreadName },
      select: { id: true },
    })

    const sellerThreadId =
      existingSellerThread?.id ??
      (
        await prisma.discussion.create({
          data: {
            name: sellerMessageThreadName,
            lastMessage: 'Nouveau code de vente',
            lastMessageDate: new Date(),
            sender: id,
            createdBy: id,
            receipt: [{ id: worker.id, name: worker.name, image: worker.image ?? null }] as any,
            receiptIds: [worker.id],
            deletedBy: [],
          },
          select: { id: true },
        })
      ).id

    const saleCodeMessage = `Code de vente: ${saleCode}\nFacture: ${invoiceNumber}\nLien: /interne/invoices/final/${finalInvoice.id}`

    await prisma.message.create({
      data: {
        discussionId: sellerThreadId,
        senderId: id,
        content: saleCodeMessage,
        receipt: [worker.id],
      },
      select: { id: true },
    })

    await prisma.discussion.update({
      where: { id: sellerThreadId },
      data: {
        lastMessage: `Code de vente: ${saleCode}`,
        lastMessageDate: new Date(),
        sender: id,
        deletedBy: [],
      },
      select: { id: true },
    })

    for (const item of saleValue.items) {
      const product = productsMap.get(item.productId)
      if (!product) {
        throw new Error(`Produit introuvable: ${item.productId}`)
      }

      const alreadyReserved = runningReservedByProduct.get(product.id) ?? 0
      const availableQuantity = product.quantity - alreadyReserved
      if (item.quantity > availableQuantity) {
        throw new Error(
          `Quantité insuffisante pour ${product.name}. Stock: ${product.quantity}, réservé (demandes en attente): ${alreadyReserved}, demandé: ${item.quantity}, disponible: ${availableQuantity}.`
        )
      }

      const lineTotal = Number((item.quantity * item.purchasePrice).toFixed(2))
      const sale = await prisma.sale.create({
        data: {
          quantity: item.quantity,
          unitPrice: item.purchasePrice,
          clientName: clientData?.name ?? saleValue.name,
          ...(clientData ? { client: { connect: { id: clientData.id } } } : {}),
          product: { connect: { id: product.id } },
          totalPrice: lineTotal,
          status: saleValue.type === 'DIRECT' ? 'DELIVERED' : 'PENDING',
          finalInvoice: { connect: { id: finalInvoice.id } },
          worker: { connect: { id: worker.id } },
        },
        select: { id: true },
      })
      if (!sale?.id) {
        throw new Error('Échec de création de la vente')
      }

      await prisma.stockEditHistorique.create({
        data: {
          worker: { connect: { id: worker.id } },
          product: { connect: { id: product.id } },
          finalInvoice: { connect: { id: finalInvoice.id } },
          actualQuantity: product.quantity,
          reservedQuantity: availableQuantity - item.quantity,
          quantityToApply: item.quantity,
          saleStatus: saleValue.type === 'DIRECT' ? 'DELIVERED' : 'PENDING',
          type: 'SELL',
          status: 'AWAITING_CONFIRMATION',
          client: clientData?.name ?? saleValue.name,
          preventfieldValue: {
            saleId: sale.id,
            clientId: clientData?.id ?? null,
            clientName: clientData?.name ?? saleValue.name,
            totalPrice: lineTotal,
            productId: product.id,
            finalInvoiceId: finalInvoice.id,
          },
        },
      })

      runningReservedByProduct.set(product.id, alreadyReserved + item.quantity)
      if (!firstProductId) {
        firstProductId = product.id
      }
    }

    if (clientData) {
      await prisma.client.update({
        where: { id: clientData.id },
        data: {
          totalPurchase: clientData.totalPurchase + grandTotal,
          lastProduct: firstProductId || undefined,
        },
      })
    }

    const createdInvoiceId: string | null = finalInvoice.id

    await createNotification({
      title: 'Nouvelle vente',
      body: `Une nouvelle vente a été enregistrée par ${worker.name}`,
      type: 'SALE',
      link: '/interne/sales',
      receiverIds: [], // To all superadmins if needed, or empty
    })

    revalidatePath('/interne/employees', 'page')
    revalidatePath('/interne/clients', 'page')
    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/sales', 'page')
    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/purchases', 'page')
    revalidatePath('/interne/messages', 'page')

    return {
      ok: true,
      message: `${salesCount} produit(s) vendu(s) avec succès`,
      finalInvoiceId: createdInvoiceId,
    }
  } catch (error) {
    console.log(error)
    if (error instanceof Error && error.message) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: "Une erreur s'est produite" }
  }
}
