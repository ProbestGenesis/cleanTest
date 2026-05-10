import { Product } from "@/generated/prisma/client"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { CACHE_CONFIG } from "@/lib/constants/caching"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || 'An error occurred while fetching data')
  }
  return res.json()
}

type StockResponse = {
  ok: boolean
  data: Product[]
  categories: string[]
  meta: {
    total: number
    page: number
    totalPages: number
    limit: number
  }
}

type UseStockParams = {
  page?: number
  limit?: number
  search?: string
  option?: string
  fallbackData?: StockResponse
}

export const useStock = ({
  page = 1,
  limit = 10,
  search = '',
  option = '',
  fallbackData,
}: UseStockParams = {}) => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  if (search) params.set('search', search)
  if (option) params.set('option', option)

  const queryKey = ['stock', params.toString()]

  const { data, error, isLoading, isFetching: isValidating, refetch: mutate } = useQuery<StockResponse>({
    queryKey,
    queryFn: () => fetcher(`/api/stock?${params.toString()}`),
    initialData: fallbackData,
    placeholderData: keepPreviousData,
    staleTime: CACHE_CONFIG.STOCK.staleTime,
    gcTime: CACHE_CONFIG.STOCK.gcTime,
  })

  return {
    data: data?.data ?? [],
    categories: data?.categories ?? [],
    total: data?.meta?.total ?? 0,
    page: data?.meta?.page ?? page,
    totalPages: data?.meta?.totalPages ?? 0,
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

export function useStockSummary() {
  const { data, error, isLoading, refetch: mutate } = useQuery({
    queryKey: ['stock', 'summary'],
    queryFn: () => fetcher('/api/stock/summary'),
    staleTime: CACHE_CONFIG.STOCK.staleTime,
    gcTime: CACHE_CONFIG.STOCK.gcTime,
    placeholderData: keepPreviousData,
  })

  return {
    data: data?.data,
    isLoading,
    error,
    mutate,
  }
}
