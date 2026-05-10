import { Prisma, Product } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export const DEFAULT_STOCK_LIMIT = 25

export type StockQueryParams = {
  page: number
  limit: number
  search?: string | null
  option?: string | null
  category?: string | null
}

export type StockQueryResponse = {
  ok: true
  message: string
  data: Product[]
  categories: string[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getStockQueryResponse(params: StockQueryParams): Promise<StockQueryResponse> {
  const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1
  const limit = Number.isFinite(params.limit) && params.limit > 0 ? params.limit : DEFAULT_STOCK_LIMIT
  const search = params.search?.trim() ?? ''
  const option = params.option ?? ''
  const category = params.category ?? ''
  
  console.log(`[getStockQueryResponse] category received: "${category}", search: "${search}"`)

  const filters: Prisma.ProductWhereInput[] = []

  if (option === 'outOfStock') {
    filters.push({
      quantity: {
        lte: 0,
      },
    })
  }

  if (option === 'inStock') {
    filters.push({
      quantity: {
        gt: 0,
      },
    })
  }

  if (option === 'underThreshold') {
    filters.push({
      quantity: {
        gt: 0,
        lt: prisma.product.fields.threshold,
      },
    })
  }

  if (search) {
    filters.push({
      OR: [
        {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          code: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          ref: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
      ],
    })
  }

  if (category && category !== 'all') {
    filters.push({
      category: {
        equals: category,
        mode: 'insensitive' as const,
      },
    })
  }

  const whereClause = filters.length > 0 ? { AND: filters } : {}
  const skip = (page - 1) * limit

  const [total, items, availableCategories] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.product.findMany({
      distinct: ['category'],
      select: {
        category: true,
      },
      orderBy: {
        category: 'desc',
      },
    }),
  ])

  return {
    ok: true,
    message: items.length ? 'Produits récupérés' : 'Aucun produit trouvé',
    data: items,
    categories: availableCategories
      .map((item) => item.category)
      .filter((value): value is string => Boolean(value)),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}
