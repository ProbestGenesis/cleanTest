'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Printer, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface Team {
  id: string
  name: string
  chefId: string
  chef: {
    name: string
    role: string
  }
  workerList: any[]
  createdAt: string
}

export const EquipeTab = () => {
  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to fetch teams')
      const data = await response.json()
      return data.data as Team[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">ORGANIGRAMME</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Équipe
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">ORGANIGRAMME</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des équipes. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const createdDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ORGANIGRAMME</h1>
          <p className="text-sm text-gray-600 mt-1">Gérez et visualisez la structure de vos équipes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Équipe
          </Button>
        </div>
      </div>

      {!teams || teams.length === 0 ? (
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune équipe trouvée</h3>
          <p className="text-gray-500 mb-4">
            Créez une nouvelle équipe pour commencer.
          </p>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Équipe
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{team.name || 'Équipe sans nom'}</CardTitle>
                    <CardDescription className="mt-2">
                      Chef: {team.chef.name}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <span className="text-lg">⋮</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Affichage des membres avec avatars circulaires */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Chef d'équipe */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white text-xs font-bold">
                      {team.chef.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="text-xs text-center font-medium text-gray-700">
                      {team.chef.name.split(' ')[0]}
                    </span>
                  </div>
                  
                  {/* Autres membres */}
                  {team.workerList && team.workerList.slice(0, 3).map((worker, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 text-xs font-bold">
                        {typeof worker === 'string' 
                          ? worker.slice(0, 2).toUpperCase() 
                          : (worker.name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    </div>
                  ))}
                  {team.workerList && team.workerList.length > 3 && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-bold border border-gray-300">
                        +{team.workerList.length - 3}
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Rôle: </span>
                    <span className="font-medium">{team.chef.role}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Créée le: </span>
                    <span className="font-medium">
                      {new Date(team.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Les rapports
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Plus d'info
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
