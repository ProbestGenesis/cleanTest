import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PurchaseSchema } from "../zodschema"
import z from "zod"
import { addPurchase } from "../actions/purchase/createPurchase"
import { updatePurchaseProgress } from "../actions/purchase/updatePurchaseProgress"

export function usePurchases(filters: any = {}) {
  const queryParams = new URLSearchParams(filters).toString()
  return useQuery({
    queryKey: ["purchases", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/purchases?${queryParams}`)
      if (!res.ok) throw new Error("Failed to fetch purchases")
      return res.json()
    },
  })
}

export function useProviderKPIs(providerId: string) {
  return useQuery({
    queryKey: ["provider-kpis", providerId],
    queryFn: async () => {
      if (!providerId) return null
      const res = await fetch(`/api/providers/${providerId}/kpis`)
      if (!res.ok) throw new Error("Failed to fetch provider KPIs")
      return res.json()
    },
    enabled: !!providerId,
  })
}

export function useDuePaymentAlerts() {
  return useQuery({
    queryKey: ["due-payment-alerts"],
    queryFn: async () => {
      const res = await fetch(`/api/purchases/alerts/due-dates`)
      if (!res.ok) throw new Error("Failed to fetch alerts")
      return res.json()
    },
  })
}

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof PurchaseSchema>) => addPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] })
    },
  })
}

export function useUpdatePurchaseProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => updatePurchaseProgress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] })
    },
  })
}
