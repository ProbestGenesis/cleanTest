"use client"

import { CACHE_CONFIG } from "@/lib/constants/caching"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MessageSender = {
  id: string
  name: string | null
  image: string | null
}

export type DiscussionMember = {
  id: string
  name: string | null
  image: string | null
  role?: string
}

export type ChatMessage = {
  id: string
  senderId: string
  sender?: MessageSender
  content: string
  images?: string[]
  createdAt: string
  isView: boolean
  viewBy: string[]
  _pending?: boolean
  _pendingAttachments?: unknown[]
}

export type DiscussionInfo = {
  id: string
  name: string | null
  image: string | null
  isGroup: boolean
  groupMessage: import("@/generated/prisma/client").GroupMessage
  members: DiscussionMember[]
  message: ChatMessage[]
}

export type DiscussionFullResponse = {
  ok: boolean
  message: string
  data: DiscussionInfo | null
}

export type DiscussionListItem = import("@/generated/prisma/client").Discussion & {
  groupMessage?: import("@/generated/prisma/client").GroupMessage | null
}

export type DiscussionListResponse = {
  ok: boolean
  message: string
  data: DiscussionListItem[]
}

// ---------------------------------------------------------------------------
// Query keys — source unique de vérité pour les clés TanStack Query
// ---------------------------------------------------------------------------
export const messagingKeys = {
  all: ["messaging"] as const,
  discussions: () => [...messagingKeys.all, "discussions"] as const,
  messages: (discussionId: string) =>
    [...messagingKeys.all, "messages", discussionId] as const,
} as const

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------
async function fetchDiscussionList(): Promise<DiscussionListResponse> {
  const res = await fetch("/api/messages")
  if (!res.ok) throw new Error("Impossible de charger les discussions")
  return res.json()
}

async function fetchDiscussion(
  discussionId: string
): Promise<DiscussionFullResponse> {
  const res = await fetch(`/api/messages/${discussionId}`)
  if (!res.ok) throw new Error("Impossible de charger la conversation")
  return res.json()
}

// ---------------------------------------------------------------------------
// useDiscussionList — sidebar (layout)
// SSE: canal discussions:{userId} → invalide le cache quand la liste change
// ---------------------------------------------------------------------------
export function useDiscussionList() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const source = new EventSource("/api/messages/stream")

    source.addEventListener("discussion_update", () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.discussions() })
    })

    // Reconnexion automatique gérée par le navigateur (spec EventSource)
    source.onerror = () => {
      // EventSource se reconnecte seul — pas besoin d'action manuelle
    }

    return () => source.close()
  }, [queryClient])

  return useQuery<DiscussionListResponse>({
    queryKey: messagingKeys.discussions(),
    queryFn: fetchDiscussionList,
    staleTime: CACHE_CONFIG.MESSAGES.staleTime,
    gcTime: CACHE_CONFIG.MESSAGES.gcTime,
  })
}

// ---------------------------------------------------------------------------
// useDiscussionMessages — conversation ouverte (page)
// SSE: canal messages:{discussionId} → mise à jour cache en temps réel
// ---------------------------------------------------------------------------
export function useDiscussionMessages(discussionId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!discussionId) return

    const source = new EventSource(
      `/api/messages/stream?di=${discussionId}`
    )

    source.addEventListener("message_event", (e: MessageEvent) => {
      const event = JSON.parse(e.data) as {
        type: "new_message" | "message_deleted"
        data: ChatMessage | { messageId: string }
      }

      queryClient.setQueryData<DiscussionFullResponse>(
        messagingKeys.messages(discussionId),
        (old) => {
          if (!old?.data) return old

          if (event.type === "new_message") {
            const newMsg = event.data as ChatMessage
            // Évite les doublons (peut arriver si optimistic + SSE)
            const alreadyExists = old.data.message.some(
              (m) => m.id === newMsg.id
            )
            if (alreadyExists) return old

            return {
              ...old,
              data: {
                ...old.data,
                message: [...old.data.message, newMsg],
              },
            }
          }

          if (event.type === "message_deleted") {
            const { messageId } = event.data as { messageId: string }
            return {
              ...old,
              data: {
                ...old.data,
                message: old.data.message.filter((m) => m.id !== messageId),
              },
            }
          }

          return old
        }
      )
    })

    // Mise à jour de la sidebar depuis la page conversation
    source.addEventListener("discussion_update", () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.discussions() })
    })

    source.onerror = () => {
      // EventSource se reconnecte automatiquement
    }

    return () => source.close()
  }, [discussionId, queryClient])

  return useQuery<DiscussionFullResponse>({
    queryKey: discussionId
      ? messagingKeys.messages(discussionId)
      : [...messagingKeys.all, "messages", "__empty__"],
    queryFn: () => fetchDiscussion(discussionId!),
    enabled: !!discussionId,
    staleTime: CACHE_CONFIG.MESSAGES.staleTime,
    gcTime: CACHE_CONFIG.MESSAGES.gcTime,
  })
}
