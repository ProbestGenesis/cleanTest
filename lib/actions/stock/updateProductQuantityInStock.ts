'use server'

import { isAdminId } from '@/lib/isAdmin'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/actions/notifications'

export const updateProductQuantityInStock = async (productId: string, quantity: number, reason: string) => {
  try {
    const id = await isAdminId()
    if (!id) {
      return {
        ok: false,
        message: "Vous n'avez pas les autorisations necessaire pour effectuer cette tache",
      }
    }

    if (!reason || reason.trim() === '') {
      return { ok: false, message: 'Le motif de modification est obligatoire' }
    }

    const user = await prisma.user.findUnique({
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

    if(!user){
      return {
        ok: false,
        message: "erreur d'authentification",
      }
    }

    if(!user.worker){
      return {
        ok: false,
        message: "erreur d'authentification",
      }
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    })

    if (!product) {
      return {
        ok: false,
        message: "le produit n'existe plus",
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

    // notifyStockChange removed as it is missing from lib

    const lastEdit = await prisma.stockEditHistorique.findFirst({
      where: { productId },
      orderBy: { createAt: 'desc' }
    })

    let previewUpdatedAt: Date | null = null
    let validityTime: number | null = null

    if (lastEdit) {
      previewUpdatedAt = lastEdit.createAt
      validityTime = Math.floor((Date.now() - lastEdit.createAt.getTime()) / 60000)
    }

    await prisma.stockEditHistorique.create({
      data: {
        user: { connect: { id } },
        worker: { connect: { id: user.worker.id } },
        product: { connect: { id: product.id } },
        actualQuantity: product.quantity,
        reservedQuantity: 0,
        quantityToApply: quantity,
        type: 'SET_QUANTITY',
        reason,
        previewUpdatedAt,
        validityTime,
        preventfieldValue: {
          quantityBeforeEdit: product.quantity,
          quantityAfterEdit: quantity,
        },
      },
    })

    if (superAdmins.length > 0) {
      const superAdminIds = superAdmins.map((admin) => admin.id)
      await createNotification({
        title: 'Nouvelle demande de modification du stock',
        body: `Une demande de changement de quantité a été envoyée pour ${product.name}.`,
        type: 'STOCK',
        link: '/interne/stock',
        receiverIds: superAdminIds,
      })
    }

    revalidatePath('/interne/employees', 'page')
    revalidatePath('/interne/products', 'page')
    revalidatePath('/interne/stock', 'page')
    revalidatePath('/interne/sales', 'page')
    revalidatePath('/interne/purchase', 'page')

    return { ok: true, message: 'Demande envoyée. La quantité sera mise à jour après validation du superadmin.' }
  } catch {
    return {
      ok: false,
      message: "Une erreur s'est produite",
    }
  }
}
