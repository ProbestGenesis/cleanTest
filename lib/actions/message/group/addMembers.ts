'use server'

import { isAuthedId } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'

export async function AddMemberInGroup({
  discussionId,
  groupId,
  newMemberIds,
}: {
  discussionId: string
  groupId: string
  newMemberIds: string[]
}): Promise<{ ok: boolean; message: string }> {
  const id = await isAuthedId()
  if (!id) {
    return { ok: false, message: "Erreur d'authentification" }
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  })
  if (user?.role !== 'superadmin') {
    return { ok: false, message: 'Accès refusé' }
  }

  if (!Array.isArray(newMemberIds) || newMemberIds.length === 0) {
    return { ok: false, message: 'userIds requis' }
  }

  const group = await prisma.groupMessage.findUnique({
    where: { id: groupId },
    select: { id: true, participants: true, removedMember: true },
  })
  if (!group) {
    return { ok: false, message: 'Groupe introuvable' }
  }

  const users = await prisma.worker.findMany({
    where: { id: { in: newMemberIds } },
    select: { id: true, name: true, image: true },
  })
  if (users.length === 0) {
    return { ok: false, message: 'Aucun utilisateur trouvé' }
  }

  // exclure les déjà présents
  const currentParticipants = group.participants as { id: string; name: string }[]
  const existingIds = new Set(currentParticipants.map((p) => p.id))

  const newParticipants = users
    .filter((u) => !existingIds.has(u.id))
    .map((u) => ({ id: u.id, name: u.name ?? 'Utilisateur' }))

  if (newParticipants.length === 0) {
    return { ok: false, message: 'Ces éléments sont déjà membres du groupe' }
  }

  // Mise à jour : ajout dans participants + retrait de removedMember
  const removedMemberUpdated = group.removedMember.filter(
    (id) => !newParticipants.some((p) => p.id === id)
  )

  await prisma.groupMessage.update({
    where: { id: group.id },
    data: {
      participants: [...currentParticipants, ...newParticipants],
      removedMember: removedMemberUpdated,
    },
  })

  // ajout dans receiptIds
  await prisma.discussion.update({
    where: { id: discussionId },
    data: {
      receipt: {
        push: newParticipants,
      },
      receiptIds: {
        push: newParticipants.map((p) => p.id),
      },
    },
  })

  return { ok: true, message: `${newParticipants.length} membre(s) ajouté(s)` }
}
