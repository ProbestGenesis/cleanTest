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
    // Conversion de la quantité de String (Purchase) vers Int (Product & Historique)
    const numericQuantity = value.quantity

    if (numericQuantity <= 0) {
      return { ok: false, message: 'La quantité doit être supérieure à 0.' }
    }

    let blobUrls: string[] = []

    if (value.images && value.images.length > 0) {
      const uploadResults = await Promise.all(
        value.images.map((image) => {
          if (typeof image === 'string') return { url: image }
          return uploadImage({ filename: `${Date.now()}-${image.name}`, image })
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


    // Gestion du fournisseur : si on a un providerId, on l'utilise. 
    // Sinon, si on a un provider (nom), on essaie de trouver ou créer un Provider record
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

    // Utilisation d'une transaction pour garantir l'intégrité des créations / mises à jour
    let createdProductId: string | undefined

    await prisma.$transaction(async (tx) => {
      // 1. Création de l'achat
      const existingPurchase = await tx.purchase.findFirst({
        where: {
          invoiceNumber: value.invoiceNumber || null,
          provider: finalProviderName,
          date: value.date,
        },
        select: { id: true },
      })

      if (existingPurchase) {
        throw new Error("Un achat avec les mêmes informations existe déjà")
      }

      const productRecord =
        value.productId != null && value.productId !== ''
          ? await tx.product.update({
              where: { id: value.productId },
              data: {
                purchasePrice: value.unityPrice,
                sellingPrice: value.estimatePrice,
                category: value.category,
                brand: value.brand,
                unity: value.unity,
                country: value.country,
              },
            })
          : await tx.product.create({
              data: {
                name: value.designation || value.category,
                designation: value.designation,
                code: buildProductCodeFromOccurrence(
                  value.category,
                  (await tx.product.count({
                    where: {
                      category: value.category,
                    },
                  })) + 1
                ),
                category: value.category,
                sector: value.type,
                brand: value.brand,
                country: value.country,
                unity: value.unity,
                purchasePrice: value.unityPrice,
                sellingPrice: value.estimatePrice,
                quantity: 0,
                workerId: workerId,
                userId: id,
                images: blobUrls,
              },
            })

      createdProductId = productRecord.id

      await tx.purchase.create({
        data: {
          status: 'PAYMENT_DONE',
          provider: finalProviderName,
          providerId: finalProviderId || null,
          date: value.date,
          dueDate: value.dueDate || null,
          type: value.type ?? "Achat",
          category: value.category,
          brand: value.brand,
          country: value.country,
          description: value.description,
          quantity: value.quantity,
          receivedQuantity: value.receivedQuantity ?? 0,
          interests: value.interests ?? 0,
          unity: value.unity,
          unityPrice: value.unityPrice,
          estimatePrice: value.estimatePrice,
          paymentMethod: value.paymentMethod || null,
          contact: value.contact || '',
          NIF: value.NIF || null,
          invoiceNumber: value.invoiceNumber || null,
          amountET: value.amountET ?? null,
          designation: value.designation || null,
          TVA: value.TVA ?? null,
          emountTTC: value.emountTTC ?? null,
          authorId: workerId,
          userId: id,
          images: blobUrls,
          invoiceImage: invoiceUrl || null,
          productId: createdProductId,
          projectId: value.projectId || null,
        },
      })
    })

    // Revalidation des pages Next.js
    revalidatePath('/interne')
    revalidatePath('/interne/purchases')
    revalidatePath('/interne/accounting')
    revalidatePath('/interne/stock')

    // Notification aux superadmins
    await notifySuperAdmins({
      emitterId: id,
      title: 'Nouvel achat enregistré',
      body: `Un achat de ${numericQuantity} ${value.unity} pour "${value.designation || value.category}" a été enregistré par ${workerAccount.name}.`,
      link: '/interne/purchases',
    })

    return {
      ok: true,
      message: "L'achat a été enregistré. La confirmation inventaire mettra ensuite le stock à jour.",
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
      type: 'PURCHASE', // Ou un type spécifique aux achats si existant, TYPE ACCOUNTING semble approprié ici
      link: link ?? '/interne/purchases',
      emitter: { connect: { id: emitterId } },
      receiptIds,
      readByIds: receiptIds.includes(emitterId) ? [emitterId] : [],
    },
  })
}
