'use server'
import { Team, Worker } from '@/generated/prisma/client'
import { isAuthedIdWithRole } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createDiscussionForteam(team: Team) {
  try {
    const { id, role } = await isAuthedIdWithRole()

    if (!id) {
      return {
        ok: false,
        message: "Erreur d'authentification",
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

    const creatorId = userWithWorker.worker.id
    const creatorName = userWithWorker.worker.name

    const initialParticipantIds = [team.chefId, ...team.workerList.map((m: any) => m.id)]
    const initialParticipants = [
      { id: team.chefId, name: '' },
      ...team.workerList.map((m: any) => ({
        id: m.id,
        name: m.name,
      })),
    ]

    // Ajouter le créateur s'il n'est pas déjà dans la liste
    const participantIds = [...initialParticipantIds]
    const participant = [...initialParticipants]

    if (!participantIds.includes(creatorId)) {
      participantIds.push(creatorId)
      participant.push({ id: creatorId, name: creatorName })
    }

    const discussion = await prisma.discussion.create({
      data: {
        name: team.name ?? "Discussion d'équipe",
        lastMessage: 'Nouvelle discussion',
        lastMessageDate: new Date(),
        receipt: participant as any,
        receiptIds: participantIds,
        createdBy: id,
      },
    })

    const adminIds: string[] = []

    if (role === 'superadmin') {
      adminIds.push(id, team.chefId)
    } else {
      adminIds.push(team.chefId)
    }
    
    // S'assurer que le créateur est aussi admin s'il le souhaite ou par défaut ici ?
    // L'utilisateur n'a pas spécifié d'admin pour le créateur mais c'est logique
    if (!adminIds.includes(creatorId)) adminIds.push(creatorId)

    await prisma.groupMessage.create({
      data: {
        name: team.name ?? "Discussion d'équipe",
        userId: id,
        discussionId: discussion.id,
        participants: participant as any,
        createdBy: id,
        admin: adminIds,
      },
    })

    revalidatePath('/interne/messages')
    revalidatePath('/interne/employees')
    return {
      ok: true,
      message: 'La discussion a été crée',
    }
  } catch (error) {
    return {
      ok: false,
      message: "Une erreur s'est produite",
    }
  }
}
