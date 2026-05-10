// shared types for stock management

export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK'

export interface StockItem {
  id: string
  name: string
  category: string
  purchasePrice: number
  sellingPrice: number
  quantity: number // current quantity on hand
  threshold: number // reorder threshold
  status: StockStatus
}

export interface StockHistoryEntry {
  id: string
  itemId: string
  change: number // positive for additions, negative for withdrawals
  reason: string
  date: string // ISO string representation
}
