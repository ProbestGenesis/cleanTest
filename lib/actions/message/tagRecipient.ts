"use server"
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function tagRecipient({ recipientId, discussionId }: { recipientId: string, discussionId: string }) {
  try {
    const id = await isAuthedId()
    if (!id) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const emitter = await prisma.user.findUnique({
      where: { id },
      select: { name: true }
    })

    const recipientUser = await prisma.user.findFirst({
      where: { workerId: recipientId },
      select: { id: true }
    })

    if (!recipientUser) {
      return { ok: false, message: "Destinataire introuvable" }
    }

    await prisma.notification.create({
      data: {
        title: "Nouveau Tag",
        body: `${emitter?.name || 'Quelqu\'un'} vous a tagué dans une discussion.`,
        type: "MESSAGE_TAG",
        link: `/interne/messages?di=${discussionId}`,
        emitterId: id,
        receiptIds: [recipientUser.id],
      }
    })

    revalidatePath('/interne/messages')
    return { ok: true, message: "Notification envoyée" }
  } catch (error) {
    console.error("Error tagging recipient:", error)
    return { ok: false, message: "Une erreur s'est produite lors de l'envoi de la notification" }
  }
}
