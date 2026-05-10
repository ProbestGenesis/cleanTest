"use client"

import { useQuery } from "@tanstack/react-query"
import { CACHE_CONFIG } from "@/lib/constants/caching"

export interface WorkerData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  type: "CDI" | "CDD" | "TRAINEE"
  status: "ACTIF" | "INACTIF" | "FIRED" | "TIMEOFF" | "VACATION" | "SICK_LEAVE"
  salary: number
  salaryNet?: number
  officalStart: Date
  officialEnd?: Date
  image?: string
  matricule: string
  contractDuration?: string
  workAccount?: {
    id: string
    role: string
    banned?: boolean
    pageAccess: string[]
  }
}

interface UseWorkersParams {
  status?: string
  search?: string
  type?: string
  enabled?: boolean
}

export interface WorkerStats {
  permanents: number
  temporaries: number
  trainees: number
  onLeave: number
  inactive: number
  totalSalary: number
  totalTraineeSalary: number
  totalContributions: number
  onLeaveEmployees: {
    id: string
    name: string
    status: string
  }[]
  inactiveEmployees: {
    id: string
    name: string
    status: string
  }[]
  workerSalaries: {
    id: string
    name: string
    salary: number
    socialContributions: number
  }[]
}

export const useWorkers = ({
  status = "all",
  search = "",
  type,
  enabled = true,
}: UseWorkersParams = {}) => {
  return useQuery({
    queryKey: ["workers", status, search, type],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status) params.append("status", status)
      if (search) params.append("search", search)
      if (type) params.append("type", type)

      const response = await fetch(`/api/workers?${params.toString()}`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Failed to fetch workers")
      const data = await response.json()
      return data.data as WorkerData[]
    },
    enabled,
    staleTime: CACHE_CONFIG.WORKERS.staleTime,
    gcTime: CACHE_CONFIG.WORKERS.gcTime,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })
}

export const useWorkerTeams = (enabled = true) => {
  return useQuery({
    queryKey: ["workerTeams"],
    queryFn: async () => {
      const response = await fetch("/api/teams")
      if (!response.ok) throw new Error("Failed to fetch teams")
      const data = await response.json()
      return data.data
    },
    enabled,
    staleTime: CACHE_CONFIG.WORKERS.staleTime,
    gcTime: CACHE_CONFIG.WORKERS.gcTime,
  })
}

export const useWorkerStats = () => {
  return useQuery({
    queryKey: ["workerStats"],
    queryFn: async () => {
      const response = await fetch("/api/workers/stats")
      if (!response.ok) throw new Error("Failed to fetch stats")
      const data = await response.json()
      return data.data as WorkerStats
    },
    staleTime: CACHE_CONFIG.STATS.staleTime,
    gcTime: CACHE_CONFIG.STATS.gcTime,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })
}

export const useParticularTasks = () => {
  return useQuery({
    queryKey: ["particularTasks"],
    queryFn: async () => {
      const response = await fetch("/api/particular-tasks")
      if (!response.ok) throw new Error("Failed to fetch particular tasks")
      const data = await response.json()
      return data.data
    },
    staleTime: CACHE_CONFIG.WORKERS.staleTime,
    gcTime: CACHE_CONFIG.WORKERS.gcTime,
  })
}

export const useWorkerRoles = () => {
  return useQuery({
    queryKey: ["workerRoles"],
    queryFn: async () => {
      const { getWorkerRoles } = await import("@/lib/actions/workers/addWorker")
      return getWorkerRoles()
    },
    staleTime: CACHE_CONFIG.WORKERS.staleTime,
    gcTime: CACHE_CONFIG.WORKERS.gcTime,
  })
}
