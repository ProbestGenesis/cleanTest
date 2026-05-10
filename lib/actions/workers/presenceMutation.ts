"use server"

import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Récupérer la liste des travailleurs avec leur statut de présence du jour
export async function getWorkersPresenceStatus() {
  const currentUserId = await isAuthedId()
  if (!currentUserId) return { success: false, data: [] }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Récupérer tous les travailleurs actifs (ou CDI/CDD)
    const workers = await prisma.worker.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        presence: {
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
          select: {
            id: true,
            arrivalTime: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return {
      success: true,
      data: workers.map((w) => ({
        id: w.id,
        name: w.name,
        role: w.role,
        image: w.image,
        presenceStatus: w.presence.length > 0 ? w.presence[0] : null,
      })),
    }
  } catch (error) {
    console.error("Erreur récupération présence:", error)
    return { success: false, data: [] }
  }
}

// Enregistrer ou mettre à jour l'heure d'arrivée
export async function recordWorkerPresence(workerId: string) {
  const currentUserId = await isAuthedId()
  if (!currentUserId) return { success: false, message: "Non authentifié" }

  try {
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Vérifier si une présence existe déjà pour aujourd'hui
    const existingPresence = await prisma.presence.findFirst({
      where: {
        workerId: workerId,
        date: {
          gte: todayStart,
          lt: tomorrow,
        },
      },
    })

    if (existingPresence) {
      return {
        success: false,
        message: "Pointage déjà enregistré aujourd'hui.",
      }
    }

    // Créer la présence
    await prisma.presence.create({
      data: {
        workerId,
        date: todayStart,
        arrivalTime: new Date(),
        recordedBy: currentUserId,
      },
    })

    revalidatePath("/")
    return { success: true, message: "Présence enregistrée avec succès." }
  } catch (error) {
    console.error("Error recording presence:", error)
    return { success: false, message: "Erreur lors de l'enregistrement." }
  }
}
