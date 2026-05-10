import { useQuery } from "@tanstack/react-query"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch availability')
  }
  return res.json()
}

export type Availability = {
  productId: string
  stock: number
  reserved: number
  available: number
}

export const useAvailability = (productIds: string[]) => {
  const idsParam = productIds.filter(Boolean).join(',')
  return useQuery<{ success: boolean; data: Availability[] }>({
    queryKey: ['stock-availability', idsParam],
    queryFn: () => fetcher(`/api/stock/availability?ids=${encodeURIComponent(idsParam)}`),
    enabled: productIds.length > 0,
  })
}
