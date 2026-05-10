"use server"
import { Prisma } from "@/generated/prisma/client"
import { isSuperAdminId } from "@/lib/isAdmin"
import { prisma } from "@/lib/prisma"
import { ParticularTaskSchema } from "@/lib/zodschema"
import { z } from "zod"
import {
  ATTENDANCE_RECORDER_TASK_TITLE,
  ATTENDANCE_RECORDER_TASK_DESCRIPTION,
  STOCK_MANAGEMENT_TASK_TITLE,
  STOCK_MANAGEMENT_TASK_DESCRIPTION,
} from "@/lib/constants/particularTasks"

const syncParticularRoles = async (
  tx: Prisma.TransactionClient,
  oldTitle: string | null,
  newTitle: string | null,
  oldUserIds: (string | undefined | null)[],
  newUserIds: (string | undefined | null)[]
) => {
  const allUserIds = Array.from(
    new Set([...oldUserIds, ...newUserIds].filter((id): id is string => !!id))
  )

  for (const userId of allUserIds) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { particularRole: true },
    })
    if (!user) continue

    let roles = [...user.particularRole]

    // 1. Remove the old title if it was provided
    if (oldTitle) {
      roles = roles.filter((r) => r !== oldTitle)
    }

    // 2. Add the new title if the user is currently assigned and title is provided
    if (newTitle && newUserIds.includes(userId)) {
      if (!roles.includes(newTitle)) {
        roles.push(newTitle)
      }
    }

    await tx.user.update({
      where: { id: userId },
      data: { particularRole: roles },
    })
  }
}

export const addParticularTask = async (
  data: z.infer<typeof ParticularTaskSchema>
) => {
  try {
    const adminId = await isSuperAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les permissions nécessaires",
      }
    }

    let title = data.title.trim()
    let description = data.description.trim()

    // Normalize and secure system-specific tasks to prevent typos
    const lowerTitle = title.toLowerCase()

    if (lowerTitle.includes("pointage") || lowerTitle.includes("attendance")) {
      title = ATTENDANCE_RECORDER_TASK_TITLE
      description = ATTENDANCE_RECORDER_TASK_DESCRIPTION
    } else if (
      lowerTitle.includes("stock") ||
      lowerTitle.includes("achat") ||
      lowerTitle.includes("purchase") ||
      lowerTitle.includes("sortie")
    ) {
      title = STOCK_MANAGEMENT_TASK_TITLE
      description = STOCK_MANAGEMENT_TASK_DESCRIPTION
    }

    const existingTask = await prisma.particularTask.findFirst({
      where: {
        title: {
          equals: title,
          mode: "insensitive",
        },
      },
      select: { id: true, title: true },
    })

    if (existingTask) {
      const isSystemTask = [
        STOCK_MANAGEMENT_TASK_TITLE,
        ATTENDANCE_RECORDER_TASK_TITLE,
      ].some((t) => t.toLowerCase() === existingTask.title.toLowerCase())

      return {
        ok: true,
        message: isSystemTask
          ? `La tâche "${existingTask.title}" existe déjà`
          : "Une tâche avec ce titre existe déjà",
      }
    }

    await prisma.particularTask.create({
      data: { title, description },
    })

    await prisma.notification.create({
      data: {
        title: "Nouvelle tâche particulière",
        body: `Une nouvelle tâche particulière a été ajoutée : ${title}`,
        type: "task",
        emitter: { connect: { id: adminId } },
        readByIds: [adminId],
      },
    })

    return { ok: true, message: "Tâche ajoutée avec succès" }
  } catch (error) {
    console.error("Error adding particular task:", error)
    return { ok: false, message: "Une erreur s'est produite lors de l'ajout" }
  }
}

export const assignParticularTask = async (data: {
  taskId: string
  workerId: string
  adjointId?: string | null
}) => {
  try {
    const adminId = await isSuperAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les permissions nécessaires",
      }
    }

    const { taskId, workerId, adjointId } = data

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current task state
      const task = await tx.particularTask.findUnique({
        where: { id: taskId },
        include: {
          worker: { select: { workAccount: { select: { id: true } } } },
          adjoint: { select: { workAccount: { select: { id: true } } } },
        },
      })

      if (!task) throw new Error("Tâche non trouvée")

      // 2. Fetch new assignees
      const [newWorker, newAdjoint] = await Promise.all([
        tx.worker.findUnique({
          where: { id: workerId },
          include: { workAccount: { select: { id: true } } },
        }),
        adjointId
          ? tx.worker.findUnique({
              where: { id: adjointId },
              include: { workAccount: { select: { id: true } } },
            })
          : Promise.resolve(null),
      ])

      if (!newWorker) throw new Error("Travailleur principal introuvable")
      if (adjointId && !newAdjoint)
        throw new Error("Travailleur adjoint introuvable")

      const oldWorkerUserId = task.worker?.workAccount?.id
      const oldAdjointUserId = task.adjoint?.workAccount?.id
      const newWorkerUserId = newWorker.workAccount?.id
      const newAdjointUserId = newAdjoint?.workAccount?.id

      // 3. Update task
      await tx.particularTask.update({
        where: { id: taskId },
        data: { workerId, adjointId: adjointId || null },
      })

      // 4. Sync roles
      await syncParticularRoles(
        tx,
        task.title,
        task.title,
        [oldWorkerUserId, oldAdjointUserId],
        [newWorkerUserId, newAdjointUserId]
      )

      // 5. Notification
      const receiptIds = [newWorkerUserId, newAdjointUserId].filter(
        (id): id is string => !!id
      )
      if (receiptIds.length > 0) {
        await tx.notification.create({
          data: {
            title: "Tâche assignée",
            body: `La tâche "${task.title}" vous a été assignée.`,
            type: "task",
            emitter: { connect: { id: adminId } },
            receiptIds,
            readByIds: [adminId],
          },
        })
      }

      return { ok: true, message: "Tâche assignée avec succès" }
    })
  } catch (error: unknown) {
    console.error("Error assigning particular task:", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Une erreur s'est produite lors de l'assignation",
    }
  }
}

export const updateParticularTask = async (
  taskId: string,
  data: z.infer<typeof ParticularTaskSchema>,
  workerId: string,
  adjointId: string | null
) => {
  try {
    const adminId = await isSuperAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les permissions nécessaires",
      }
    }

    let { title: newTitle, description } = data

    // Normalize and secure system-specific tasks to prevent typos
    const lowerTitle = newTitle.toLowerCase()

    if (lowerTitle.includes("pointage") || lowerTitle.includes("attendance")) {
      newTitle = ATTENDANCE_RECORDER_TASK_TITLE
      description = ATTENDANCE_RECORDER_TASK_DESCRIPTION
    } else if (
      lowerTitle.includes("stock") ||
      lowerTitle.includes("achat") ||
      lowerTitle.includes("purchase") ||
      lowerTitle.includes("sortie")
    ) {
      newTitle = STOCK_MANAGEMENT_TASK_TITLE
      description = STOCK_MANAGEMENT_TASK_DESCRIPTION
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current task state
      const task = await tx.particularTask.findUnique({
        where: { id: taskId },
        include: {
          worker: { select: { workAccount: { select: { id: true } } } },
          adjoint: { select: { workAccount: { select: { id: true } } } },
        },
      })

      if (!task) throw new Error("La tâche à modifier n'a pas été trouvée")

      // 2. Fetch new assignees
      const [newWorker, newAdjoint] = await Promise.all([
        workerId
          ? tx.worker.findUnique({
              where: { id: workerId },
              select: { workAccount: { select: { id: true } } },
            })
          : Promise.resolve(null),
        adjointId
          ? tx.worker.findUnique({
              where: { id: adjointId },
              select: { workAccount: { select: { id: true } } },
            })
          : Promise.resolve(null),
      ])

      const oldWorkerUserId = task.worker?.workAccount?.id
      const oldAdjointUserId = task.adjoint?.workAccount?.id
      const newWorkerUserId = newWorker?.workAccount?.id
      const newAdjointUserId = newAdjoint?.workAccount?.id

      // 3. Update task
      await tx.particularTask.update({
        where: { id: taskId },
        data: {
          title: newTitle,
          description,
          workerId: workerId || null,
          adjointId: adjointId || null,
        },
      })

      // 4. Sync roles (removes oldTitle from old users, adds newTitle to new users)
      await syncParticularRoles(
        tx,
        task.title,
        newTitle,
        [oldWorkerUserId, oldAdjointUserId],
        [newWorkerUserId, newAdjointUserId]
      )

      // 5. Notification
      const receiptIds = [newWorkerUserId, newAdjointUserId].filter(
        (id): id is string => !!id
      )
      if (receiptIds.length > 0) {
        await tx.notification.create({
          data: {
            title: "Tâche modifiée",
            body: `La tâche "${newTitle}" a été modifiée.`,
            type: "task",
            emitter: { connect: { id: adminId } },
            receiptIds,
            readByIds: [adminId],
          },
        })
      }

      return { ok: true, message: "Tâche modifiée avec succès" }
    })
  } catch (error: unknown) {
    console.error("Error updating particular task:", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Une erreur s'est produite lors de la modification",
    }
  }
}

export const deleteParticularTask = async (taskId: string) => {
  try {
    const adminId = await isSuperAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les permissions nécessaires",
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch task to get users for role cleanup
      const task = await tx.particularTask.findUnique({
        where: { id: taskId },
        include: {
          worker: { select: { workAccount: { select: { id: true } } } },
          adjoint: { select: { workAccount: { select: { id: true } } } },
        },
      })

      if (!task) throw new Error("Tâche non trouvée")

      const workerUserId = task.worker?.workAccount?.id
      const adjointUserId = task.adjoint?.workAccount?.id

      // 2. Cleanup roles (pass null as newTitle to only remove)
      await syncParticularRoles(
        tx,
        task.title,
        null,
        [workerUserId, adjointUserId],
        []
      )

      // 3. Delete task
      await tx.particularTask.delete({
        where: { id: taskId },
      })

      return { ok: true, message: "Tâche supprimée avec succès" }
    })
  } catch (error: unknown) {
    console.error("Error deleting particular task:", error)
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Une erreur s'est produite lors de la suppression",
    }
  }
}
