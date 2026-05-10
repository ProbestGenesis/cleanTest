'use server'
import { auth } from '@/lib/auth'
import { isAdmin, isAdminId } from '@/lib/isAdmin'
import { isAuthed } from '@/lib/isAuthed'
import { prisma } from '@/lib/prisma'
import { uploadImage, deleteImage } from '@/lib/uploadImages'
import { createWorker } from '@/lib/zodschema'
import { nanoid, customAlphabet } from 'nanoid'
import { revalidatePath } from 'next/cache'
import z from 'zod'
enum WorkerType {
  CDI = 'CDI',
  CDD = 'CDD',
  TRAINEE = 'TRAINEE',
}


export const addWorker = async (value: z.infer<typeof createWorker>) => {
  const matricule = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)

  try {
    const adminId = await isAdminId()
    if (!adminId) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour éffectuer cette action",
        matricule: null,
      }
    }

    let imageUrl = ''
    if (value.image) {
      const { message, url } = await uploadImage({
        filename: `${Date.now()}-${(value.image as File).name}`,
        image: value.image,
      })

      if (!url) {
        return {
          ok: false,
          message,
          matricule: null,
        }
      }

      imageUrl = url
    }

    const worker = await prisma.worker.create({
      data: {
        name: value.name,
        email: value.email,
        phone: value.phone,
        officalStart: value.date,
        address: value.address as string,
        role: value.role,
        type: value.type as WorkerType,
        // mapping des champs salary
        salary: value.salary.gross,
        salaryNet: value.salary.net ?? null,
        salaryCurrency: value.salary.currency ?? null,
        salaryFrequency: value.salary.frequency ?? null,
        salaryBonuses: value.salary.bonuses ?? 0,
        salaryDeductions: value.salary.deductions ,
        matricule: matricule(),
        image: imageUrl ?? '',
        addedBy: {
          connect: { id: adminId },
        },
        status: 'ACTIF',
        contractDuration: value.contractDuration ?? null,
        socialContributions: value.salary.gross * 0.315,
      },
    })

    if (!worker) {
      return {
        ok: false,
        message: "Une erreur s'est produite",
        matricule: null,
      }
    }

    const newUser = await auth.api.createUser({
      body: {
        email: worker.email,
        name: worker.name,
        password: worker.matricule,
        role: 'user',
        data: {
          passwordIsAlreadySet: false,
          workerId: worker.id,
          workRole: value.role
        },
      },
    })

    if (!newUser) {
      // rollback possible si nécessaire (supprimer worker créé)
      await prisma.worker.delete({ where: { id: worker.id } }).catch(() => {})
      return {
        message: "Une erreur s'est produite lors de la création du compte",
        ok: false,
        matricule: null,
      }
    }

    // revalidation / cache
    revalidatePath('/interne')
    revalidatePath('/interne/employees')
    revalidatePath('/interne/products')
    revalidatePath('/interne/sales')
    revalidatePath('/interne/stock')

    return { ok: true, message: "L'ajout a été éffectué", matricule: worker.matricule }
  } catch (error) {
    console.error(error)
    return {
      message: "Une erreur s'est produite",
      ok: false,
      matricule: null,
    }
  }
}


const verfiyWorker = async (id: string) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
      },
    })

    if (!worker) {
      return false
    }

    return true
  } catch (error) {
    console.log('error in worker verification', error)
    return false
  }
}

export const deleteWorker = async (id: string) => {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour éffecuté cette opération",
      }
    }

    const workerIsExist = await verfiyWorker(id)

    if (!workerIsExist) {
      return {
        message: "Ce worker n'existe plus",
        ok: false,
      }
    }

    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { image: true }
    })

    if (worker?.image) {
      await deleteImage(worker.image)
    }

    await prisma.worker.delete({
      where: {
        id: id,
      },
    })

    return {
      message: "L'employée a été supprimé avec success",
      ok: true,
    }
  } catch (error) {
    console.log(error)
    return {
      message: "Une erreur s'est produite",
      ok: false,
    }
  }
}

export const updateWorker = async ({
  id,
  value,
}: {
  id: string
  value: z.infer<typeof createWorker>
}) => {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return {
        ok: false,
        message: "Vous n'avez pas les authorisations nécessaire pour éffecuté cette opération",
      }
    }

    const productIsExist = await verfiyWorker(id)

    if (!productIsExist) {
      return {
        message: "Cet employée n'existe plus",
        ok: false,
      }
    }

    let imageUrl = undefined
    if (value.image) {
      const oldWorker = await prisma.worker.findUnique({
        where: { id },
        select: { image: true }
      })

      const { message, url } = await uploadImage({
        filename: `${Date.now()}-${(value.image as File).name}`,
        image: value.image,
      })

      if (!url) {
        return {
          ok: false,
          message,
        }
      }

      imageUrl = url
      if (oldWorker?.image) {
        await deleteImage(oldWorker.image)
      }
    }

    await prisma.worker.update({
      where: {
        id: id,
      },
      data: {
        name: value.name,
        email: value.email,
        phone: value.phone,
        officalStart: value.date,
        address: value.address as string,
        role: value.role,
        type: value.type as WorkerType,
        salary: value.salary.gross,
        salaryNet: value.salary.net ?? null,
        salaryCurrency: value.salary.currency ?? null,
        salaryFrequency: value.salary.frequency ?? null,
        salaryBonuses: value.salary.bonuses ?? 0,
        salaryDeductions: value.salary.deductions,
        contractDuration: value.contractDuration ?? null,
        socialContributions: value.salary.gross * 0.315,
        ...(imageUrl && { image: imageUrl }),
      },
    })
    revalidatePath('/interne/employees')
    revalidatePath('/interne')
    revalidatePath('/interne/employees')
    revalidatePath('/interne/products')
    revalidatePath('/interne/sales')
    revalidatePath('/interne/stock')

    return {
      message: 'Les modification ont été enregistré avec success',
      ok: true,
    }
  } catch (error) {
    console.log(error)
    return {
      message: "Une erreur s'est produite",
      ok: false,
    }
  }
}

export const getWorkerRoles = async () => {
  try {
    const roles = await prisma.worker.findMany({
      select: {
        role: true,
      },
      distinct: ['role'],
    })
    return roles.map((r) => r.role).filter((role) => role && role.trim() !== '')
  } catch (error) {
    console.error('Error fetching roles:', error)
    return []
  }
}

export const updateWorkerContract = async ({
  id,
  status,
  officialEnd,
  contractDuration,
}: {
  id: string
  status?: 'ACTIF' | 'INACTIF' | 'FIRED' | 'TIMEOFF' | 'VACATION' | 'SICK_LEAVE'
  officialEnd?: Date
  contractDuration?: string
}) => {
  try {
    const session = await isAuthed()
    if (!session || (session.user.role !== 'superadmin' && session.user.workRole?.toLowerCase() !== 'assistant administratif')) {
      return { ok: false, message: "Non autorisé" }
    }

    const worker = await prisma.worker.findUnique({
      where: { id },
      select: { userId: true, email: true, name: true }
    })

    if (!worker) {
      return { ok: false, message: "Travailleur non trouvé" }
    }

    await prisma.worker.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(officialEnd && { officialEnd }),
        ...(contractDuration && { contractDuration }),
      },
    })

    // Prepare notification messages
    const isExtension = status === 'ACTIF' && (officialEnd || contractDuration)
    const title = isExtension ? "Prolongation de contrat" : "Mise à jour de votre contrat"
    let body = ""
    
    if (isExtension) {
      body = `Votre contrat a été prolongé${contractDuration ? ` pour une durée de ${contractDuration} mois` : ""}${officialEnd ? ` jusqu'au ${officialEnd.toLocaleDateString('fr-FR')}` : ""}.`
    } else {
      const statusLabel = status === 'INACTIF' ? 'clôturé' : status === 'TIMEOFF' ? 'mis en pause' : status === 'FIRED' ? 'résilié' : status === 'SICK_LEAVE' ? 'en congé maladie' : status === 'VACATION' ? 'en congés' : status === 'ACTIF' ? 'réactivé' : status
      body = `Votre contrat a été mis à jour. Nouveau statut : ${statusLabel}.`
    }

    // In-app notification
    if (worker.userId) {
      await prisma.notification.create({
        data: {
          title,
          body,
          type: 'CONTRACT',
          emitterId: worker.userId,
          readByIds: []
        }
      })
    }

  /*  // Email notification
    try {
      const { sendEmail } = await import('@/lib/notifications/email')
      await sendEmail({
        to: worker.email,
        subject: `[ESPEG] ${title}`,
        text: `Bonjour ${worker.name},\n\n${body}\n\nCordialement,\nL'administration ESPEG`
      })
    } catch (emailError) {
      console.error("Failed to send contract notification email:", emailError)
      // We don't fail the whole operation if email fails
    }*/

    revalidatePath('/interne/employees')
    return { ok: true, message: "Contrat mis à jour et notifications envoyées" }
  } catch (error) {
    console.error(error)
    return { ok: false, message: "Une erreur s'est produite" }
  }
}
