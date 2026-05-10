'use client'

import { useSSE } from '@/hooks/useSSE'
import { useEffect } from 'react'
import { authClient } from '@/lib/auth-client'

export function SSEProvider() {
  const { data: session } = authClient.useSession()
  
  if (!session?.user) {
    return null
  }

  return <SSEConnector />
}

function SSEConnector() {
  const { isConnected } = useSSE({
    enableNativeBrowserNotifications: true,
  })

  useEffect(() => {
    if (isConnected) {
      console.log('SSE Connected to real-time notifications')
    }
  }, [isConnected])

  return null
}

