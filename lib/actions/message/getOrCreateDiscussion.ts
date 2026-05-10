"use server"
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { createDiscussion } from './createDiscussion'

export async function getOrCreateDiscussion(targetWorkerId: string) {
  try {
    const userId = await isAuthedId()
    if (!userId) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const userWithWorker = await prisma.user.findUnique({
      where: { id: userId },
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
      return { ok: false, message: "Action impossible : aucun employé lié à ce compte" }
    }

    const currentWorkerId = userWithWorker.worker.id

    // Search for an existing 1-to-1 discussion
    const existingDiscussion = await prisma.discussion.findFirst({
      where: {
        groupMessage: null,
        AND: [
          { receiptIds: { has: currentWorkerId } },
          { receiptIds: { has: targetWorkerId } }
        ]
      }
    })

    if (existingDiscussion) {
      return { ok: true, data: existingDiscussion.id }
    }

    // If not found, create one
    const targetWorker = await prisma.worker.findUnique({
      where: { id: targetWorkerId },
      select: { id: true, name: true, image: true }
    })

    if (!targetWorker) {
      return { ok: false, message: "Employé introuvable" }
    }

    const result = await createDiscussion({
      participants: [{ id: targetWorker.id, name: targetWorker.name, image: targetWorker.image }],
      isGroup: false
    })

    if (result.ok) {
        return { ok: true, data: result.id }
    }

    return { ok: false, message: result.message }
  } catch (error) {
    console.error("Error in getOrCreateDiscussion:", error)
    return { ok: false, message: "Une erreur s'est produite" }
  }
}
