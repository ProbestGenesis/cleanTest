'use server'

import { isAuthedIdWithRole } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteImage } from '@/lib/uploadImages'
import { revalidatePath } from 'next/cache'

export const updateDiscussionInfo = async ({
  name,
  image,
  discussionId,
}: {
  name: string
  image: File | string | undefined
  discussionId: string
}) => {
  try {
    const { id, role } = await isAuthedIdWithRole()

    if (!id) {
      return {
        ok: false,
        message: 'Erreur d authentification',
      }
    }
    const discussionWithGroup = await prisma.discussion.findUnique({
      where: {
        id: discussionId,
      },
      include: {
        groupMessage: {
          select: {
            id: true,
            name: true,
            admin: true,
            image: true,
          },
        },
      },
    })

    if (!discussionWithGroup || !discussionWithGroup.groupMessage) {
      return {
        ok: false,
        message: "Cette discussion n'existe plus",
      }
    }

    const userWithWorker = await prisma.user.findUnique({
      where: { id },
      select: { worker: { select: { id: true } } }
    })
    
    const workerId = userWithWorker?.worker?.id

    const isAdmin =
      role === 'superadmin' || (workerId && discussionWithGroup.groupMessage.admin.includes(workerId))

    if (!isAdmin) {
      return {
        ok: false,
        message: "Vous n'avez pas les autorisations nécessaires",
      }
    }

    let imageUrl = discussionWithGroup.groupMessage.image

    if (image) {
      if (typeof image === 'string') {
        imageUrl = image
        // If there's an old image and it's different, we should probably delete the old one
        const oldImage = discussionWithGroup.groupMessage.image
        if (oldImage && oldImage !== imageUrl) {
          await deleteImage(oldImage)
        }
      } else {
        const { url } = await uploadImage({ filename: `${Date.now()}-${image.name}`, image: image })
        if (url) {
          imageUrl = url
          const oldImage = discussionWithGroup.groupMessage.image
          if (oldImage) {
            await deleteImage(oldImage)
          }
        }
      }
    }

    await prisma.discussion.update({
      where: {
        id: discussionId,
      },
      data: {
        image: imageUrl,
        name: name,
      },
    })

    await prisma.groupMessage.update({
      where: {
        id: discussionWithGroup.groupMessage.id,
      },
      data: {
        image: imageUrl,
        name: name,
      },
    })

    revalidatePath('/interne/messages')
    return {
      ok: true,
      message: 'success',
    }
  } catch (error) {
    console.error(error)
    return {
      ok: false,
      message: "Une erreur s'est produite",
    }
  }
}
