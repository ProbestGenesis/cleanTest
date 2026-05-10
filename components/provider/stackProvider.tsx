"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode, useState } from "react"
import { TooltipProvider } from "../ui/tooltip"

type Props = {
  children: ReactNode
}

function StackProvider({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  )
}

export default StackProvider
