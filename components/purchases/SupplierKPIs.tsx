'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, Award, ShoppingBag, Truck, Calendar } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SupplierKPIs() {
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all')

  const { data: providers, isLoading: providersLoading } = useQuery({
      queryKey: ['providers'],
      queryFn: async () => {
          const res = await fetch('/api/providers')
          if (!res.ok) throw new Error('Failed to fetch providers')
          return res.json()
      }
  })

  const { data: kpis, isLoading: kpisLoading } = useQuery({
      queryKey: ['provider-kpis', selectedProviderId],
      queryFn: async () => {
          const url = selectedProviderId === 'all'
            ? '/api/purchases/stats' // We might need to create this or handle 'all' in kpis route
            : `/api/providers/${selectedProviderId}/kpis`
          const res = await fetch(url)
          if (!res.ok) return null
          return res.json()
      },
      enabled: !!selectedProviderId
  })

  if (providersLoading) return <Skeleton className="h-96 w-full rounded-xl" />

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-card p-4 border rounded-xl shadow-sm">
          <h2 className="text-xl font-bold">Performance Fournisseurs</h2>
          <div className="w-64">
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                  <SelectTrigger className="rounded-full">
                      <SelectValue placeholder="Choisir un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Tous les fournisseurs</SelectItem>
                      {providers?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Dépensé"
          value={kpis?.totalSpent ? `${kpis.totalSpent.toLocaleString()} XOF` : '0 XOF'}
          icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          description="Volume total d'achats"
          loading={kpisLoading}
        />
        <MetricCard
          title="Nombre d'achats"
          value={kpis?.totalPurchases || 0}
          icon={<ShoppingBag className="w-4 h-4 text-blue-600" />}
          description="Total des commandes passées"
          loading={kpisLoading}
        />
        <MetricCard
          title="Délai Moyen"
          value={kpis?.averageDeliveryDelay ? `${kpis.averageDeliveryDelay.toFixed(1)} j` : '—'}
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          description="Temps de livraison moyen"
          loading={kpisLoading}
        />
        <MetricCard
          title="Commandes à Venir"
          value={kpis?.pendingCount || 0}
          icon={<Calendar className="w-4 h-4 text-red-600" />}
          description="Achats en attente de livraison"
          loading={kpisLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-center">Répartition des dépenses (simulation)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendDataSimulation}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const spendDataSimulation = [
    { name: 'Jan', total: 4000 },
    { name: 'Feb', total: 3000 },
    { name: 'Mar', total: 5000 },
    { name: 'Apr', total: 2780 },
    { name: 'May', total: 1890 },
    { name: 'Jun', total: 2390 },
]

function MetricCard({ title, value, icon, description, loading }: any) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ) : (
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                            <h4 className="text-2xl font-bold">{value}</h4>
                            <p className="text-[10px] text-muted-foreground">{description}</p>
                        </div>
                        <div className="p-2 bg-muted rounded-full">
                            {icon}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
