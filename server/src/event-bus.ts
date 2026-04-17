import { EventEmitter } from 'events';
import type { Sql } from 'postgres';

export interface MatchUpdatedEvent {
  matchId: string;
  sequenceNumber: number;
}

export type EventCallback<T> = (data: T) => void | Promise<void>;

export interface IEventBus {
  /**
   * Publish a match update notification.
   */
  publishMatchUpdate(event: MatchUpdatedEvent): Promise<void>;

  /**
   * Subscribe to match updates for a specific match.
   * Returns a function to unsubscribe.
   */
  subscribeMatchUpdate(
    matchId: string,
    callback: EventCallback<MatchUpdatedEvent>,
  ): Promise<() => void>;

  /**
   * Gracefully shut down the bus connection.
   */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// InMemory Implementation
// ---------------------------------------------------------------------------

export class InMemoryEventBus implements IEventBus {
  private readonly emitter = new EventEmitter();

  async publishMatchUpdate(event: MatchUpdatedEvent): Promise<void> {
    this.emitter.emit(`match:${event.matchId}`, event);
  }

  async subscribeMatchUpdate(
    matchId: string,
    callback: EventCallback<MatchUpdatedEvent>,
  ): Promise<() => void> {
    const wrapper = (data: MatchUpdatedEvent) => {
      void callback(data);
    };
    this.emitter.on(`match:${matchId}`, wrapper);
    return () => {
      this.emitter.off(`match:${matchId}`, wrapper);
    };
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}

// ---------------------------------------------------------------------------
// Postgres Implementation
// ---------------------------------------------------------------------------

export class PostgresEventBus implements IEventBus {
  private readonly channel = 'match_updates';
  private readonly subscriptions = new Map<string, Set<EventCallback<MatchUpdatedEvent>>>();
  private isListening = false;

  constructor(private readonly sql: Sql) {}

  async publishMatchUpdate(event: MatchUpdatedEvent): Promise<void> {
    const payload = JSON.stringify(event);
    console.log(
      `[PgEventBus] Publishing notification for match ${event.matchId}, seq ${event.sequenceNumber}`,
    );
    await this.sql`SELECT pg_notify(${this.channel}, ${payload})`;
  }

  async subscribeMatchUpdate(
    matchId: string,
    callback: EventCallback<MatchUpdatedEvent>,
  ): Promise<() => void> {
    if (!this.isListening) {
      await this.startListening();
    }

    let callbacks = this.subscriptions.get(matchId);
    if (!callbacks) {
      callbacks = new Set();
      this.subscriptions.set(matchId, callbacks);
    }
    callbacks.add(callback);
    console.log(`[PgEventBus] Subscribed to match ${matchId}. Total callbacks: ${callbacks.size}`);

    return () => {
      const remaining = this.subscriptions.get(matchId);
      if (remaining) {
        remaining.delete(callback);
        if (remaining.size === 0) {
          this.subscriptions.delete(matchId);
        }
      }
    };
  }

  private listenMeta?: { unlisten: () => Promise<void> };

  private async startListening(): Promise<void> {
    if (this.isListening) return;

    this.listenMeta = await this.sql.listen(this.channel, (payload) => {
      try {
        const event = JSON.parse(payload) as MatchUpdatedEvent;
        console.log(
          `[PgEventBus] Received notification for match ${event.matchId}, seq ${event.sequenceNumber}`,
        );
        const callbacks = this.subscriptions.get(event.matchId);
        if (callbacks) {
          console.log(`[PgEventBus] Found ${callbacks.size} callbacks for ${event.matchId}`);
          for (const cb of callbacks) {
            void cb(event);
          }
        } else {
          console.warn(
            `[PgEventBus] No callbacks found for ${event.matchId}. Current subscriptions:`,
            Array.from(this.subscriptions.keys()),
          );
        }
      } catch (err) {
        console.error('PostgresEventBus: failed to handle notification:', err);
      }
    });

    this.isListening = true;
  }

  async close(): Promise<void> {
    if (this.isListening && this.listenMeta) {
      await this.listenMeta.unlisten();
      this.listenMeta = undefined;
      this.isListening = false;
    }
    this.subscriptions.clear();
  }
}
