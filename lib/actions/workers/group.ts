"use server"

import { prisma } from "@/lib/prisma"

import { isAdmin } from "@/lib/isAdmin"
import { isAuthedId } from "@/lib/isAuthed"
import { createOrganigram } from "@/lib/zodschema"
import { revalidatePath } from "next/cache"
import z from "zod"
//import type { Member } from '@/components/utils/message/createGroupDiscussion'
//import { createDiscussionForteam } from '../message/createDiscussionForTeam'

export const createGroup = async ({
  formData,
  chefRoleDescription,
  chefId,
  team,
}: {
  formData: z.infer<typeof createOrganigram>
  chefRoleDescription: string
  chefId: string
  team: { id: string; name: string; role: string; image: string | null }[]
}) => {
  try {
    const id = await isAuthedId()
    if (!id) {
      return {
        message: "Une erreur s'est produite",
        ok: false,
        data: null,
      }
    }

    const chef = await prisma.worker.findUnique({
      where: {
        id: chefId,
      },
      select: {
        id: true,
        name: true,
        role: true,
        image: true,
      },
    })

    if (!chef) {
      return {
        message: "Erreur lors de la verifier des informations lié aux comptes",
        ok: false,
        data: null,
      }
    }
    const workerTeam = await prisma.team.create({
      data: {
        name: formData.name,
        objectif: formData.objectif,
        description: formData.description,
        chefRoleDescription: chefRoleDescription,
        initiator: {
          connect: {
            id: id,
          },
        },
        chef: {
          connect: {
            id: chefId,
          },
        },
        workerList: team,
      },
    })

    // Crée la discussion d'équipe (messageInfo + groupMessage).
    //const { ok } = await createDiscussionForteam(workerTeam)

    {
      /* if(!ok){
      return {
        ok: false,
        message: "Une erreur s'est produite lors de la créaction du groupe message",
        data: null,
      }
    }*/
    }

    revalidatePath("/interne/employees")
    revalidatePath("/")
    revalidatePath("/interne/messages")
    return {
      message: "L'équipe a été créee avec success",
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

export const deleteGroup = async (id: string) => {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return {
        message: "Erreur d'authentification",
        ok: false,
        data: null,
      }
    }

    const group = await prisma.team.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
      },
    })

    if (!group) {
      return {
        message: "Ce groupe n'existe plus",
        ok: false,
        data: null,
      }
    }

    await prisma.team.delete({
      where: {
        id: id,
      },
    })

    return {
      message: "Cet organigramme à été supprimé",
      ok: true,
      data: null,
    }
  } catch (error) {
    return {
      ok: false,
      message: "Une erreur s'est produite",
      data: null,
    }
  }
}
