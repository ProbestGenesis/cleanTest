'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, User } from 'lucide-react'
import { useWorkers } from '@/lib/hooks/useWorkers'
import { cn } from '@/lib/utils'
import WorkerKPIDashboard from '../WorkerKPIDashboard'
import { 
  startOfWeek, 
  addDays, 
  format, 
  isAfter, 
  isSameDay, 
  setHours, 
  setMinutes 
} from 'date-fns'
import { fr } from 'date-fns/locale'

interface RapportItem {
  id: string
  title: string
  date: string
  worker: {
    id: string
    name: string
  }
  status: 'SOIR' | 'MATIN' | 'PENDING'
  progress: number
  tasks: {
    id: string
    body: string
    done: boolean
  }[]
}

export const RapportTab = () => {
  const [activeReportTab, setActiveReportTab] = useState('weekly')
  const { data: workers = [] } = useWorkers()

  const { data: rapports, isLoading } = useQuery({
    queryKey: ['rapports', activeReportTab],
    queryFn: async () => {
      const response = await fetch(`/api/rapports?type=${activeReportTab}`)
      if (!response.ok) throw new Error('Failed to fetch rapports')
      const data = await response.json()
      return data.data as RapportItem[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const startOfCurrentWeek = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), [])

  // Optimized lookup map for rapports: O(1) access during grid rendering
  const reportsMap = useMemo(() => {
    const map = new Map<string, RapportItem>()
    rapports?.forEach((r) => {
      const dateKey = format(new Date(r.date), 'yyyy-MM-dd')
      const key = `${r.worker.id}-${dateKey}-${r.status}`
      map.set(key, r)
    })
    return map
  }, [rapports])

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: fr })
  }

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm', { locale: fr })
  }

  const getStatus = (
    workerId: string,
    dayOffset: number,
    period: 'MATIN' | 'SOIR',
    workerStatus?: string
  ) => {
    const targetDate = addDays(startOfCurrentWeek, dayOffset)
    const dateKey = format(targetDate, 'yyyy-MM-dd')
    const now = new Date()

    const report = reportsMap.get(`${workerId}-${dateKey}-${period}`)

    if (report) {
      const createdAt = new Date(report.date)
      // Deadlines: Matin 09:00, Soir 22:00 (as per project standards)
      const deadline = period === 'MATIN' 
        ? setMinutes(setHours(new Date(report.date), 9), 0)
        : setMinutes(setHours(new Date(report.date), 22), 0)

      return isAfter(createdAt, deadline) ? 'LATE' : 'OK'
    }

    // No report found - check if it's considered absent or pending
    const deadlineForCheck = period === 'MATIN'
      ? setMinutes(setHours(targetDate, 9), 0)
      : setMinutes(setHours(targetDate, 22), 0)

    if (isAfter(now, deadlineForCheck)) {
      if (workerStatus && ['TIMEOFF', 'VACATION', 'SICK_LEAVE'].includes(workerStatus)) {
        return 'OFF'
      }
      return 'ABSENT'
    }

    return 'PENDING'
  }

  const renderGridCell = (
    workerId: string,
    dayOffset: number,
    period: 'MATIN' | 'SOIR',
    workerStatus?: string
  ) => {
    const status = getStatus(workerId, dayOffset, period, workerStatus)
    const colors = {
      OK: 'bg-green-500',
      LATE: 'bg-orange-500',
      ABSENT: 'bg-red-500',
      PENDING: 'bg-muted',
      OFF: 'bg-background border-2 border-muted',
    }

    return (
      <div 
        className={cn(
          "w-1/2 h-full border-r border-border last:border-r-0 transition-colors duration-200",
          colors[status as keyof typeof colors]
        )}
        title={`${period} - ${status}`}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Rapports de la semaine</h1>

      {/* Tabs pour les différents types de rapports */}
      <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="w-full">
        <TabsList className="w-full justify-start gap-0 h-auto rounded-none border-b bg-transparent p-0 border-border">
          <TabsTrigger
            value="weekly"
            className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground"
          >
            Rapports de la semaine
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground"
          >
            Résumé Hebdomadaire
          </TabsTrigger>
          <TabsTrigger
            value="kpi"
            className="rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground"
          >
            KPI Performance
          </TabsTrigger>
        </TabsList>

        {/* Weekly Reports Tab */}
        <TabsContent value="weekly" className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">TRAVAILLEUR</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">RAPPORT</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">PÉRIODE</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">SOUMIS LE</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">TÂCHES</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">PROGRESSION</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-4 px-4">
                        <Skeleton className="h-8 rounded" />
                      </td>
                    </tr>
                  ))
                ) : !rapports || rapports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground italic">
                      Aucun rapport trouvé
                    </td>
                  </tr>
                ) : (
                  rapports.map((rapport) => (
                    <tr key={rapport.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted border border-border text-xs font-bold text-foreground">
                            {rapport.worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="font-semibold text-foreground">{rapport.worker.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">Rapport du {formatDate(rapport.date)}</span>
                          <span className="text-xs text-muted-foreground italic">{rapport.title}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          variant={rapport.status === 'SOIR' ? 'default' : 'secondary'}
                          className="font-bold rounded-full px-2.5 py-0.5"
                        >
                          {rapport.status === 'SOIR' ? 'SOIR' : 'MATIN'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground font-medium">{formatDate(rapport.date)}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(rapport.date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          {rapport.tasks.slice(0, 2).map((task) => (
                            <div key={task.id} className="flex items-start gap-2">
                              <CheckCircle2
                                className={cn(
                                  "h-4 w-4 mt-0.5 shrink-0",
                                  task.done ? 'text-primary' : 'text-muted-foreground/30'
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[11px] leading-tight",
                                  task.done ? 'line-through text-muted-foreground' : 'text-foreground'
                                )}
                              >
                                {task.body}
                              </span>
                            </div>
                          ))}
                          {rapport.tasks.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-medium pl-6">
                              +{rapport.tasks.length - 2} autre(s) tâche(s)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-24 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-primary">
                              {rapport.progress}%
                            </span>
                          </div>
                          <Progress value={rapport.progress} className="h-1.5" />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                        >
                          <Checkbox className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <div className="border border-border bg-card shadow-sm overflow-x-auto rounded-xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="p-4 text-left text-[11px] font-bold text-muted-foreground uppercase border-r border-border min-w-[200px]">
                    Nom & Prénoms
                  </th>
                  {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map((day, idx) => (
                    <th
                      key={day}
                      colSpan={2}
                      className="p-2 text-center text-[11px] font-bold text-muted-foreground uppercase border-r border-border last:border-r-0"
                    >
                      {day}
                      <div className="flex justify-around mt-1 font-normal text-[10px] border-t border-border/50 pt-1">
                        <span className="w-1/2 border-r border-border/50">M</span>
                        <span className="w-1/2">S</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {workers.map((worker) => {
                  const isBanned = worker.workAccount?.banned;
                  return (
                    <tr
                      key={worker.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-4 text-sm font-medium border-r border-border">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-foreground",
                            isBanned && "text-muted-foreground/50 line-through"
                          )}>
                            {worker.name}
                          </span>
                          {isBanned && (
                            <span className="text-[9px] text-destructive font-bold uppercase leading-none mt-0.5">
                              Mis à pied
                            </span>
                          )}
                        </div>
                      </td>
                      {[0, 1, 2, 3, 4].map((offset) => (
                        <td
                          key={offset}
                          colSpan={2}
                          className="p-0 border-r border-border last:border-r-0"
                        >
                          <div className="flex w-full h-8">
                            {renderGridCell(worker.id, offset, 'MATIN', worker.status)}
                            {renderGridCell(worker.id, offset, 'SOIR', worker.status)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="p-4 flex flex-wrap gap-6 text-[11px] font-semibold text-muted-foreground bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-green-500 rounded-sm shadow-sm"></div> À temps
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-orange-500 rounded-sm shadow-sm"></div> En retard
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-red-500 rounded-sm shadow-sm"></div> Absent
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-background border border-border rounded-sm shadow-sm"></div> En congé
              </div>
            </div>
          </div>
        </TabsContent>

        {/* KPI Tab */}
        <TabsContent value="kpi" className="mt-6">
          <WorkerKPIDashboard initialRapports={rapports || []} workers={workers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

