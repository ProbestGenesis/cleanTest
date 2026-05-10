'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  PackageCheck,
  Clock,
  Users,
  AlertCircle,
  Truck
} from 'lucide-react'
import clsx from 'clsx'

type Props = {
  pendingDeliveries: number
  overduePayments: number
  totalProviders: number
  averageDeliveryDelay: number
}

export function PurchaseOverview({
  pendingDeliveries,
  overduePayments,
  totalProviders,
  averageDeliveryDelay,
}: Props) {
  const stats = [
    {
      label: 'Livraisons en attente',
      value: pendingDeliveries,
      icon: Truck,
      colorClass: 'text-blue-600',
    },
    {
      label: 'Paiements en retard',
      value: overduePayments,
      icon: AlertCircle,
      colorClass: 'text-red-600',
    },
    {
      label: 'Fournisseurs',
      value: totalProviders,
      icon: Users,
      colorClass: 'text-green-600',
    },
    {
      label: 'Délai de livraison moy.',
      value: `${averageDeliveryDelay.toFixed(1)} j`,
      icon: Clock,
      colorClass: 'text-amber-600',
    },
  ]

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-muted-foreground" />
          Résumé des Achats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full pb-4">
          <div className="flex flex-row gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-4 border rounded-lg min-w-[160px] flex-1 bg-card hover:bg-muted/50 transition-colors cursor-default"
              >
                <stat.icon className={clsx('w-6 h-6 mb-2', stat.colorClass)} />
                <span className="text-sm font-medium text-muted-foreground text-center">
                  {stat.label}
                </span>
                <span className={clsx('text-2xl font-bold mt-1', stat.colorClass)}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
