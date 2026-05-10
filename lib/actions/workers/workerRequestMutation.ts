"use server"

import type { RequestType } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

export async function createWorkerRequest(data: {
  title: string
  description: string
  type: RequestType
  startDate?: Date
  endDate?: Date
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session || !session.user) {
      return { success: false, message: "Non autorisé." }
    }

    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { worker: true },
    })

    if (!account?.worker?.id) {
      return { success: false, message: "Travailleur non trouvé." }
    }

    const result = await prisma.workerRequest.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as RequestType,
        startDate: data.startDate,
        endDate: data.endDate,
        workerId: account.worker.id,
        userId: session.user.id,
      },
    })

    // Create a notification for admins
    const admins = await prisma.user.findMany({
      where: { role: "superadmin" },
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          title: `Nouvelle demande : ${data.type}`,
          body: `${account.name} a soumis une demande : ${data.title}.`,
          type: "REQUEST",
          emitterId: admin.id,
          readByIds: [],
        })),
      })
    }

    revalidatePath("/")
    revalidatePath("/interne/profile")

    return { success: true, data: result }
  } catch (error) {
    console.error("Erreur lors de la création de la demande:", error)
    return {
      success: false,
      message: "Erreur lors de la création de la demande.",
    }
  }
}

export async function getUserRequests() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session || !session.user) {
      return { success: false, message: "Non autorisé." }
    }

    const account = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { worker: true },
    })

    if (!account?.worker?.id) {
      return { success: false, message: "Travailleur non trouvé." }
    }

    const requests = await prisma.workerRequest.findMany({
      where: { workerId: account.worker.id },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: requests }
  } catch (error) {
    console.error("Erreur lors de la récupération des demandes:", error)
    return {
      success: false,
      message: "Erreur lors de la récupération des demandes.",
    }
  }
}
