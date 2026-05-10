"use server"
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Member } from '@/components/message/CreateGroupDiscussionDialog'

export async function createDiscussion({ participants, isGroup, groupName }: {participants: Member[], isGroup: boolean, groupName?: string}) {
  try {

    const id = await isAuthedId()

    if(!id){
        return {
            ok: false,
            message: "Erreur d'authentification"
          }
    }

    // Récupérer le worker associé à l'utilisateur
    const userWithWorker = await prisma.user.findUnique({
      where: { id },
      select: {
        worker: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    })

    if (!userWithWorker?.worker) {
      return {
        ok: false,
        message: "Action impossible : aucun employé lié à ce compte"
      }
    }

    const creatorMember: Member = {
      id: userWithWorker.worker.id,
      name: userWithWorker.worker.name,
      image: userWithWorker.worker.image,
    }

    // Éviter les doublons et ajouter le créateur
    const allParticipants = [...participants]
    if (!allParticipants.some(p => p.id === creatorMember.id)) {
      allParticipants.push(creatorMember)
    }

    const participantsIds = allParticipants.map(t => t.id)
    const discussion = await prisma.discussion.create({
      data: {
        name: isGroup ? groupName ?? '' : `${participants[0].name}`,
        lastMessage: isGroup ? `Nouveau groupe` : `Nouvelle discussion`,
        receipt: allParticipants as any,
        receiptIds:  participantsIds,
        createdBy: id,
      },
    })

    if (isGroup) {
      await prisma.groupMessage.create({
        data: {
          name: groupName ?? '',
          userId: id,
          discussionId: discussion.id,
          participants: allParticipants as any,
          createdBy: id,
          admin: [userWithWorker.worker.id],
        },
      })
    }

    revalidatePath('/interne/messages')
    revalidatePath('/interne/employees')
    return {
        ok: true,
        message: "La discussion a été crée",
        id: discussion.id
    }
  } catch (error) {
    return {
      ok: false,
      message: "Une erreur s'est produite"
    }
  }
}
