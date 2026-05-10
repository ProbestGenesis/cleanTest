import AddProductBtn from "@/components/stocks/addProductBtn"
import StockHistory from '@/components/stocks/StockHistory'
import StockInventory from '@/components/stocks/StockInventory'
import StockOutBtn from '@/components/stocks/stockOutBtn'
import StockCodeValidationTrigger from '@/components/stocks/stockCodeValidationTrigger'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suspense } from 'react'

type Props = {
  totalProducts: number
  searchParams?: { [key: string]: string | string[] | undefined }
  pendingHistoryValidationsCount?: number
}

function toSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

async function StockTabs({ totalProducts, searchParams, pendingHistoryValidationsCount = 0 }: Props) {
  const validationParam = typeof searchParams?.his_val === 'string' ? searchParams.his_val : 'all'
  const validationFilter =
    validationParam === 'validated' || validationParam === 'not_validated' ? validationParam : 'all'

  const initialInventoryQuery = {
    page: toSingleParam(searchParams?.inv_page),
    search: toSingleParam(searchParams?.inv_search),
    option: toSingleParam(searchParams?.inv_opt),
    category: toSingleParam(searchParams?.inv_cat),
  }

  return (
    <div className="flex flex-col space-y-4 relative w-full">
      <Tabs defaultValue="inventory" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto justify-start overflow-x-auto flex-nowrap h-auto scrollbar-hide bg-muted/50 p-1">
          <TabsTrigger value="inventory">Inventaire</TabsTrigger>
          <TabsTrigger value="history" className="relative">
            Historique
            {pendingHistoryValidationsCount > 0 && (
              <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white">
                {pendingHistoryValidationsCount}
              </span>
            )}
          </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-row flex-wrap items-center gap-2.5">
            <StockCodeValidationTrigger />
            <StockOutBtn />
            <AddProductBtn />
          </div>
        </div>
        <TabsContent value="inventory" className="px-2 flex flex-col space-y-4">
          <h3 className="font-bold text-lg">Gestion de l&apos;inventaire</h3>
          <Suspense
            fallback={
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} className="w-full h-12" />
                ))}
              </div>
            }
          >
            <StockInventory totalProducts={totalProducts} initialQuery={initialInventoryQuery} />
          </Suspense>
        </TabsContent>
        <TabsContent value="history" className="px-2">
          <h3 className="font-bold text-lg">Historique des modifications</h3>
          <Suspense
            fallback={
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={idx} className="w-full h-12" />
                ))}
              </div>
            }
          >
            <StockHistory
              validationFilter={validationFilter}
              initialQuery={{
                page: toSingleParam(searchParams?.his_page),
                type: toSingleParam(searchParams?.his_type),
                validation: toSingleParam(searchParams?.his_val),
              }}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default StockTabs
