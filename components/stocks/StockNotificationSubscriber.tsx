'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
interface Notification {
  id: string
  title: string
  body: string
  type: string
  link?: string | null
  createdAt: string
}

/**
 * Composant invisible à monter dans le layout pour les superadmins.
 * Il ouvre une connexion SSE vers /api/notifications/stream et affiche des toasts
 * quand une notification est reçue.
 */
export function StockNotificationSubscriber() {
  useEffect(() => {
    // Utilise le nouvel endpoint de stream de notifications défini dans @/app/api/notifications/stream/route.ts
    const eventSource = new EventSource('/api/notifications/stream')

    const handleNotification = (e: MessageEvent) => {
      try {
        const notification: Notification = JSON.parse(e.data)
        
        // Détermine si c'est une alerte liée au stock pour conserver le style spécifique
        const isStockAlert = notification.type.includes('STOCK') || 
                            notification.body.toLowerCase().includes('stock') || 
                            notification.body.toLowerCase().includes('basse')

        toast(notification.title, {
          description: notification.body,
          duration: 6000,
          ...(isStockAlert
            ? {
                style: { borderLeft: '4px solid #ef4444' },
              }
            : {
                style: { borderLeft: '4px solid #3b82f6' },
              }),
        })
      } catch (err) {
        // ignore malformed events
      }
    }

    // Le stream utilise l'événement nommé 'notification'
    eventSource.addEventListener('notification', handleNotification)

    eventSource.onerror = () => {
      // The browser will auto-reconnect; no need to explicitly handle here
    }

    return () => {
      eventSource.removeEventListener('notification', handleNotification)
      eventSource.close()
    }
  }, [])

  return null
}
