import { EventEmitter } from "node:events";

import Redis from "ioredis";

import { env } from "@/env";

export type NotificationRealtimePayload = {
  id: string;
  type: string;
  userId: string;
  actorId: string;
  actorName: string | null;
  postId: string;
  postSlug: string;
  commentId: string | null;
  parentCommentId: string | null;
  createdAt: string;
};

type NotificationListener = (payload: NotificationRealtimePayload) => void;

const CHANNEL_PREFIX = "notify:";
const globalStore = globalThis as typeof globalThis & {
  __nhamNotifyBus?: EventEmitter;
  __nhamRedisPublisher?: Redis | null;
  __nhamRedisSubscriber?: Redis | null;
  __nhamRedisSubscribeReady?: Promise<void> | null;
};

function getMemoryBus() {
  if (!globalStore.__nhamNotifyBus) {
    globalStore.__nhamNotifyBus = new EventEmitter();
    globalStore.__nhamNotifyBus.setMaxListeners(100);
  }

  return globalStore.__nhamNotifyBus;
}

function channelForUser(userId: string) {
  return `${CHANNEL_PREFIX}${userId}`;
}

function getRedisUrl() {
  return env.REDIS_URL?.trim() || null;
}

function createRedisClient() {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    return null;
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

async function getPublisher() {
  if (globalStore.__nhamRedisPublisher !== undefined) {
    return globalStore.__nhamRedisPublisher;
  }

  const client = createRedisClient();

  if (!client) {
    globalStore.__nhamRedisPublisher = null;
    return null;
  }

  try {
    await client.connect();
    globalStore.__nhamRedisPublisher = client;
    return client;
  } catch {
    // ponytail: Redis optional — fall back to in-process bus for single instance.
    globalStore.__nhamRedisPublisher = null;
    return null;
  }
}

async function ensureSubscriber() {
  if (!getRedisUrl()) {
    return;
  }

  if (globalStore.__nhamRedisSubscribeReady) {
    await globalStore.__nhamRedisSubscribeReady;
    return;
  }

  globalStore.__nhamRedisSubscribeReady = (async () => {
    const client = createRedisClient();

    if (!client) {
      return;
    }

    try {
      await client.connect();
      globalStore.__nhamRedisSubscriber = client;
      await client.psubscribe(`${CHANNEL_PREFIX}*`);
      client.on("pmessage", (_pattern, channel, message) => {
        const userId = channel.slice(CHANNEL_PREFIX.length);

        try {
          const payload = JSON.parse(message) as NotificationRealtimePayload;
          getMemoryBus().emit(channelForUser(userId), payload);
        } catch {
          // ignore malformed payloads
        }
      });
    } catch {
      globalStore.__nhamRedisSubscriber = null;
    }
  })();

  await globalStore.__nhamRedisSubscribeReady;
}

export async function publishNotificationEvent(payload: NotificationRealtimePayload) {
  const channel = channelForUser(payload.userId);
  getMemoryBus().emit(channel, payload);

  const publisher = await getPublisher();

  if (!publisher) {
    return;
  }

  try {
    await publisher.publish(channel, JSON.stringify(payload));
  } catch {
    // keep memory bus delivery even if Redis publish fails
  }
}

export async function subscribeNotificationEvents(
  userId: string,
  listener: NotificationListener
): Promise<() => void> {
  await ensureSubscriber();
  const channel = channelForUser(userId);
  const bus = getMemoryBus();
  bus.on(channel, listener);

  return () => {
    bus.off(channel, listener);
  };
}
