'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'

interface TaskData {
  id: string
  body: string
  done: boolean
  progress: number
  deadline?: string
  deadLineDate?: string
  worker: {
    id: string
    name: string
  }
}

export const ActiviteTab = () => {
  const [activeTaskTab, setActiveTaskTab] = useState('assigned')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: assignedTasks, isLoading: assignedLoading } = useQuery({
    queryKey: ['tasks', 'assigned', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      return data.data as TaskData[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const { data: inProgressTasks, isLoading: inProgressLoading } = useQuery({
    queryKey: ['tasks', 'in-progress', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('status', 'in-progress')
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)
      
      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      return data.data as TaskData[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const isLoading = assignedLoading || inProgressLoading

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Tâches assignées</h1>

      {/* Filtres par date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tâches assignées</CardTitle>
          <CardDescription>0 tâche en attente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">DATE DE CRÉATION</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                  placeholder="jj/mm/aaaa"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">DATE D'ÉCHÉANCE</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                  placeholder="jj/mm/aaaa"
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {assignedTasks?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {inProgressTasks?.length || 0}
              </div>
              <div className="text-xs text-gray-600">En cours</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {assignedTasks ? Math.round(((assignedTasks.filter(t => t.done).length) / assignedTasks.length) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-600">Moy.</div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : !assignedTasks || assignedTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune tâche trouvée pour ces critères
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>Aucune tâche trouvée pour ces critères</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tâches en cours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tâches en cours</CardTitle>
          <CardDescription>Gérez vos tâches liées à des rapports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">DATE DE CRÉATION</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="date"
                  className="pl-10"
                  placeholder="jj/mm/aaaa"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">DATE D'ÉCHÉANCE</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="date"
                  className="pl-10"
                  placeholder="jj/mm/aaaa"
                />
              </div>
            </div>
          </div>

          {inProgressLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : !inProgressTasks || inProgressTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Aucune tâche trouvée pour ces critères</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.body}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Assigné à: <span className="font-medium">{task.worker.name}</span>
                      </p>
                    </div>
                    <Badge variant="outline">Facile</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Progress value={task.progress} className="flex-1" />
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
