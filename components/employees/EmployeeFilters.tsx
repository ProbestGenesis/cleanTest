'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Search } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { EmployeesList } from './EmployeesList'
import { StagiairesTab } from './tabs/StagiairesTab'
import { EquipeTab } from './tabs/EquipeTab'
import { ActiviteTab } from './tabs/ActiviteTab'
import { RapportTab } from './tabs/RapportTab'

interface EmployeeFiltersProps {
  onAddEmployee?: () => void
}

export const EmployeeFilters = ({ onAddEmployee }: EmployeeFiltersProps) => {
  const [activeTab, setActiveTab] = useState('employes')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  return (
    <div className="space-y-6">
      {/* Tabs pour naviguer entre les sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="employes">Employés</TabsTrigger>
            <TabsTrigger value="stagiaires">Stagiaires</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="prestataires">Prestataires</TabsTrigger>
            <TabsTrigger value="activites">Activités</TabsTrigger>
            <TabsTrigger value="rapports">Rapports</TabsTrigger>
          </TabsList>
          <Button
            onClick={onAddEmployee}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full gap-2"
          >
            <Plus className="h-5 w-5" />
            Ajouter un employé
          </Button>
        </div>

        {/* Contenu des onglets */}
        <div className="mt-6">
          {/* Employés Tab */}
          <TabsContent value="employes" className="m-0 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">La liste des employés</h1>
            </div>

            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            <EmployeesList status="all" search={debouncedSearch} />
          </TabsContent>

          {/* Stagiaires Tab */}
          <TabsContent value="stagiaires" className="m-0">
            <StagiairesTab search={debouncedSearch} />
          </TabsContent>

          {/* Equipe Tab */}
          <TabsContent value="equipe" className="m-0">
            <EquipeTab />
          </TabsContent>

          {/* Prestataires Tab */}
          <TabsContent value="prestataires" className="m-0">
            <div className="text-center py-12 text-gray-500">
              Prestataires tab - À implémenter
            </div>
          </TabsContent>

          {/* Activités Tab */}
          <TabsContent value="activites" className="m-0">
            <ActiviteTab />
          </TabsContent>

          {/* Rapports Tab */}
          <TabsContent value="rapports" className="m-0">
            <RapportTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
