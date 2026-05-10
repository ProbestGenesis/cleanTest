export type WorkerStatus = 'ACTIF' | 'INACTIF' | 'FIRED' | 'TIMEOFF' | 'VACATION' | 'SICK_LEAVE'

export const getStatusColor = (status: WorkerStatus) => {
  const colors: Record<WorkerStatus, { bg: string; border: string; badge: string; text: string }> = {
    ACTIF: {
      bg: 'bg-emerald-50',
      border: 'border-l-4 border-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800',
      text: 'text-emerald-700',
    },
    TIMEOFF: {
      bg: 'bg-sky-50',
      border: 'border-l-4 border-sky-500',
      badge: 'bg-sky-100 text-sky-800',
      text: 'text-sky-700',
    },
    VACATION: {
      bg: 'bg-blue-50',
      border: 'border-l-4 border-blue-500',
      badge: 'bg-blue-100 text-blue-800',
      text: 'text-blue-700',
    },
    SICK_LEAVE: {
      bg: 'bg-amber-50',
      border: 'border-l-4 border-amber-500',
      badge: 'bg-amber-100 text-amber-800',
      text: 'text-amber-700',
    },
    INACTIF: {
      bg: 'bg-orange-50',
      border: 'border-l-4 border-orange-500',
      badge: 'bg-orange-100 text-orange-800',
      text: 'text-orange-700',
    },
    FIRED: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      badge: 'bg-red-100 text-red-800',
      text: 'text-red-700',
    },
  }
  return colors[status]
}

export const getStatusLabel = (status: WorkerStatus) => {
  const labels: Record<WorkerStatus, string> = {
    ACTIF: 'Actif',
    INACTIF: 'Inactif',
    FIRED: 'Licencié',
    TIMEOFF: 'Congé',
    VACATION: 'Vacances',
    SICK_LEAVE: 'Congé maladie',
  }
  return labels[status]
}

export const getContractTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    CDI: 'CDI',
    CDD: 'CDD',
    TRAINEE: 'Stagiaire',
  }
  return labels[type] || type
}
