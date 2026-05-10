'use client'

import React from 'react'
import { useWorkers } from '@/lib/hooks/useWorkers'
import { EmployeeCard } from './EmployeeCard'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmployeesListProps {
  status: string
  search: string
}

export const EmployeesList = ({ status, search }: EmployeesListProps) => {
  const { data: workers, isLoading, error } = useWorkers({ status, search })

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des employés. Veuillez réessayer.
        </AlertDescription>
      </Alert>
    )
  }

  if (!workers || workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 12H9m4 5H9m6-9h.01M15 20H9a6 6 0 0012 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
        <p className="text-gray-500">
          Ajustez vos filtres ou créez un nouvel employé pour commencer.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {workers.map((worker) => (
        <EmployeeCard key={worker.id} worker={worker} />
      ))}
    </div>
  )
}
