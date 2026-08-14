import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";

import { env } from "@/env";
import { PASSWORD_RESET_QUEUE } from "@/lib/auth/password-reset";

export type SendPasswordResetEmailMessage = {
  type: "send_password_reset_email";
  userId: string;
  email: string;
  name: string | null;
  resetUrl: string;
};

let connectionPromise: Promise<ChannelModel> | null = null;
let channelPromise: Promise<Channel> | null = null;

function requireRabbitMqUrl() {
  const url = env.RABBITMQ_URL?.trim();

  if (!url) {
    throw new Error("RABBITMQ_URL is required to use the password reset queue.");
  }

  return url;
}

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = amqp.connect(requireRabbitMqUrl()).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

async function getChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await getConnection();
      const channel = await connection.createChannel();
      await channel.assertQueue(PASSWORD_RESET_QUEUE, { durable: true });
      return channel;
    })().catch((error) => {
      channelPromise = null;
      throw error;
    });
  }

  return channelPromise;
}

export async function publishPasswordResetEmail(
  message: SendPasswordResetEmailMessage
): Promise<void> {
  const channel = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  const ok = channel.sendToQueue(PASSWORD_RESET_QUEUE, payload, {
    contentType: "application/json",
    persistent: true,
  });

  if (!ok) {
    throw new Error("RabbitMQ sendToQueue returned false (write buffer full).");
  }
}

export async function consumePasswordResetEmails(
  handler: (message: SendPasswordResetEmailMessage) => Promise<void>
) {
  const channel = await getChannel();
  await channel.prefetch(1);

  await channel.consume(
    PASSWORD_RESET_QUEUE,
    (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      void (async () => {
        try {
          const parsed = JSON.parse(msg.content.toString("utf8")) as SendPasswordResetEmailMessage;

          if (parsed?.type !== "send_password_reset_email") {
            channel.ack(msg);
            return;
          }

          await handler(parsed);
          channel.ack(msg);
        } catch (error) {
          // ponytail: drop on failure instead of requeue forever (was hot-looping logs).
          // Upgrade: dead-letter + retry with backoff.
          console.error("[password-reset] consume failed", error);
          channel.nack(msg, false, false);
        }
      })();
    },
    { noAck: false }
  );
}

export async function closePasswordResetRabbitMq() {
  const channel = channelPromise ? await channelPromise.catch(() => null) : null;
  const connection = connectionPromise ? await connectionPromise.catch(() => null) : null;
  channelPromise = null;
  connectionPromise = null;

  await channel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
}
