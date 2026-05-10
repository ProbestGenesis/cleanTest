/**
 * RedisPubSub — implémentation Redis du contrat IPubSub.
 *
 * NON ACTIVÉE. Pour activer, modifier lib/pubsub.ts :
 *   import { RedisPubSub } from "./redis-pubsub"
 *   export const pubsub: IPubSub = new RedisPubSub(process.env.REDIS_URL!)
 *
 * Dépendance requise : `bun add ioredis`
 */
import type { IPubSub } from "./pubsub"

// On importe ioredis en lazy pour ne pas crasher si non installé
type RedisClient = {
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string): Promise<unknown>
  on(event: string, handler: (...args: unknown[]) => void): void
  duplicate(): RedisClient
  quit(): Promise<void>
}

export class RedisPubSub implements IPubSub {
  private publisher: RedisClient
  private subscriber: RedisClient
  /** handlers locaux par canal */
  private handlers = new Map<string, Set<(payload: unknown) => void>>()

  constructor(redisUrl: string) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis")
    this.publisher = new Redis(redisUrl) as RedisClient
    this.subscriber = this.publisher.duplicate()

    // Un seul listener Redis → dispatche aux handlers locaux
    this.subscriber.on("message", (channel: unknown, raw: unknown) => {
      const channelStr = channel as string
      const payload = JSON.parse(raw as string)
      this.handlers.get(channelStr)?.forEach((h) => h(payload))
    })
  }

  publish(channel: string, payload: unknown): void {
    this.publisher.publish(channel, JSON.stringify(payload))
  }

  subscribe(channel: string, handler: (payload: unknown) => void): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
      this.subscriber.subscribe(channel)
    }
    this.handlers.get(channel)!.add(handler)

    return () => {
      this.handlers.get(channel)?.delete(handler)
    }
  }

  async destroy(): Promise<void> {
    await this.publisher.quit()
    await this.subscriber.quit()
  }
}
