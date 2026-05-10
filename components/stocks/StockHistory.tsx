import HistoryTabs from './historyTable'
import { getStockHistoryQueryResponse } from '@/lib/actions/stock/query/historyQuery'

type Props = {
  onlySales?: boolean
  validationFilter?: 'all' | 'validated' | 'not_validated'
  initialQuery?: {
    page?: string
    type?: string
    validation?: string
  }
}

export default async function StockHistory({
  onlySales = false,
  validationFilter = 'all',
  initialQuery,
}: Props) {
  const page = Number(initialQuery?.page ?? '1')
  const type = initialQuery?.type as any
  const validation = (initialQuery?.validation as any) ?? validationFilter

  const result = await getStockHistoryQueryResponse({
    page,
    limit: 25,
    validation,
    type,
    onlySales,
  })

  return (
    <HistoryTabs
      fallbackData={result}
      validationFilter={validationFilter}
      onlySales={onlySales}
    />
  )
}
