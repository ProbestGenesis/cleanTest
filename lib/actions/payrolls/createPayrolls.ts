'use server'

import { createPayrollSchema } from '@/lib/zodschema'
import { isSuperAdminId } from '@/lib/isAdmin'
import { prisma } from '@/lib/prisma'
import z from 'zod'

export const createPayrolls = async (payload: z.infer<typeof createPayrollSchema>) => {
  try {
    const superAdminUserId = await isSuperAdminId()

    if (!superAdminUserId) {
      return { ok: false, message: "Vous n'avez pas les permissions nécessaires" }
    }

    const parsed = createPayrollSchema.safeParse(payload)

    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const { workerId, periodStart, periodEnd, baseSalary, bonuses, deductions } = parsed.data

    const author = await prisma.user.findUnique({
      where: { id: superAdminUserId },
      select: { workerId: true },
    })

    if (!author?.workerId) {
      return {
        ok: false,
        message: "Votre compte n'est pas lié à un travailleur",
      }
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        workAccount: { select: { id: true } },
      },
    })

    if (!worker) {
      return { ok: false, message: 'Travailleur introuvable' }
    }

    const netSalary = baseSalary + bonuses - deductions

    if (netSalary < 0) {
      return {
        ok: false,
        message: 'Le salaire net ne peut pas être négatif',
      }
    }

    const payroll = await prisma.payroll.create({
      data: {
        workerId,
        authorId: author.workerId,
        periodStart,
        periodEnd,
        baseSalary,
        bonuses,
        deductions,
        netSalary,
      },
    })

    await prisma.notification.create({
      data: {
        title: 'Nouveau bulletin de paie',
        body: `Un bulletin de paie a été créé pour ${worker.name}`,
        type: 'payroll',
        emitter: { connect: { id: superAdminUserId } },
        receiptIds: worker.workAccount?.id ? [worker.workAccount.id] : [],
        readByIds: [superAdminUserId],
      },
    })

    return { ok: true, message: 'Bulletin de paie créé avec succès', data: payroll }
  } catch (error) {
    console.error('createPayrolls error:', error)
    return {
      ok: false,
      message: "Une erreur s'est produite lors de la création du bulletin",
    }
  }
}
