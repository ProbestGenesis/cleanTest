"use server"

import { isAuthed } from "@/lib/isAuthed"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createProject(data: {
  name: string
  description?: string
  chefId: string
  participantIds: string[]
  startDate?: Date
  endDate?: Date
  budget?: number
}) {
  try {
    const session = await isAuthed()
    if (!session) {
      return { ok: false, message: "Non authentifié" }
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        chefId: data.chefId,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        createdById: session.user.id,
        participants: {
          connect: data.participantIds.map((id) => ({ id })),
        },
      },
    })

    revalidatePath("/")
    return { ok: true, message: "Projet créé avec succès", data: project }
  } catch (error) {
    console.error("Error creating project:", error)
    return { ok: false, message: "Erreur lors de la création du projet" }
  }
}

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        chef: { select: { id: true, name: true } },
        participants: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return { ok: true, data: projects }
  } catch (error) {
    console.error("Error fetching projects:", error)
    return { ok: false, message: "Erreur lors de la récupération des projets" }
  }
}

export async function getProjectFinancials() {
  try {
    const session = await isAuthed()
    if (!session) {
      return { ok: false, message: "Non authentifié" }
    }
    const projects = await prisma.project.findMany({
      include: {
        purchases: { select: { totalAmount: true } },
        expenseRequests: {
          where: { status: "APPROVED" },
          select: { estimatedAmount: true },
        },
        expenses: { select: { amountET: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const financialData = projects.map((p) => {
      const totalPurchases = p.purchases.reduce(
        (acc, curr) => acc + (curr.totalAmount || 0),
        0
      )
      const totalExpenseRequests = p.expenseRequests.reduce(
        (acc, curr) => acc + (curr.estimatedAmount || 0),
        0
      )
      const totalExpenses = p.expenses.reduce(
        (acc, curr) => acc + (curr.amountET || 0),
        0
      )
      const totalSpent = totalPurchases + totalExpenseRequests + totalExpenses
      const gap = (p.budget || 0) - totalSpent
      return {
        id: p.id,
        name: p.name,
        budget: p.budget || 0,
        totalPurchases,
        totalExpenses: totalExpenseRequests + totalExpenses,
        totalSpent,
        gap,
      }
    })

    return { ok: true, data: financialData }
  } catch (error) {
    console.error("Error fetching project financials:", error)
    return {
      ok: false,
      message: "Erreur lors de la récupération des finances des projets",
    }
  }
}
