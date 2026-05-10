"use client"

import { useState, useMemo } from "react"
import { format, isSameDay, isAfter, setHours, setMinutes, subDays, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval } from "date-fns"
import { fr } from "date-fns/locale"
import { CheckCircle2, CalendarDays, Moon, Sun, TrendingUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Worker {
    id: string
    name: string
    image?: string | null
    role: string
    banned?: boolean
}

interface WorkerKPIDashboardProps {
    initialRapports: any[]
    workers: Worker[]
}

export default function WorkerKPIDashboard({ initialRapports, workers }: WorkerKPIDashboardProps) {
    // Filters
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>("all")
    const [dateRange, setDateRange] = useState<any>({
        from: subDays(new Date(), 30),
        to: new Date()
    })

    const filteredRapports = useMemo(() => {
        return initialRapports.filter(r => {
            const workerMatch = selectedWorkerId === "all" || r.worker.id === selectedWorkerId
            const date = new Date(r.date)
            const dateMatch = dateRange?.from && dateRange?.to 
                ? isWithinInterval(date, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })
                : true
            return workerMatch && dateMatch
        })
    }, [initialRapports, selectedWorkerId, dateRange])

    // Stats calculation
    const totalReports = filteredRapports.length
    
    const punctualityStats = useMemo(() => {
        return filteredRapports.reduce((acc, r) => {
            const createdAt = new Date(r.createdAt)
            const deadline = r.periode === "MATIN" 
                ? setMinutes(setHours(new Date(r.date), 9), 0)
                : setMinutes(setHours(new Date(r.date), 22), 0)
            const isLate = isAfter(createdAt, deadline)
            if (isLate) acc.late++
            else acc.onTime++
            return acc
        }, { onTime: 0, late: 0 })
    }, [filteredRapports])

    const taskStats = useMemo(() => {
        return filteredRapports.reduce((acc, r) => {
            const tasks = r.tasks || []
            acc.total += tasks.length
            acc.done += tasks.filter((t: any) => t.done).length
            return acc
        }, { total: 0, done: 0 })
    }, [filteredRapports])

    const completionRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0
    const punctualityRate = totalReports > 0 ? Math.round((punctualityStats.onTime / totalReports) * 100) : 0

    // Chart data: Activity by day
    const activityData = useMemo(() => {
        const days = dateRange?.from && dateRange?.to 
            ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
            : []
        
        return days.map(day => {
            const count = filteredRapports.filter(r => isSameDay(new Date(r.date), day)).length
            return {
                date: format(day, "dd MMM", { locale: fr }),
                count
            }
        })
    }, [dateRange, filteredRapports])

    const chartConfig = {
        count: {
            label: "Rapports",
            color: "hsl(var(--primary))",
        },
    } satisfies ChartConfig

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Employé</label>
                    <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                        <SelectTrigger className="w-[200px] bg-muted border-border">
                            <SelectValue placeholder="Tous les employés" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les employés</SelectItem>
                            {workers.map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Intervalle de temps</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal bg-muted border-border", !dateRange && "text-muted-foreground")}>
                                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd MMM yyyy", { locale: fr })} -{" "}
                                            {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd MMM yyyy", { locale: fr })
                                    )
                                ) : (
                                    <span>Sélectionner une période</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range: any) => setDateRange(range)}
                                numberOfMonths={2}
                                locale={fr}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Summary Cards */}
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Total Rapports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{totalReports}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Soumis sur la période</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Ponctualité</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{punctualityRate}%</div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${punctualityRate}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{punctualityStats.onTime} à temps, {punctualityStats.late} en retard</p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Tâches Réalisées</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{completionRate}%</div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${completionRate}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{taskStats.done} terminées sur {taskStats.total}</p>
                    </CardContent>
                </Card>

                {/* Activity Chart */}
                <Card className="md:col-span-3 border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Tendance de l'activité
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Nombre de rapports soumis par jour</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <BarChart data={activityData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis 
                                    dataKey="date" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={10}
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                />
                                <YAxis hide />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar 
                                    dataKey="count" 
                                    fill="var(--color-count)" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={30}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
