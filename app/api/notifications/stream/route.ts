import { pubsub } from '@/lib/pubsub'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'


export async function GET(request: Request) {
  // Authenticate user
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const userChannel = `user:${userId}:notifications`

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat to keep connection alive
      controller.enqueue('event: ping\ndata: "connected"\n\n')

      const handleNotification = (message: any) => {
        // SSE format:
        // event: messageType
        // data: JSON payload
        const data = JSON.stringify(message)
        controller.enqueue(`event: notification\ndata: ${data}\n\n`)
      }

      // Subscribe to user specific channel
      const unsubscribeUser = pubsub.subscribe(userChannel, handleNotification)

      // Periodic heartbeat (every 30 seconds) to prevent timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue('event: ping\ndata: "heartbeat"\n\n')
        } catch (e) {
          // Stream might be closed
          clearInterval(heartbeatInterval)
        }
      }, 30000)

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribeUser()
        clearInterval(heartbeatInterval)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For Nginx
    },
  })
}
