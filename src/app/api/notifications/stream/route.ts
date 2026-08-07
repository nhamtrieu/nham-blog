import { getServerAuthSession } from "@/auth";
import { unauthorizedJson } from "@/lib/api/api-errors";
import { isAuthenticatedSession } from "@/lib/auth/authorization";
import {
  subscribeNotificationEvents,
  type NotificationRealtimePayload,
} from "@/lib/realtime/notification-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await getServerAuthSession();

  if (!isAuthenticatedSession(session)) {
    return unauthorizedJson();
  }

  const userId = session.user.id;
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      unsubscribe = await subscribeNotificationEvents(
        userId,
        (payload: NotificationRealtimePayload) => {
          send("notification", payload);
        }
      );
      send("ready", { ok: true });

      heartbeat = setInterval(() => {
        send("ping", { t: Date.now() });
      }, 25000);
    },
    cancel() {
      closed = true;

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      unsubscribe?.();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
