import {
  Prisma,
  StockEditHistorique,
  StockEditStatus,
  StockEditType,
} from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { DEFAULT_STOCK_LIMIT } from "./query"

export type StockHistoryQueryParams = {
  page: number
  limit: number
  validation?: "all" | "validated" | "not_validated" | null
  type?: StockEditType | "all" | null
  onlySales?: boolean
}

export type StockHistoryResponse = {
  ok: boolean
  message: string
  data: any[] // Using any here to match the complex include structure
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getStockHistoryQueryResponse(
  params: StockHistoryQueryParams
): Promise<StockHistoryResponse> {
  const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1
  const limit =
    Number.isFinite(params.limit) && params.limit > 0
      ? params.limit
      : DEFAULT_STOCK_LIMIT
  const validation = params.validation ?? "all"
  const onlySales = params.onlySales ?? false
  const operationType = params.type ?? "all"

  const statusFilter: Prisma.StockEditHistoriqueWhereInput =
    validation === "validated"
      ? { status: "ISVALIDED" as StockEditStatus }
      : validation === "not_validated"
        ? {
            status: {
              in: [
                "PENDING_VALIDATION",
                "AWAITING_CONFIRMATION",
                "ISREJECTED",
              ] as StockEditStatus[],
            },
          }
        : {}

  const typeFilter: Prisma.StockEditHistoriqueWhereInput =
    operationType && operationType !== "all"
      ? { type: operationType as StockEditType }
      : onlySales
        ? { type: "SELL" }
        : {}

  const whereClause: Prisma.StockEditHistoriqueWhereInput = {
    AND: [statusFilter, typeFilter],
  }

  const skip = (page - 1) * limit

  const [total, items] = await Promise.all([
    prisma.stockEditHistorique.count({ where: whereClause }),
    prisma.stockEditHistorique.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            code: true,
            quantity: true,
            updatedAt: true,
            thumbnails: true,
          },
        },
        worker: {
          select: {
            name: true,
            id: true,
            role: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            role: true,
          },
        },
        sale: {
          include: {
            client: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
        purchase: {
          include: {
            provider: {
              select: {
                name: true,
                id: true,
              },
            },
            purchaseItems: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ])

  return {
    ok: true,
    message: items.length ? "Historique récupéré" : "Aucun historique trouvé",
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}
