import { Client } from "@/generated/prisma/client"
import { useQuery } from "@tanstack/react-query"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch clients')
  }
  return res.json()
}

export const useClients = (search: string = '') => {
  return useQuery<{ success: boolean; data: Client[] }>({
    queryKey: ['clients', search],
    queryFn: () => fetcher(`/api/clients?search=${encodeURIComponent(search)}`),
    enabled: true,
  })
}
