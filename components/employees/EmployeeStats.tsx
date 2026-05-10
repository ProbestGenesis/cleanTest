'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, TrendingUp, Settings, FolderPlus, Banknote, Plus, BadgeDollarSign, Clock, UserX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ManageAllAccessDialog from './manageAllAccessDialog'
import CreateProjectDialog from './CreateProjectDialog'
import CreatePayrollDialog from './createPayrollDialog'
import ParticularTaskDefineDialog from './particularTaskDefineDialog'
import { authClient } from '@/lib/auth-client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/formatCurrency'
import { WorkerStats } from '@/lib/hooks/useWorkers'
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface EmployeeStatsProps {
  isLoading: boolean
  stats?: WorkerStats
}

const chartConfig = {
  gross: { label: "Salaires Bruts", color: "#3b82f6" },
  social: { label: "Charges Patronales", color: "#f59e0b" },
} satisfies ChartConfig

// Indicator component for consistent styling
const Indicator = ({ icon: Icon, label, value, onClick, variant = 'default' }: {
  icon: any
  label: string
  value: number
  onClick?: () => void
  variant?: 'default' | 'warning' | 'danger'
}) => {
  const colorClasses = {
    default: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200',
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${colorClasses[variant]} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-tight">{label}</span>
      </div>
      <span className="font-bold text-lg">{value}</span>
    </button>
  )
}

export const EmployeeStats = ({ isLoading, stats }: EmployeeStatsProps) => {
  const { data: session } = authClient.useSession()
  const [chargePopoverOpen, setChargePopoverOpen] = React.useState(false)
  const [onLeavePopoverOpen, setOnLeavePopoverOpen] = React.useState(false)
  const [inactivePopoverOpen, setInactivePopoverOpen] = React.useState(false)
  
  const userRole = session?.user?.role
  const workRole = (session?.user as any)?.workRole?.toLowerCase()

  const isSuperAdmin = userRole === 'superadmin'
  const isComptable = workRole === 'comptable'

  if (isLoading) {
    return (
      <div className="space-y-6 mb-8">
        <div className="flex justify-end gap-3 flex-wrap">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const gross = stats?.totalSalary || 0
  const social = stats?.totalContributions || 0
  const chartData = [
    { name: "gross", value: gross, fill: "var(--color-gross)" },
    { name: "social", value: social, fill: "#f59e0b" },
  ]

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'TIMEOFF': 'Congé',
      'VACATION': 'Vacances',
      'INACTIF': 'Inactif',
      'FIRED': 'Licencié'
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Action Buttons Row */}
      <div className="flex justify-end gap-3 flex-wrap">
        {isSuperAdmin && (
          <>
            <ManageAllAccessDialog />
            <CreateProjectDialog />
          </>
        )}
        
        {(isSuperAdmin || isComptable) && (
          <CreatePayrollDialog>
            <Button variant="outline" className="gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Créer un bulletin de paie</span>
            </Button>
          </CreatePayrollDialog>
        )}

        {isSuperAdmin && (
          <ParticularTaskDefineDialog>
            <Button variant="outline" className="gap-2 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tache particulière</span>
            </Button>
          </ParticularTaskDefineDialog>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Charge Sociale Card with Chart */}
        <Popover open={chargePopoverOpen} onOpenChange={setChargePopoverOpen}>
          <div 
            onMouseEnter={() => setChargePopoverOpen(true)}
            onMouseLeave={() => setChargePopoverOpen(false)}
          >
            <PopoverTrigger asChild>
              <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 cursor-help overflow-hidden border-0 bg-white">
                <CardHeader className="flex flex-row justify-between items-center pb-3 px-5 pt-4">
                  <CardTitle className="text-sm font-semibold text-slate-900">Charge sociale</CardTitle>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="flex flex-col p-0 overflow-hidden">
                  <div className="flex-1 w-full min-h-0">
                    <ChartContainer config={chartConfig} className="w-full h-[80px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={16}
                            outerRadius={28}
                            paddingAngle={2}
                            isAnimationActive={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                  <div className="px-5 py-3 space-y-1">
                    <div className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="text-slate-600 font-medium">Charges</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(social)}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center border-t border-slate-100 pt-2 mt-1">
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Total salarial</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(gross + social)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PopoverTrigger>
          </div>
          <PopoverContent 
            className="w-[calc(100vw-2rem)] sm:w-[480px] p-0 shadow-lg" 
            side="bottom" 
            align="start"
            onMouseEnter={() => setChargePopoverOpen(true)}
            onMouseLeave={() => setChargePopoverOpen(false)}
          >
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-semibold text-base text-slate-900">Détails des charges patronales</h3>
              <p className="text-sm text-slate-600">Répartition des charges (31.5%) par travailleur</p>
            </div>
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="text-slate-700 font-semibold">Employé</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">Salaire Brut</TableHead>
                    <TableHead className="text-right text-slate-700 font-semibold">Charge (31.5%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.workerSalaries.map((worker) => (
                    <TableRow key={worker.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <TableCell className="font-medium py-3 text-slate-900">
                        <span>{worker.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-700">
                        {formatCurrency(worker.salary)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-emerald-700">
                        {formatCurrency(worker.socialContributions)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="font-semibold text-slate-900">Total des charges</span>
              <span className="font-bold text-emerald-700 text-lg">
                {formatCurrency(social)}
              </span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Effectiff Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200 border-0 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Effectiff
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-3xl font-bold text-slate-900 mb-4">
              {(stats?.permanents || 0) + (stats?.temporaries || 0) + (stats?.trainees || 0)}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Indicator 
                icon={Users} 
                label="Permanents" 
                value={stats?.permanents || 0}
                variant="default"
              />
              <Indicator 
                icon={Users} 
                label="Stagiaires" 
                value={stats?.trainees || 0}
                variant="default"
              />
              
              <Popover open={onLeavePopoverOpen} onOpenChange={setOnLeavePopoverOpen}>
                <PopoverTrigger asChild>
                  <button onClick={() => setOnLeavePopoverOpen(true)}>
                    <Indicator 
                      icon={Clock} 
                      label="En congé" 
                      value={stats?.onLeave || 0}
                      variant="warning"
                      onClick={() => setOnLeavePopoverOpen(true)}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 shadow-lg">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-slate-900">Employés en congé</h4>
                    <ScrollArea className="h-auto max-h-60">
                      <div className="space-y-2 pr-4">
                        {stats?.onLeaveEmployees?.length ? (
                          stats.onLeaveEmployees.map((emp) => (
                            <div key={emp.id} className="flex items-start gap-2 p-2 rounded bg-amber-50 border border-amber-200">
                              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                                <p className="text-xs text-amber-700">{getStatusLabel(emp.status)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Aucun employé en congé</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={inactivePopoverOpen} onOpenChange={setInactivePopoverOpen}>
                <PopoverTrigger asChild>
                  <button onClick={() => setInactivePopoverOpen(true)}>
                    <Indicator 
                      icon={UserX} 
                      label="Inactifs" 
                      value={stats?.inactive || 0}
                      variant="danger"
                      onClick={() => setInactivePopoverOpen(true)}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 shadow-lg">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-slate-900">Employés inactifs</h4>
                    <ScrollArea className="h-auto max-h-60">
                      <div className="space-y-2 pr-4">
                        {stats?.inactiveEmployees?.length ? (
                          stats.inactiveEmployees.map((emp) => (
                            <div key={emp.id} className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-200">
                              <UserX className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{emp.name}</p>
                                <p className="text-xs text-red-700">{getStatusLabel(emp.status)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Aucun employé inactif</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
