'use server'

import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'

/**
 * "Deletes" a discussion for the current user by adding their ID to the `deletedBy` array.
 * This hides the discussion from the user's view without truly deleting it from the database.
 */
export async function deleteDiscussionAction(discussionId: string) {
  try {
    const id = await isAuthedId()
    if (!id) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true, deletedBy: true },
    })

    if (!discussion) {
      return { ok: false, message: 'Discussion introuvable' }
    }

    // Check if user has already "deleted" it
    if (discussion.deletedBy.includes(id)) {
      return { ok: true, message: 'Discussion déjà supprimée' }
    }

    await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        deletedBy: {
          push: id,
        },
      },
    })

    return { ok: true, message: 'Discussion supprimée' }
  } catch (error) {
    console.error('Error in deleteDiscussionAction:', error)
    return { ok: false, message: "Une erreur s'est produite lors de la suppression" }
  }
}
