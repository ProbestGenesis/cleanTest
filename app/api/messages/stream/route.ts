import { auth } from "@/lib/auth"
import { pubsub } from "@/lib/pubsub"
import { headers } from "next/headers"

/**
 * SSE — Messagerie en temps réel
 *
 * Sans paramètre  : abonnement au canal `discussions:{userId}`
 *                   → utilisé par le layout (sidebar)
 *
 * Avec ?di={id}   : abonnement aux canaux `messages:{discussionId}`
 *                   ET `discussions:{userId}`
 *                   → utilisé par la page de conversation
 *
 * Côté serveur, déclencher les événements avec :
 *   pubsub.publish(`messages:${discussionId}`, { type: "new_message", data: message })
 *   pubsub.publish(`discussions:${userId}`,    { type: "discussion_update" })
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(request.url)
  const discussionId = searchParams.get("di")

  const stream = new ReadableStream({
    start(controller) {
      const encode = (event: string, data: unknown) =>
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

      // Connexion confirmée
      controller.enqueue(encode("connected", { userId }))

      const unsubs: Array<() => void> = []

      // ── Canal discussions (sidebar) ─────────────────────────────────────
      const discussionChannel = `discussions:${userId}`
      unsubs.push(
        pubsub.subscribe(discussionChannel, (payload) => {
          try {
            controller.enqueue(encode("discussion_update", payload))
          } catch {
            /* stream fermé */
          }
        })
      )

      // ── Canal messages (conversation ouverte) ───────────────────────────
      if (discussionId) {
        const messageChannel = `messages:${discussionId}`
        unsubs.push(
          pubsub.subscribe(messageChannel, (payload) => {
            try {
              controller.enqueue(encode("message_event", payload))
            } catch {
              /* stream fermé */
            }
          })
        )
      }

      // ── Heartbeat (évite timeout proxy/nginx) ───────────────────────────
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(": heartbeat\n\n")
        } catch {
          clearInterval(heartbeat)
        }
      }, 25_000)

      // ── Cleanup sur déconnexion ─────────────────────────────────────────
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubs.forEach((u) => u())
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginx
    },
  })
}
