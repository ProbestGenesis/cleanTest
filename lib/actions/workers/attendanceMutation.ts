"use server"

import { isAuthedId } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getWorkerAttendanceForDate(workerId: string, date: Date) {
  try {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const attendance = await prisma.attendance.findFirst({
      where: {
        workerId: workerId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })
    return { ok: true, data: attendance }
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return { ok: false, message: "Error fetching attendance" }
  }
}

export async function recordAttendance(data: {
  workerId: string
  date: Date
  checkIn: Date | undefined
  checkOut: Date | undefined
  status: string
  period?: "MATIN" | "SOIR"
}) {
  try {
    const userId = await isAuthedId()
    if (!userId) return { ok: false, message: "Not authenticated" }

    const recorder = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        workerId: true,
      },
    })

    if (!recorder) {
      return { ok: false, message: "Recorder is not a registered worker" }
    }

    const startOfDay = new Date(data.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(data.date)
    endOfDay.setHours(23, 59, 59, 999)

    // Check if attendance already exists for this worker and date
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        workerId: data.workerId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    if (existingAttendance) {
      await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          status: data.status,
          recordedBy: {
            connect: {
              id: recorder.workerId as string,
            },
          },
        },
      })
    } else {
      await prisma.attendance.create({
        data: {
          worker: {
            connect: {
              id: data.workerId,
            },
          },
          date: startOfDay,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          status: data.status,
          period: (data.period || "MATIN") as any,
          recordedBy: {
            connect: {
              id: recorder.workerId as string,
            },
          },
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/interne/employees")
    return { ok: true, message: "Pointage enregistré avec succès" }
  } catch (error) {
    console.error("Error recording attendance:", error)
    return { ok: false, message: "Erreur lors de l'enregistrement" }
  }
}
