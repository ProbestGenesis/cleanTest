"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ReactNode, useState } from "react"

type Props = {
  children: ReactNode
}

function StackProvider({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default StackProvider
