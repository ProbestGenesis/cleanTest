'use client'

import React, { useState } from 'react'
import { useWorkerStats } from '@/lib/hooks/useWorkers'
import { EmployeeStats } from './EmployeeStats'
import { EmployeeFilters } from './EmployeeFilters'
import AddWorkerDialog, { TypeDialog } from './addWorkerDialog'

export const EmployeesPage = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: stats, isLoading: statsLoading } = useWorkerStats()

  return (
    <div className="min-h-screen ">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats */}
        <EmployeeStats isLoading={statsLoading} stats={stats} />

        {/* Filtres et liste */}
        <EmployeeFilters onAddEmployee={() => setIsAddDialogOpen(true)} />
      </div>

      {/* Dialog pour ajouter un employé */}
      <AddWorkerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        type={TypeDialog.create}
      />
    </div>
  )
}
