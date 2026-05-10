import { EventEmitter } from "events"

// ---------------------------------------------------------------------------
// Interface — le seul contrat que le reste du code connaît
// ---------------------------------------------------------------------------
export interface IPubSub {
  publish(channel: string, payload: unknown): void
  subscribe(channel: string, handler: (payload: unknown) => void): () => void
}

// ---------------------------------------------------------------------------
// Implémentation en mémoire (EventEmitter) — utilisée par défaut
// ---------------------------------------------------------------------------
class MemoryPubSub implements IPubSub {
  private emitter = new EventEmitter()

  constructor() {
    // Augmente la limite si beaucoup d'utilisateurs se connectent simultanément
    this.emitter.setMaxListeners(2000)
  }

  publish(channel: string, payload: unknown): void {
    this.emitter.emit(channel, payload)
  }

  subscribe(channel: string, handler: (payload: unknown) => void): () => void {
    this.emitter.on(channel, handler)
    return () => this.emitter.off(channel, handler)
  }
}

// ---------------------------------------------------------------------------
// Singleton — évite les doubles instances lors du HMR Next.js
// Pour activer Redis : remplacer MemoryPubSub par RedisPubSub ici
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var _pubsub: IPubSub | undefined
}

export const pubsub: IPubSub = global._pubsub ?? new MemoryPubSub()

if (process.env.NODE_ENV !== "production") {
  global._pubsub = pubsub
}
