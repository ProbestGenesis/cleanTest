'use client'

import React, { useState } from 'react'
import { PurchaseOverview } from './PurchaseOverview'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PurchaseList } from './PurchaseList'
import { CreatePurchaseForm } from './forms/CreatePurchaseForm'
import { PurchaseDetail } from './PurchaseDetail'
import { SupplierKPIs } from './SupplierKPIs'
import { useQueryState } from 'nuqs'

type Props = {
  initialStats: {
    pendingDeliveriesCount: number
    overduePayments: number
    totalProviders: number
    averageDeliveryDelay: number
  }
}

export function PurchasePageClient({ initialStats }: Props) {
  const [tab, setTab] = useQueryState('tab', { defaultValue: 'list' })
  const [selectedId, setSelectedId] = useQueryState('id', { defaultValue: '' })

  const handleSelectPurchase = (id: string) => {
      setSelectedId(id)
      setTab('details')
  }

  return (
    <div className="p-4 flex flex-col space-y-6">
      <PurchaseOverview
        pendingDeliveries={initialStats.pendingDeliveriesCount}
        overduePayments={initialStats.overduePayments}
        totalProviders={initialStats.totalProviders}
        averageDeliveryDelay={initialStats.averageDeliveryDelay}
      />

      <div className="flex-1 min-h-[600px] flex flex-col">
        <Tabs value={tab || 'list'} onValueChange={setTab} className="w-full flex-1 flex flex-col">
          <div className="flex-1 pb-20">
            <TabsContent value="list" className="mt-0">
               <PurchaseList onSelect={handleSelectPurchase} />
            </TabsContent>
            <TabsContent value="details">
               {selectedId ? (
                   <PurchaseDetail
                     purchaseId={selectedId}
                     onBack={() => {
                         setTab('list')
                         setSelectedId('')
                     }}
                   />
               ) : (
                   <div className="p-8 text-center border rounded-xl bg-card text-muted-foreground">
                       Sélectionnez un achat dans la liste pour voir les détails
                   </div>
               )}
            </TabsContent>
            <TabsContent value="form">
               <CreatePurchaseForm onSuccess={() => setTab('list')} />
            </TabsContent>
            <TabsContent value="kpis">
               <SupplierKPIs />
            </TabsContent>
          </div>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-md shadow-lg border rounded-full px-2 py-1 z-50">
            <TabsList className="bg-transparent border-none h-12">
              <TabsTrigger value="list" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inventaire</TabsTrigger>
              <TabsTrigger value="details" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Détails</TabsTrigger>
              <TabsTrigger value="form" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Nouveau</TabsTrigger>
              <TabsTrigger value="kpis" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fournisseurs</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
