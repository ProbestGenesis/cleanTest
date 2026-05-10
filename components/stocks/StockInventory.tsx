import { DEFAULT_STOCK_LIMIT, getStockQueryResponse, type StockQueryResponse } from '@/lib/actions/stock/query/query'
import InventoryTable from './inventoryTable'

type Props = {
  totalProducts: number
  initialQuery?: {
    page?: string
    search?: string
    option?: string
    category?: string
  }
}

export default async function StockInventory({ totalProducts, initialQuery }: Props) {
  const currentPage = Number(initialQuery?.page ?? '1')
  const search = initialQuery?.search
  const option = initialQuery?.option
  const category = initialQuery?.category

  const fallbackData: StockQueryResponse = await getStockQueryResponse({
    page: currentPage,
    limit: DEFAULT_STOCK_LIMIT,
    search,
    option,
    category,
  })

  if (fallbackData.data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">Aucun produit en base de stock.</div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <InventoryTable
        fallbackData={fallbackData}
        totalProducts={totalProducts}
        initialCategory={category && category !== 'all' ? category : 'all'}
      />
    </div>
  )
}
