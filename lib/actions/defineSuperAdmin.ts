'use server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export const defineSuperAdmin = async (id: string | null): Promise<{ success: boolean }> => {
  if (!id) return { success: false }
  try {
    const superAdmin = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
    })


    if (superAdmin.length > 0) return { success: false }

    const userIsSuperAdmin = await prisma.user.update({
      where: { id },
      data: {
        role: 'superadmin',
        passwordIsAlreadySet: true,
      },
    })

    const worker = await prisma.worker.create({
      data: {
        workAccount: { connect: { id: userIsSuperAdmin.id } },
        role: 'directeur',
        matricule: nanoid(6),
        name: userIsSuperAdmin.name ?? '',
        email: userIsSuperAdmin.email ?? '',
        address: '',
        phone: '',
        salary: 0,
        status: 'ACTIF',
        type: 'CDI',
        addedBy: { connect: { id: userIsSuperAdmin.id } },
      },
    })

    
    return { success: true }
  } catch (error) {
    console.error('Error in defineSuperAdmin:', error)
    return { success: false }
  }
}
