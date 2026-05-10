// app/actions/toggleGroupAdmin.ts
'use server'


import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAuthedId } from '@/lib/isAuthed'


export async function toggleGroupAdmin(messageId: string, userId: string){
  
  const id = await isAuthedId()

  if(!id){
    return { ok: false, message: "Erreur d'authentification"}
  }
  // Impossible de se modifier soi-même
  if (userId === id) {
    return { ok: false, message: 'Vous ne pouvez pas modifier vos propres droits'}
  }

  // 2. Récupération du rôle global et du groupe
  const [user, group] = await Promise.all([
    prisma.user.findUnique({
      where: { id: id },
      select: { role: true },
    }),
    prisma.groupMessage.findUnique({
      where: { discussionId: messageId },
      select: { id: true, admin: true, participants: true },
    }),
  ])

  if (!group) {
    return { ok: false, message: 'Groupe introuvable', status: 404 }
  }

  const isSuperAdmin = user?.role === 'superadmin'
  const currentAdmins = (group.admin ?? []) as string[]
  const isGroupAdmin = currentAdmins.includes(id)

  // Ni superadmin ni admin du groupe → accès refusé
  if (!isSuperAdmin && !isGroupAdmin) {
    return { ok: false, message: 'Accès refusé'}
  }

  // 3. Vérifier que la cible est bien participant
  const participants = (group.participants ?? []) as { id: string; name?: string }[]
  if (!participants.some((p) => p.id === userId)) {
    return { ok: false, message: "L'utilisateur n'est pas membre du groupe"}
  }

  const isAlreadyAdmin = currentAdmins.includes(userId)

  // 4. Règle : un admin de groupe ne peut PAS retirer un autre admin
  if (isAlreadyAdmin && !isSuperAdmin) {
    return {
      ok: false,
      message: 'Seul un superadmin peut retirer les droits administrateur',
      status: 403,
    }
  }

  // 5. Toggle
  const newAdmins = isAlreadyAdmin ? currentAdmins.filter((id) => id !== userId) : [...currentAdmins, userId]

  const updated = await prisma.groupMessage.update({
    where: { id: group.id },
    data: { admin: newAdmins },
    select: { id: true, admin: true },
  })

  return {
    ok: true,
    message: isAlreadyAdmin ? 'Droits admin retirés' : 'Administrateur nommé',
    data: updated,
  }
}
