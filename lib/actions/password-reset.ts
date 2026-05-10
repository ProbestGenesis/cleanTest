'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { createNotification } from './notifications'

/**
 * Creates a manual password reset request in the database.
 */
export async function requestManualReset(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { ok: false, error: "Aucun utilisateur trouvé avec cet email" }
    }

    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        type: 'MANUAL',
        status: 'PENDING',
      },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['superadmin', 'assistant_administratif'] } },
      select: { id: true }
    })

    if (admins.length > 0) {
      await createNotification({
        title: 'Nouvelle demande de réinitialisation',
        body: `L'utilisateur ${user.name} (${user.email}) demande une réinitialisation de son mot de passe.`,
        type: 'PASSWORD_RESET_REQUEST',
        link: '/interne/admin/password-requests',
        receiverIds: admins.map(a => a.id)
      })
    }
    return { ok: true }
  } catch (error) {
    console.error('Error requesting manual reset:', error)
    return { ok: false, error: 'Une erreur est survenue lors de la demande' }
  }
}

/**
 * Admin action to reset a user's password to their matricule.
 * Restricted to superadmin and assistant_administratif.
 */
export async function adminResetPassword(requestId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || !['superadmin', 'assistant_administratif'].includes(session.user.role || '')) {
    return { ok: false, error: 'Vous n\'avez pas les permissions nécessaires' }
  }

  try {
    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })

    if (!request || !request.user) {
      return { ok: false, error: 'Demande introuvable' }
    }

    const matricule = request.user.matricule
    if (!matricule) {
      return { ok: false, error: "L'utilisateur n'a pas de matricule défini" }
    }

    // Better-Auth admin action to set password
    await auth.api.setUserPassword({
      headers: await headers(),
      body: {
        newPassword: matricule,
        userId: request.userId,
      },
    })

    // Update request status
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' },
    })

    // Log the update
    await prisma.passwordUpdateLog.create({
      data: {
        userId: request.userId,
        resetById: session.user.id,
        method: 'MANUAL_ADMIN',
      },
    })

    return { ok: true }
  } catch (error) {
    console.error('Error in adminResetPassword:', error)
    return { ok: false, error: 'Une erreur est survenue lors de la réinitialisation' }
  }
}

/**
 * Logs a successful password reset performed via email/OTP.
 */
export async function logEmailReset(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      await prisma.passwordUpdateLog.create({
        data: {
          userId: user.id,
          method: 'EMAIL',
        },
      })
    }
    return { ok: true }
  } catch (error) {
    console.error('Error logging email reset:', error)
    return { ok: false }
  }
}

/**
 * Fetches all pending manual reset requests.
 */
export async function getPendingResetRequests() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session || !['superadmin', 'assistant_administratif'].includes(session.user.role || '')) {
    return { ok: false, error: 'Non autorisé', data: [] }
  }

  try {
    const requests = await prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING', type: 'MANUAL' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            matricule: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    return { ok: true, data: requests }
  } catch (error) {
    console.error('Error fetching reset requests:', error)
    return { ok: false, error: 'Erreur lors de la récupération', data: [] }
  }
}
