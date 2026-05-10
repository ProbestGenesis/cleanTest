'use server'

import { prisma } from '@/lib/prisma'

import { isAuthed } from '@/lib/isAuthed'
import { Prisma } from '@/generated/prisma/client'
import { revalidatePath } from 'next/cache'

export const addNewTeammate = async ({
  newWorkers,
  groupId,
}: {
  newWorkers: { name: string; id: string; role: string; image: string | null }[]
  groupId: string
}) => {
  try {
    const session = await isAuthed()
    if (!session) {
      return {
        message: "Une erreur s'est produite",
        ok: false,
        data: null,
      }
    }

    const workerTeam = await prisma.team.findUnique({
      where: {
        id: groupId,
      },
      select: {
        id: true,
        workerList: true,
      },
    })

    if (!workerTeam) {
      return {
        ok: false,
        message: "Cette équipe n'existe plus",
        data: null,
      }
    }

    const newList = [...workerTeam.workerList, ...newWorkers]
    const setList = new Set(newList)

    await prisma.team.update({
      where: {
        id: workerTeam.id,
      },
      data: {
        workerList: Array.from(setList) as Prisma.InputJsonValue[],
      },
    })

    revalidatePath('/interne/employees')

    return {
      message: 'Les nouveaux membres ont étés ajouté avec success',
      ok: true,
      data: workerTeam,
    }
  } catch (error) {
    return {
      ok: false,
      message: "Une erreur s'est produite",
      data: null,
    }
  }
}
