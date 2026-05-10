'use server'
import { isAdmin, isAdminId } from '@/lib/isAdmin'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteImages } from '@/lib/uploadImages'
import { buildProductCodeFromOccurrence } from '@/lib/product-code'
import { createProduct } from '@/lib/zodschema'
import { BlobError } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import z from 'zod'
import { createNotification } from '@/lib/actions/notifications'

export const addProduct = async (value: z.infer<typeof createProduct>) => {
  try {
    const id = await isAdminId()
    if (!id) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour ajouter un produit",
      }
    }

    const workerAccount = await prisma.user.findUnique({
      where: {
        id: id
      },
      include: {
        worker: {
          select: {
            id: true
          }
        }
      }
    })

    if(workerAccount){
      if(!workerAccount.worker){
         return {
        ok: false,
        message: "Compte employé introuvable",
      }
      }
    }
    else{
      return {
        ok: false,
        message: "Compte introuvable",
      }
    }

    
    const blobUrls: string[] = []
    if (value.images && value.images.length > 0) {
      for (const image of value.images) {
        if (typeof image === 'string') {
          blobUrls.push(image)
        } else if (image instanceof File) {
          const res = await uploadImage({ filename: `${Date.now()}-${image.name}`, image })
          if (!res.url) {
            return {
              ok: false,
              message: res.message || "Erreur lors de l'upload de l'image",
            }
          }
          blobUrls.push(res.url)
        }
      }
    }
    
    const existingCategoryCount = await prisma.product.count({
      where: {
        category: value.category,
      },
    })
    const generatedCode = buildProductCodeFromOccurrence(value.category, existingCategoryCount + 1)

    // Pour les superadmins, la quantité est directement appliquée.
    // Pour les autres roles, le produit est créé avec quantity=0 et la quantité
    // ne sera appliquée qu'à la validation par le superadmin (via validateStockEdit ADD),
    // évitant ainsi le doublement de quantité.
    const initialQuantity = workerAccount.role === 'superadmin' ? value.quantity : 0

    const product = await prisma.product.create({
      data: {
        name: value.name,
        category: value.category,
        code: generatedCode || value.code,
        designation: value.name,
        threshold: value.threshold ?? 20,
        sellingPrice: value.sellingPrice,
        purchasePrice: value.purchasePrice,
        quantity: initialQuantity,
        thumbnails: blobUrls[0] ,
        images: blobUrls,
        sector: value.category,
        unity: value.unity,
        brand: value.brand,
        user: {
          connect: {
            id: id
          }
        },
        worker: {
          connect: {
            id: workerAccount.worker.id
          }
        }
      },
    })
    if (!product) {
      return {
        ok: false,
        message: "Un erreur s'est produit lors de la création du produit, veuillez réssayer",
      }
    }

    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
      select: {
        id: true,
      },
    })
    const superAdminIds = superAdmins.map((admin) => admin.id)

    if(workerAccount.role === 'superadmin'){
      await prisma.stockEditHistorique.create({
        data: {
          user: { connect: { id } },
          worker: { connect: { id: workerAccount.worker.id } },
          product: { connect: { id: product.id } },
          type: 'ADD',
          status: 'ISVALIDED',
          quantityToApply: value.quantity,
          actualQuantity: value.quantity,

        },
      })

      // notifyStockChange removed as it is missing from lib

      await createNotification({
        title: "Nouveau produit ajouté",
        body: `Le produit ${product.name} a été ajouté au stock`,
        type: "STOCK",
        link: "/interne/stock",
        receiverIds: superAdminIds,
      })

      revalidatePath('/interne')
      revalidatePath("/interne/products")
      revalidatePath("/interne/sales")
      revalidatePath("/interne/stock")
    
    
      return { ok: true, message: "L'ajout a été éffectué" }
    }
    await prisma.stockEditHistorique.create({
      data: {
        user: { connect: { id } },
        worker: { connect: { id: workerAccount.worker.id } },
        product: { connect: { id: product.id } },
        type: 'ADD',
        quantityToApply: value.quantity,
        actualQuantity: 0, // produit créé avec qty=0, la vraie qty est appliquée à la validation
        reservedQuantity: 0,
      },
    })
   
   // notifyStockChange removed as it is missing from lib

    await createNotification({
      title: "Nouveau produit ajouté",
      body: `Le produit ${product.name} a été ajouté au stock`,
      type: "STOCK",
      link: "/interne/stock",
      receiverIds: superAdminIds,
    })

    revalidatePath('/interne')
    revalidatePath("/interne/products")
    revalidatePath("/interne/sales")
    revalidatePath("/interne/stock")
  

    return { ok: true, message: "L'ajout a été éffectué" }
  } catch (error) {
    if (error instanceof BlobError) {
      return {
        message: error.message,
        ok: false,
      }
    }

    return {
      message: "Une erreur s'est produite",
      ok: false,
    }
  }
}

export const getNextProductCode = async (category: string) => {
  try {
    if (!category || !category.trim()) {
      return { ok: false, code: '', message: 'Catégorie invalide' }
    }

    const count = await prisma.product.count({
      where: {
        category,
      },
    })
    const code = buildProductCodeFromOccurrence(category, count + 1)

    if (!code) {
      return { ok: false, code: '', message: 'Catégorie non reconnue' }
    }

    return { ok: true, code, message: '' }
  } catch (error) {
    console.log('error while generating product code', error)
    return { ok: false, code: '', message: "Une erreur s'est produite" }
  }
}

export const deletePrdoduct = async (id: string) => {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour ajouter un produit",
      }
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { images: true, thumbnails: true }
    })

    if (product) {
      const urlsToDelete = [...(product.images || [])]
      if (product.thumbnails && !urlsToDelete.includes(product.thumbnails)) {
        urlsToDelete.push(product.thumbnails)
      }
      await deleteImages(urlsToDelete)
    }

    await prisma.product.delete({
      where: {
        id: id,
      },
    })

    revalidatePath('/interne/employees')
    return {
      message: 'Le produit a été supprimé avec success',
      ok: true,
    }
  } catch (error) {
    console.log(error)
    return {
      message: "Une erreur s'est produite",
      ok: false,
    }
  }
}

export const updateProduct = async ({
  id,
  value,
  removeExistingImages = false,
}: {
  id: string
  value: z.infer<typeof createProduct>
  removeExistingImages?: boolean
}) => {
  try {
    const adminId = await isAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour éffecuté cette opération",
      }
    }

    const actor = await prisma.user.findUnique({
      where: {
        id: adminId,
      },
      include: {
        worker: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!actor?.worker) {
      return {
        message: "Compte employé introuvable",
        ok: false,
      }
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        ref: true,
        category: true,
        purchasePrice: true,
        sellingPrice: true,
        quantity: true,
        unity: true,
        brand: true,
        threshold: true,
        images: true,
        thumbnails: true,
      },
    })

    if (!existingProduct) {
      return {
        message: "Ce produit n'existe plus",
        ok: false,
      }
    }
    

    const hasNewImages = Boolean(value.images && value.images.length > 0)
    const shouldRemoveExistingImages = removeExistingImages || hasNewImages

    const blobUrls: string[] = []
    if (hasNewImages && value.images) {
      for (const image of value.images) {
        if (typeof image === 'string') {
          blobUrls.push(image)
        } else if (image instanceof File) {
          const res = await uploadImage({ filename: `${Date.now()}-${image.name}`, image })
          if (!res.url) {
            return {
              ok: false,
              message: res.message || "Erreur lors de l'upload de l'image",
            }
          }
          blobUrls.push(res.url)
        }
      }
    }

    if (shouldRemoveExistingImages) {
      const urlsToDelete = [...(existingProduct.images || [])]
      if (existingProduct.thumbnails && !urlsToDelete.includes(existingProduct.thumbnails)) {
        urlsToDelete.push(existingProduct.thumbnails)
      }
      if (urlsToDelete.length > 0) {
        await deleteImages(urlsToDelete)
      }
    }

    const quantityChanged = existingProduct.quantity !== value.quantity

    const product = await prisma.product.update({
      where: {
        id: id
      },
      data: {
        name: value.name,
        code: value.code,
        category: value.category,
        threshold: value.threshold ?? 20,
        sellingPrice: value.sellingPrice,
        purchasePrice: value.purchasePrice,
        ...(quantityChanged ? {} : { quantity: value.quantity }),
        ...(hasNewImages
          ? {
              thumbnails: blobUrls[0],
              images: blobUrls,
            }
          : removeExistingImages
            ? {
                thumbnails: null,
                images: [],
              }
            : {}),
        unity: value.unity,
        brand: value.brand,
      },
    })

    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
      select: {
        id: true,
      },
    })
    const superAdminIds = superAdmins.map((admin) => admin.id)
    const readByIds = superAdminIds.includes(adminId) ? [adminId] : []

    if (quantityChanged) {
      await prisma.stockEditHistorique.create({
        data: {
          user: { connect: { id: adminId } },
          worker: { connect: { id: actor.worker.id } },
          product: { connect: { id: product.id } },
          actualQuantity: existingProduct.quantity,
          reservedQuantity: 0,
          quantityToApply: value.quantity,
          type: 'SET_QUANTITY',
          preventfieldValue: {
            quantityBeforeEdit: existingProduct.quantity,
            quantityAfterEdit: value.quantity,
          },
        },
      })

      // notifyStockChange removed as it is missing from lib

      if (superAdminIds.length > 0) {
        await createNotification({
          title: 'Demande de validation de quantité',
          body: `Une demande de modification de quantité a été envoyée pour ${product.name}.`,
          type: 'STOCK',
          link: '/interne/stock',
          receiverIds: superAdminIds,
        })
      }
    }

    const hasOtherChanges =
      existingProduct.name !== value.name ||
      existingProduct.code !== value.code ||
      existingProduct.category !== value.category ||
      existingProduct.purchasePrice !== value.purchasePrice ||
      existingProduct.sellingPrice !== value.sellingPrice ||
      existingProduct.unity !== value.unity ||
      (existingProduct.brand ?? '') !== (value.brand ?? '') ||
      existingProduct.threshold !== (value.threshold ?? 20) ||
      blobUrls.length > 0 ||
      removeExistingImages

    if (hasOtherChanges) {
      await createNotification({
        title: 'Produit modifié',
        body: `Les informations du produit ${product.name} ont été mises à jour.`,
        type: 'STOCK',
        link: '/interne/stock',
        receiverIds: superAdminIds,
      })
    }

    revalidatePath('/interne/products')
    revalidatePath('/interne/stock')
    return {
      message: quantityChanged
        ? 'Les informations ont été mises à jour. La modification de quantité est en attente de validation du superadmin.'
        : 'Les modification ont été enregistré avec success',
      ok: true,
    }
  } catch (error) {
    console.log(error)
    return {
      message: "Une erreur s'est produite",
      ok: false,
    }
  }
}
