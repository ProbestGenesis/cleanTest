'use server'

import { prisma } from '@/lib/prisma'
import { pubsub } from '@/lib/pubsub'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

type CreateNotificationParams = {
  title: string
  body: string
  type: string
  link?: string
  receiverIds: string[]
}

/**
 * Creates a notification in the DB and publishes it via PubSub
 */
export async function createNotification({
  title,
  body,
  type,
  link,
  receiverIds,
}: CreateNotificationParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    if (!session?.user) {
      return { ok: false, error: 'Non autorisé' }
    }

    // Save to DB
    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        type,
        link,
        emitterId: session.user.id,
        receiptIds: receiverIds,
      },
    })

    // Publish to each receiver's channel
    receiverIds.forEach(id => {
      pubsub.publish(`user:${id}:notifications`, notification)
    })

    return { ok: true, data: notification }
  } catch (error) {
    console.error('Failed to create notification:', error)
    return { ok: false, error: 'Erreur lors de la création de la notification' }
  }
}
