'use client'

import React from 'react'
import StockCountCards from './stockCountCards'
import { Skeleton } from '@/components/ui/skeleton'
import { useStockSummary } from '@/lib/hooks/useStock'

export function StockPageClient({
  tabsSlot,
}: {
  tabsSlot: React.ReactNode
}) {
  const { data, isLoading } = useStockSummary()

  return (
    <div className="p-2 sm:p-4 flex flex-col space-y-4 min-w-0">
      {isLoading && !data ? (
        <div className="flex flex-col space-y-4 animate-pulse">
           <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      ) : data ? (
        <StockCountCards
          totalProducts={data.totalProducts}
          inStockProducts={data.inStockProducts}
          outOfStockProducts={data.outOfStockProducts}
          lowerInStock={data.lowerInStock}
          categoryData={data.categoryData}
        />
      ) : null}

      {tabsSlot}
    </div>
  )
}
