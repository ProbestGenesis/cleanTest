'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartPieLabel } from '@/components/ui/chart-pie-label'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import clsx from 'clsx'
import {
  ArrowBigDownDash,
  CirclePile,
  Grid2X2Check,
  OctagonXIcon,
  PackageSearch,
} from 'lucide-react'
import { useQueryState } from 'nuqs'

type Props = {
  totalProducts: number
  inStockProducts: number
  outOfStockProducts: number
  lowerInStock: number
  categoryData?: {
    inStock: { category: string; count: number }[]
    outOfStock: { category: string; count: number }[]
    lowerInStock: { category: string; count: number }[]
  }
}

function StockCountCards({
  totalProducts,
  inStockProducts,
  outOfStockProducts,
  lowerInStock,
  categoryData,
}: Props) {
  const [option, setOption] = useQueryState('option')

  const stats = [
    {
      label: 'Total des articles',
      value: totalProducts,
      option: 'stockTotal',
      icon: CirclePile,
      colorClass: 'text-accent',
    },
    {
      label: 'Au dessus du seuil',
      value: inStockProducts,
      option: 'inStock',
      icon: Grid2X2Check,
      colorClass: 'text-success',
    },
    {
      label: 'Rupture Stock',
      value: outOfStockProducts,
      option: 'outOfStock',
      icon: OctagonXIcon,
      colorClass: 'text-destructive',
    },
    {
      label: 'En dessous du seuil',
      value: lowerInStock,
      option: 'underThreshold',
      icon: ArrowBigDownDash,
      colorClass: 'text-warning',
    },
  ]

  return (
    <div className="w-full">
      <div className="flex flex-col xl:flex-row gap-4 w-full pb-2 py-2 px-2">
        <Card className="flex-1 w-full flex flex-col">
          <CardHeader className="flex flex-row justify-between items-center gap-2 pb-2">
            <CardTitle className="text-xl">Résumé du stock</CardTitle>
            <PackageSearch className="w-6 h-6 text-muted-foreground" />
          </CardHeader>

          <CardContent className="flex-1 flex items-center py-0 overflow-hidden">
            <ScrollArea className="w-full pb-2">
              <div className="flex flex-row flex-nowrap gap-3 w-full pb-2">
                {stats.map((item, index) => {
                  const isSelected = option === item.option
                  return (
                    <div
                      key={index}
                      className={clsx(
                        'flex flex-col items-center justify-center p-2 border rounded-md cursor-pointer transition-all hover:bg-muted/50 min-w-[140px] flex-1',
                        isSelected ? 'ring-2 ring-primary/50 bg-muted' : 'bg-card'
                      )}
                      onClick={() => setOption(item.option)}
                    >
                      <item.icon className={clsx('w-5 h-5 mb-1.5', item.colorClass)} />
                      <span className="text-xs font-medium text-center line-clamp-1">
                        {item.label}
                      </span>
                      <span
                        className={clsx('font-bold text-lg lg:text-xl mt-0.5', item.colorClass)}
                      >
                        {item.value}
                      </span>
                    </div>
                  )
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <ChartPieLabel
          inStockProducts={inStockProducts}
          outOfStockProducts={outOfStockProducts}
          lowerInStock={lowerInStock}
          categoryData={categoryData}
        />
      </div>
    </div>
  )
}

export default StockCountCards
