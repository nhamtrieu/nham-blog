import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from "amqplib";

import { env } from "@/env";
import {
  NEWSLETTER_CONFIRM_QUEUE,
  NEWSLETTER_ISSUE_QUEUE,
} from "@/lib/newsletter/constants";

export type SendNewsletterConfirmMessage = {
  type: "newsletter.confirm";
  subscriberId: string;
  email: string;
  confirmUrl: string;
};

export type SendNewsletterIssueMessage = {
  type: "newsletter.issue";
  issueId: string;
};

let connectionPromise: Promise<ChannelModel> | null = null;
let channelPromise: Promise<Channel> | null = null;

function requireRabbitMqUrl() {
  const url = env.RABBITMQ_URL?.trim();

  if (!url) {
    throw new Error("RABBITMQ_URL is required to use the newsletter queue.");
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
      await channel.assertQueue(NEWSLETTER_CONFIRM_QUEUE, { durable: true });
      await channel.assertQueue(NEWSLETTER_ISSUE_QUEUE, { durable: true });
      return channel;
    })().catch((error) => {
      channelPromise = null;
      throw error;
    });
  }

  return channelPromise;
}

export async function publishNewsletterConfirm(
  message: SendNewsletterConfirmMessage
): Promise<void> {
  const channel = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  const ok = channel.sendToQueue(NEWSLETTER_CONFIRM_QUEUE, payload, {
    contentType: "application/json",
    persistent: true,
  });

  if (!ok) {
    throw new Error("RabbitMQ sendToQueue returned false (write buffer full).");
  }
}

export async function publishNewsletterIssue(
  message: SendNewsletterIssueMessage
): Promise<void> {
  const channel = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  const ok = channel.sendToQueue(NEWSLETTER_ISSUE_QUEUE, payload, {
    contentType: "application/json",
    persistent: true,
  });

  if (!ok) {
    throw new Error("RabbitMQ sendToQueue returned false (write buffer full).");
  }
}

export async function consumeNewsletterConfirms(
  handler: (message: SendNewsletterConfirmMessage) => Promise<void>
) {
  const channel = await getChannel();
  await channel.prefetch(1);

  await channel.consume(
    NEWSLETTER_CONFIRM_QUEUE,
    (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      void (async () => {
        try {
          const parsed = JSON.parse(msg.content.toString("utf8")) as SendNewsletterConfirmMessage;

          if (parsed?.type !== "newsletter.confirm") {
            channel.ack(msg);
            return;
          }

          await handler(parsed);
          channel.ack(msg);
        } catch (error) {
          // ponytail: drop on failure instead of requeue forever.
          console.error("[newsletter.confirm] consume failed", error);
          channel.nack(msg, false, false);
        }
      })();
    },
    { noAck: false }
  );
}

export async function consumeNewsletterIssues(
  handler: (message: SendNewsletterIssueMessage) => Promise<void>
) {
  const channel = await getChannel();
  await channel.prefetch(1);

  await channel.consume(
    NEWSLETTER_ISSUE_QUEUE,
    (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      void (async () => {
        try {
          const parsed = JSON.parse(msg.content.toString("utf8")) as SendNewsletterIssueMessage;

          if (parsed?.type !== "newsletter.issue") {
            channel.ack(msg);
            return;
          }

          await handler(parsed);
          channel.ack(msg);
        } catch (error) {
          console.error("[newsletter.issue] consume failed", error);
          channel.nack(msg, false, false);
        }
      })();
    },
    { noAck: false }
  );
}

export async function closeNewsletterRabbitMq() {
  const channel = channelPromise ? await channelPromise.catch(() => null) : null;
  const connection = connectionPromise ? await connectionPromise.catch(() => null) : null;
  channelPromise = null;
  connectionPromise = null;

  await channel?.close().catch(() => undefined);
  await connection?.close().catch(() => undefined);
}
