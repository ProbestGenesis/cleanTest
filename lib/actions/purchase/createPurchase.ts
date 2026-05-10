'use server'

import { isAdminId } from '@/lib/isAdmin'
import { prisma } from '@/lib/prisma'
import { buildProductCodeFromOccurrence } from '@/lib/product-code'
import { uploadImage } from '@/lib/uploadImages'
import { PurchaseSchema } from '@/lib/zodschema'
import { revalidatePath } from 'next/cache'
import z from 'zod'

export const addPurchase = async (value: z.infer<typeof PurchaseSchema>) => {
  try {
    const id = await isAdminId()
    if (!id) {
      return { ok: false, message: "Vous n'avez pas les autorisations nécessaires." }
    }

    const workerAccount = await prisma.user.findUnique({
      where: { id },
      include: { worker: { select: { id: true } } },
    })

    if (!workerAccount?.worker) {
      return { ok: false, message: 'Compte employé introuvable.' }
    }

    const workerId = workerAccount.worker.id

    let blobUrls: string[] = []

    if (value.images && value.images.length > 0) {
      const uploadResults = await Promise.all(
        value.images.map((image) => {
          if (typeof image === 'string') return { url: image }
          return uploadImage({ filename: `purchase-${Date.now()}-${image.name}`, image })
        })
      )

      for (const res of uploadResults) {
        if (!res.url) {
          return {
            ok: false,
            message:  "Erreur lors de l'upload de l'image",
          }
        }
        blobUrls.push(res.url)
      }
    }

    let invoiceUrl: string | undefined
    if (value.invoiceFile) {
      const res = await uploadImage({
        filename: `invoice-${Date.now()}-${value.invoiceFile.name}`,
        image: value.invoiceFile,
      })
      if (!res.url) {
        return {
          ok: false,
          message: res.message || "Erreur lors de l'upload de la facture",
        }
      }
      invoiceUrl = res.url
    }

    // Gestion du fournisseur
    let finalProviderId = value.providerId
    let finalProviderName = value.provider || ''

    if (!finalProviderId && finalProviderName) {
      const existingProvider = await prisma.provider.findFirst({
        where: { name: { equals: finalProviderName, mode: 'insensitive' } },
      })

      if (existingProvider) {
        finalProviderId = existingProvider.id
      } else {
        const newProvider = await prisma.provider.create({
          data: {
            name: finalProviderName,
            country: value.country,
            category: value.category,
            contact: value.contact,
          },
        })
        finalProviderId = newProvider.id
      }
    }

    const calculatedTotalAmount = value.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
    const totalAmount = value.totalAmount || calculatedTotalAmount

    const purchase = await prisma.$transaction(async (tx) => {
      // 1. Création de l'achat (Header)
      const purchase = await tx.purchase.create({
        data: {
          status: 'PAYMENT_DONE',
          providerId: finalProviderId!,
          authorId: workerId,
          userId: id,
          totalAmount: totalAmount,
          amountPaid: value.amountPaid || 0,
          isPaid: (value.amountPaid || 0) >= totalAmount,
          dueDate: value.dueDate ? new Date(value.dueDate) : null,
          purchaseDate: new Date(value.date),
          type: value.type,
          category: value.category,
          brand: value.brand,
          country: value.country,
          description: value.description,
          quantity: value.quantity,
          receivedQuantity: value.receivedQuantity,
          interests: value.interests,
          unity: value.unity,
          unityPrice: value.unityPrice,
          estimatePrice: value.estimatePrice,
          paymentMethod: value.paymentMethod,
          contact: value.contact,
          NIF: value.NIF,
          invoiceNumber: value.invoiceNumber,
          amountET: value.amountET,
          designation: value.designation,
          TVA: value.TVA,
          emountTTC: value.emountTTC,
          images: blobUrls,
          invoiceImage: invoiceUrl,
          projectId: value.projectId,
        },
      })

      // 2. Création des articles de l'achat et mise à jour/création des produits
      for (const item of value.items) {
        let productId = item.productId

        if (!productId) {
          // Créer un nouveau produit si non existant
          const product = await tx.product.create({
            data: {
              name: item.productName,
              designation: item.productName,
              code: buildProductCodeFromOccurrence(
                value.category || 'GENERAL',
                (await tx.product.count({
                  where: { category: value.category || 'GENERAL' },
                })) + 1
              ),
              category: value.category || 'GENERAL',
              sector: 'INDUSTRIAL',
              brand: value.brand,
              country: value.country,
              unity: value.unity,
              purchasePrice: item.unitPrice,
              sellingPrice: value.estimatePrice || 0,
              quantity: 0,
              workerId: workerId,
              userId: id,
            },
          })
          productId = product.id
        } else {
            // Mettre à jour le prix d'achat si le produit existe
            await tx.product.update({
                where: { id: productId },
                data: {
                    purchasePrice: item.unitPrice,
                }
            })
        }

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          },
        })

        // 3. Création de l'historique de stock (PENDING_VALIDATION)
        await tx.stockEditHistorique.create({
          data: {
            userId: id,
            workerId: workerId,
            productId: productId!,
            type: 'PURCHASE',
            quantityToApply: item.quantity,
            actualQuantity: 0,
            status: 'PENDING_VALIDATION',
            purchaseId: purchase.id,
            purchaseItems: {
                connect: { id: purchaseItem.id }
            },
            reason: `Achat - ${purchase.invoiceNumber || purchase.id}`,
          },
        })
      }

      // 4. Génération du code de validation
      const validationCode = Math.floor(100000 + Math.random() * 900000).toString()
      await tx.validationCode.create({
        data: {
          code: validationCode,
          type: 'PURCHASE',
          purchaseId: purchase.id,
        },
      })

      return purchase
    })

    revalidatePath('/interne/purchases')
    revalidatePath('/purchases')
    revalidatePath('/interne/stock')

    await notifySuperAdmins({
      emitterId: id,
      title: 'Nouvel achat enregistré',
      body: `Un achat de ${value.items.length} articles a été enregistré par ${workerAccount.name}.`,
      link: '/purchases',
    })

    return {
      ok: true,
      message: "L'achat a été enregistré. Le code de validation est nécessaire pour mettre à jour le stock.",
    }
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'achat:", error)
    return { ok: false, message: "Une erreur s'est produite lors de la création." }
  }
}

const notifySuperAdmins = async ({
  emitterId,
  title,
  body,
  link,
}: {
  emitterId: string
  title: string
  body: string
  link?: string
}) => {
  const superAdmins = await prisma.user.findMany({
    where: { role: 'superadmin' },
    select: { id: true },
  })
  const receiptIds = superAdmins.map((u) => u.id)
  if (receiptIds.length === 0) return

  await prisma.notification.create({
    data: {
      title,
      body,
      type: 'PURCHASE',
      link: link ?? '/purchases',
      emitter: { connect: { id: emitterId } },
      receiptIds,
      readByIds: receiptIds.includes(emitterId) ? [emitterId] : [],
    },
  })
}
