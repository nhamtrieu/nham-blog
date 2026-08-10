import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";

import { env } from "@/env";
import { EMAIL_VERIFICATION_QUEUE } from "@/lib/auth/email-verification";

export type SendVerificationEmailMessage = {
  type: "send_verification_email";
  userId: string;
  email: string;
  name: string | null;
  verifyUrl: string;
};

let connectionPromise: Promise<ChannelModel> | null = null;
let channelPromise: Promise<Channel> | null = null;

function requireRabbitMqUrl() {
  const url = env.RABBITMQ_URL?.trim();

  if (!url) {
    throw new Error("RABBITMQ_URL is required to use the email verification queue.");
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
      await channel.assertQueue(EMAIL_VERIFICATION_QUEUE, { durable: true });
      return channel;
    })().catch((error) => {
      channelPromise = null;
      throw error;
    });
  }

  return channelPromise;
}

export async function publishVerificationEmail(
  message: SendVerificationEmailMessage
): Promise<void> {
  const channel = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  const ok = channel.sendToQueue(EMAIL_VERIFICATION_QUEUE, payload, {
    contentType: "application/json",
    persistent: true,
  });

  if (!ok) {
    throw new Error("RabbitMQ sendToQueue returned false (write buffer full).");
  }
}

export async function consumeVerificationEmails(
  handler: (message: SendVerificationEmailMessage) => Promise<void>
) {
  const channel = await getChannel();
  await channel.prefetch(1);

  await channel.consume(
    EMAIL_VERIFICATION_QUEUE,
    (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      void (async () => {
        try {
          const parsed = JSON.parse(msg.content.toString("utf8")) as SendVerificationEmailMessage;

          if (parsed?.type !== "send_verification_email") {
            channel.ack(msg);
            return;
          }

          await handler(parsed);
          channel.ack(msg);
        } catch (error) {
          // ponytail: drop on failure instead of requeue forever (was hot-looping logs).
          // Upgrade: dead-letter + retry with backoff.
          console.error("[email-verification] consume failed", error);
          channel.nack(msg, false, false);
        }
      })();
    },
    { noAck: false }
  );
}

export async function closeRabbitMq() {
  const channel = channelPromise ? await channelPromise.catch(() => null) : null;
  const connection = connectionPromise ? await connectionPromise.catch(() => null) : null;
  channelPromise = null;
  connectionPromise = null;

  await channel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
}
