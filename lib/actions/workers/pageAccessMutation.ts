"use server"

import { prisma } from "@/lib/prisma"
import { normalizePageAccess } from "@/lib/pageAccess"
import { revalidatePath } from "next/cache"

export async function updateUserPageAccess(userId: string, pages: string[]) {
  try {
    const normalizedPages = normalizePageAccess(pages)

    await prisma.user.update({
      where: { id: userId },
      data: { pageAccess: normalizedPages },
    })
    
    // Revalidate paths where this user data might be fetched
    revalidatePath("/interne/employees")
    
    return { success: true, message: "Accès mis à jour avec succès." }
  } catch (error) {
    console.error("Error updating user page access:", error)
    return { success: false, message: "Une erreur est survenue lors de la mise à jour." }
  }
}
export async function getWorkersWithAccounts() {
  try {
    const workers = await prisma.worker.findMany({
      where: {
        workAccount: {
          isNot: null,
        },
      },
      include: {
        workAccount: {
          select: {
            id: true,
            role: true,
            pageAccess: true,
          },
        },
      },
    })
    return { success: true, data: workers }
  } catch (error) {
    console.error("Error fetching workers:", error)
    return { success: false, data: [] }
  }
}
