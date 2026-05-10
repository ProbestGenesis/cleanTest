"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  TrendingUp,
  Banknote,
  Plus,
  Clock,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import ManageAllAccessDialog from "./manageAllAccessDialog"
import CreateProjectDialog from "./CreateProjectDialog"
import CreatePayrollDialog from "./createPayrollDialog"
import ParticularTaskDefineDialog from "./particularTaskDefineDialog"
import { authClient } from "@/lib/auth-client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency } from "@/lib/formatCurrency"
import { WorkerStats } from "@/lib/hooks/useWorkers"
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface EmployeeStatsProps {
  isLoading: boolean
  stats?: WorkerStats
}

const chartConfig = {
  employeeGross: { label: "Salaires employés", color: "#2563eb" },
  traineeGross: { label: "Salaires stagiaires", color: "#7c3aed" },
  social: { label: "Charges patronales", color: "#d97706" },
} satisfies ChartConfig

// Indicator component for consistent styling
const Indicator = ({
  icon: Icon,
  label,
  value,
  onClick,
  variant = "default",
}: {
  icon: LucideIcon
  label: string
  value: number
  onClick?: () => void
  variant?: "default" | "warning" | "danger"
}) => {
  const colorClasses = {
    default: "border-border bg-muted/50 text-foreground hover:bg-muted",
    warning:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
    danger:
      "border-red-500/40 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300",
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-colors ${colorClasses[variant]} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium tracking-tight uppercase">
          {label}
        </span>
      </div>
      <span className="text-lg font-bold">{value}</span>
    </button>
  )
}

export const EmployeeStats = ({ isLoading, stats }: EmployeeStatsProps) => {
  const { data: session } = authClient.useSession()
  const [chargePopoverOpen, setChargePopoverOpen] = React.useState(false)
  const [onLeavePopoverOpen, setOnLeavePopoverOpen] = React.useState(false)
  const [inactivePopoverOpen, setInactivePopoverOpen] = React.useState(false)

  const userRole = session?.user?.role
  const workRole = (
    session?.user as { workRole?: string | null } | undefined
  )?.workRole?.toLowerCase()

  const isSuperAdmin = userRole === "superadmin"
  const isComptable = workRole === "comptable"

  if (isLoading) {
    return (
      <div className="mb-8 space-y-6">
        <div className="flex flex-wrap justify-end gap-3">
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
  const traineeGross = stats?.totalTraineeSalary || 0
  const employeeGross = Math.max(gross - traineeGross, 0)
  const social = stats?.totalContributions || 0
  const chartData = [
    {
      name: "employeeGross",
      value: employeeGross,
      fill: "var(--color-employeeGross)",
    },
    {
      name: "traineeGross",
      value: traineeGross,
      fill: "var(--color-traineeGross)",
    },
    { name: "social", value: social, fill: "var(--color-social)" },
  ]

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      TIMEOFF: "Congé",
      VACATION: "Vacances",
      SICK_LEAVE: "Congé maladie",
      INACTIF: "Inactif",
      FIRED: "Licencié",
    }
    return labels[status] || status
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap justify-end gap-3">
        {isSuperAdmin && (
          <>
            <ManageAllAccessDialog />
            <CreateProjectDialog />
          </>
        )}

        {(isSuperAdmin || isComptable) && (
          <CreatePayrollDialog>
            <Button
              variant="outline"
              className="gap-2 rounded-lg shadow-sm transition-shadow hover:shadow-md"
            >
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">
                Créer un bulletin de paie
              </span>
            </Button>
          </CreatePayrollDialog>
        )}

        {isSuperAdmin && (
          <ParticularTaskDefineDialog>
            <Button
              variant="outline"
              className="gap-2 rounded-lg shadow-sm transition-shadow hover:shadow-md"
            >
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
              <Card className="cursor-help overflow-hidden border bg-card text-card-foreground shadow-md transition-shadow duration-200 hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between px-5 pt-4 pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Charge sociale
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent className="flex flex-col overflow-hidden p-0">
                  <div className="min-h-0 w-full flex-1">
                    <ChartContainer
                      config={chartConfig}
                      className="h-20 w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        >
                          <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                          />
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
                  <div className="space-y-1.5 px-5 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        <span className="font-medium text-muted-foreground">
                          Salaires employés
                        </span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(employeeGross)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-violet-600" />
                        <span className="font-medium text-muted-foreground">
                          Salaires stagiaires
                        </span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(traineeGross)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-amber-600" />
                        <span className="font-medium text-muted-foreground">
                          Charges patronales
                        </span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(social)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className="font-semibold tracking-wider text-muted-foreground uppercase">
                        Total salarial
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(gross + social)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PopoverTrigger>
          </div>
          <PopoverContent
            className="w-[calc(100vw-2rem)] bg-popover p-0 text-popover-foreground shadow-lg sm:w-120"
            side="bottom"
            align="start"
            onMouseEnter={() => setChargePopoverOpen(true)}
            onMouseLeave={() => setChargePopoverOpen(false)}
          >
            <div className="border-b bg-muted/50 p-4">
              <h3 className="text-base font-semibold text-foreground">
                Détails des charges patronales
              </h3>
              <p className="text-sm text-muted-foreground">
                Répartition des charges (31.5%) par travailleur
              </p>
            </div>
            <ScrollArea className="h-87.5">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground">
                      Employé
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Salaire Brut
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Charge (31.5%)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.workerSalaries.map((worker) => (
                    <TableRow
                      key={worker.id}
                      className="border-b border-border transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="py-3 font-medium text-foreground">
                        <span>{worker.name}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
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
            <div className="flex items-center justify-between border-t border-border bg-muted/50 p-4">
              <span className="font-semibold text-foreground">
                Total des charges
              </span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(social)}
              </span>
            </div>
          </PopoverContent>
        </Popover>

        {/* Effectiff Card */}
        <Card className="border bg-card text-card-foreground shadow-md transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between px-5 pt-4 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Effectif
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="mb-4 text-3xl font-bold text-foreground">
              {(stats?.permanents || 0) +
                (stats?.temporaries || 0) +
                (stats?.trainees || 0)}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <Indicator
                icon={Users}
                label="Permanents"
                value={stats?.permanents || 0}
                variant="default"
              />
              <Indicator
                icon={Users}
                label="CDD"
                value={stats?.temporaries || 0}
                variant="default"
              />
              <Indicator
                icon={Users}
                label="Stagiaires"
                value={stats?.trainees || 0}
                variant="default"
              />

              <Popover
                open={onLeavePopoverOpen}
                onOpenChange={setOnLeavePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Indicator
                    icon={Clock}
                    label="En congé"
                    value={stats?.onLeave || 0}
                    variant="warning"
                    onClick={() => setOnLeavePopoverOpen(true)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover p-3 text-popover-foreground shadow-lg">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Employés en congé
                    </h4>
                    <ScrollArea className="h-auto max-h-60">
                      <div className="space-y-2 pr-4">
                        {stats?.onLeaveEmployees?.length ? (
                          stats.onLeaveEmployees.map((emp) => (
                            <div
                              key={emp.id}
                              className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2"
                            >
                              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {emp.name}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  {getStatusLabel(emp.status)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Aucun employé en congé
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover
                open={inactivePopoverOpen}
                onOpenChange={setInactivePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Indicator
                    icon={UserX}
                    label="Inactifs"
                    value={stats?.inactive || 0}
                    variant="danger"
                    onClick={() => setInactivePopoverOpen(true)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-popover p-3 text-popover-foreground shadow-lg">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Employés inactifs
                    </h4>
                    <ScrollArea className="h-auto max-h-60">
                      <div className="space-y-2 pr-4">
                        {stats?.inactiveEmployees?.length ? (
                          stats.inactiveEmployees.map((emp) => (
                            <div
                              key={emp.id}
                              className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2"
                            >
                              <UserX className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-300" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {emp.name}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300">
                                  {getStatusLabel(emp.status)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Aucun employé inactif
                          </p>
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
