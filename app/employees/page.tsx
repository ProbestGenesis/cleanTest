import React from 'react'
import { EmployeesPage } from '@/components/employees/EmployeesPage'

export const metadata = {
  title: 'Employés',
  description: 'Gestion des employés et liste des travailleurs',
}

export default function Page() {
  return <EmployeesPage />
}
