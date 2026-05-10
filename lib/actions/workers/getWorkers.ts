
import { prisma } from '@/lib/prisma'
import { cacheTag, cacheLife } from 'next/cache'

export const getWorkersWithStats = async () => {
  cacheTag('workers', 'employees')
  cacheLife({ revalidate: 3600, stale: 86400 })

  try {
    const workers = await prisma.worker.findMany({
      include: {
        workAccount: {
          select: {
            id: true,
            role: true,
            pageAccess: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
    })

    // Calculer les statistiques
    const stats = {
      permanents: workers.filter(w => w.type === 'CDI').length,
      trainees: workers.filter(w => w.type === 'TRAINEE').length,
      temporaries: workers.filter(w => w.type === 'CDD').length,
      onLeave: workers.filter(w => w.status === 'TIMEOFF' || w.status === 'VACATION').length,
      totalSalary: workers.reduce((sum, w) => sum + w.salary, 0),
      totalContributions: workers.reduce((sum, w) => sum + (w.socialContributions || 0), 0),
    }

    // Organiser par statut (actifs d'abord, inactifs/virés à la fin)
    const activeWorkers = workers.filter(w => ['ACTIF', 'TIMEOFF', 'VACATION', 'SICK_LEAVE'].includes(w.status))
    const inactiveWorkers = workers.filter(w => ['INACTIF', 'FIRED'].includes(w.status))
    const sortedWorkers = [...activeWorkers, ...inactiveWorkers]

    return {
      ok: true,
      workers: sortedWorkers,
      stats,
    }
  } catch (error) {
    console.error('Error fetching workers:', error)
    return {
      ok: false,
      workers: [],
      stats: {
        permanents: 0,
        trainees: 0,
        temporaries: 0,
        onLeave: 0,
        totalSalary: 0,
        totalContributions: 0,
      },
    }
  }
}
