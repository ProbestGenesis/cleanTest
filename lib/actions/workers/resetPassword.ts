'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/isAdmin'
import { revalidatePath } from 'next/cache'

export const resetWorkerPassword = async (workerId: string) => {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return {
        ok: false,
        message: "Vous n'avez pas les autorisations nécessaires pour effectuer cette opération",
      }
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        workAccount: true
      }
    })

    if (!worker) {
      return {
        ok: false,
        message: "L'employé n'existe pas",
      }
    }

    if (!worker.workAccount) {
      return {
        ok: false,
        message: "Cet employé n'a pas de compte utilisateur associé",
      }
    }

    // Utilisation de l'API admin de better-auth pour réinitialiser le mot de passe
    // Cette API gère le hachage et la mise à jour de la table account
    // Refactored to use setUserPassword as suggested by the user
    await (auth.api as any).setUserPassword({
      body: {
        userId: worker.workAccount.id,
        newPassword: worker.matricule,
      },
    })

    // Réinitialisation des flags passwordIsAlreadySet
    await prisma.user.update({
      where: { id: worker.workAccount.id },
      data: {
        passwordIsAlreadySet: false,
      }
    })

    await prisma.worker.update({
      where: { id: workerId },
      data: {
        passwordIsAlreadySet: false,
      }
    })

    revalidatePath('/admin/settings')
    
    return {
      ok: true,
      message: `Le mot de passe de ${worker.name} a été réinitialisé avec succès à son matricule (${worker.matricule})`,
    }
  } catch (error) {
    console.error('Error resetting password:', error)
    return {
      ok: false,
      message: "Une erreur s'est produite lors de la réinitialisation du mot de passe",
    }
  }
}

