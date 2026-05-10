import { StockHistoryEntry, StockItem } from './stockTypes'

// quick helper to create a unique identifier without pulling in an external
// library (keeps the mock self‑contained)
function makeId() {
  return Math.random().toString(36).substring(2, 10)
}

// -- Mock storage -------------------------------------------------------------
// In a real application this would call the database or an API.  For now we
// maintain in‑memory arrays that live for the lifetime of the server process.

const _stockItems: StockItem[] = [
  {
    id: makeId(),
    name: 'Bloc‑note A4 100 pages',
    category: 'Papeterie',
    purchasePrice: 1.25,
    sellingPrice: 2.5,
    quantity: 140,
    threshold: 20,
    status: 'IN_STOCK',
  },
  {
    id: makeId(),
    name: 'Stylo bille bleu',
    category: 'Papeterie',
    purchasePrice: 0.3,
    sellingPrice: 0.75,
    quantity: 10,
    threshold: 30,
    status: 'IN_STOCK',
  },
  {
    id: makeId(),
    name: 'Rouleau de scotch large',
    category: 'Fournitures',
    purchasePrice: 0.95,
    sellingPrice: 2.0,
    quantity: 0,
    threshold: 5,
    status: 'OUT_OF_STOCK',
  },
]

const _history: StockHistoryEntry[] = []

// -- Public helpers ----------------------------------------------------------

export function getStockItems(): StockItem[] {
  // normally this would filter, paginate, etc.  we just return a copy so
  // callers can't mutate our internal state accidentally.
  return _stockItems.map((x) => ({ ...x }))
}

export function getStockCounts(): { total: number; inStock: number; outOfStock: number } {
  const total = _stockItems.length
  const inStock = _stockItems.filter((i) => i.status === 'IN_STOCK').length
  const outOfStock = total - inStock
  return { total, inStock, outOfStock }
}

export function getStockHistory(): StockHistoryEntry[] {
  // keep newest entries at the top
  return [..._history].sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * Adjusts the quantity of a stock item and records a history entry.
 *
 * @param itemId id of the item to change
 * @param change positive to add, negative to remove
 * @param reason a short explanation (sale, correction, arrival, etc.)
 */
export function adjustStock(itemId: string, change: number, reason: string): StockItem | undefined {
  const item = _stockItems.find((i) => i.id === itemId)
  if (!item) return

  item.quantity += change
  if (item.quantity <= 0) {
    item.quantity = 0
    item.status = 'OUT_OF_STOCK'
  } else {
    item.status = 'IN_STOCK'
  }

  _history.push({
    id: makeId(),
    itemId,
    change,
    reason,
    date: new Date().toISOString(),
  })

  return { ...item }
}

/**
 * Returns items that have fallen below their reorder threshold.
 */
export function getReorderAlerts(): StockItem[] {
  return _stockItems.filter((i) => i.quantity <= i.threshold)
}
