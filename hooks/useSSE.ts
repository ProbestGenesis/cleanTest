'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type NotificationEvent = {
  id: string
  title: string
  body: string
  type: string
  link?: string
  createdAt: string
  emitterId: string
}

type UseSSEOptions = {
  enableNativeBrowserNotifications?: boolean
  onNotification?: (notification: NotificationEvent) => void
}

export function useSSE(options: UseSSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Request permission for native notifications if requested
    if (options.enableNativeBrowserNotifications && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission()
      }
    }

    // Connect to SSE stream
    const eventSource = new EventSource('/api/notifications/stream')

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setIsConnected(false)
      // EventSource automatically attempts to reconnect
    }

    // Handle incoming notifications
    eventSource.addEventListener('notification', (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data)
        
        // 1. Toast Notification (In-App)
        toast(data.title, {
          description: data.body,
          action: data.link ? {
            label: 'Voir',
            onClick: () => window.location.href = data.link as string,
          } : undefined,
        })

        // 2. Native Browser Notification (if enabled & permitted)
        if (options.enableNativeBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const nativeNotification = new Notification(data.title, {
            body: data.body,
            icon: '/favicon.ico', // Optional: add a specific icon path
          })

          if (data.link) {
            nativeNotification.onclick = () => {
              window.focus()
              window.location.href = data.link as string
            }
          }
        }

        // 3. Custom Callback
        if (options.onNotification) {
          options.onNotification(data)
        }

      } catch (err) {
        console.error('Failed to parse SSE notification data:', err)
      }
    })

    // Ping/Heartbeat handler
    eventSource.addEventListener('ping', () => {
      // Keeps the connection alive
    })

    // Cleanup on unmount
    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [options.enableNativeBrowserNotifications, options.onNotification])

  return { isConnected }
}
