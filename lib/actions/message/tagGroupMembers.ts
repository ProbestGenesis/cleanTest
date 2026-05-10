"use server"
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Envoie une notification de tag à tous les membres du groupe,
 * sauf à l'utilisateur qui a initié l'action.
 */
export async function tagGroupMembers({
  discussionId,
  participantWorkerIds,
}: {
  discussionId: string
  /** IDs worker de tous les participants (incluant l'émetteur — il sera exclu automatiquement) */
  participantWorkerIds: string[]
}) {
  try {
    const emitterUserId = await isAuthedId()
    if (!emitterUserId) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const emitter = await prisma.user.findUnique({
      where: { id: emitterUserId },
      select: { name: true },
    })

    // Récupère les user.id de tous les participants sauf l'émetteur
    const recipients = await prisma.user.findMany({
      where: {
        workerId: { in: participantWorkerIds },
        NOT: { id: emitterUserId },
      },
      select: { id: true },
    })

    if (recipients.length === 0) {
      return { ok: false, message: 'Aucun membre à notifier' }
    }

    await prisma.notification.create({
      data: {
        title: 'Nouveau Tag',
        body: `${emitter?.name || 'Quelqu\'un'} vous a tagué dans une discussion de groupe.`,
        type: 'MESSAGE_TAG',
        link: `/interne/messages?di=${discussionId}`,
        emitterId: emitterUserId,
        receiptIds: recipients.map((r) => r.id),
      },
    })

    revalidatePath('/interne/messages')
    return { ok: true, message: 'Notifications envoyées à tous les membres' }
  } catch (error) {
    console.error('Error tagging group members:', error)
    return { ok: false, message: "Une erreur s'est produite lors de l'envoi des notifications" }
  }
}
