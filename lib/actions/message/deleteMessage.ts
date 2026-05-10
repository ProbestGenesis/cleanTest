"use server"
import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteMessage(messageId: string) {
  try {
    const id = await isAuthedId()

    if (!id) {
      return { ok: false, message: "Erreur d'authentification" }
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, discussion: true }
    })

    if (!message) {
      return { ok: false, message: "Message introuvable" }
    }

    // Un utilisateur ne peut supprimer que ses propres messages
    if (message.senderId !== id) {
      return { ok: false, message: "Vous n'avez pas l'autorisation de supprimer ce message" }
    }

    await prisma.message.delete({
      where: { id: messageId }
    })

    revalidatePath('/interne/messages')
    
    return { ok: true, message: "Message supprimé" }
  } catch (error) {
    console.error(error)
    return { ok: false, message: "Une erreur s'est produite lors de la suppression" }
  }
}
