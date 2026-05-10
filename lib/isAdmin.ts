'use server'
import { isAuthed } from './isAuthed'
import { prisma } from './prisma'

export const isAdmin = async (): Promise<boolean> => {
  const session = await isAuthed()
  if (!session) {
    return false
  }
  const role = session.user.role ?? null

  if (!role) {
    return false
  }
  if (role !== 'admin' && role !== 'superadmin') {
    return false
  }
  return true
}
export const isAdminId = async (): Promise<string> => {
  const session = await isAuthed()
  if (!session) {
    return ''
  }
  const role = session.user.role

  if (!role) {
    return ''
  }
  if (role !== 'admin' && role !== 'superadmin') {
    return ''
  }
  return session.user.id
}

export const isSuperAdminId = async (): Promise<string | null> => {
  const session = await isAuthed()
  if (!session) {
    return null
  }
  const role = session.user.role

  if (!role) {
    return null
  }
  if (role !== 'superadmin') {
    return null
  }
  return session.user.id
}

export const superAdminIsAlreadySet = async () => {
  try {
    const superAdmin = await prisma.user.findMany({
      where: {
        role: 'superadmin',
      },
    })

    if (superAdmin.length === 0) {
      return false
    }

    return true
  } catch (error) {
    console.log(error)
    return false
  }
}
