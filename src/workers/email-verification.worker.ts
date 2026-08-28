import "reflect-metadata";

import { closeRabbitMq, consumeVerificationEmails } from "@/lib/rabbitmq/email-verification-queue";
import {
  closePasswordResetRabbitMq,
  consumePasswordResetEmails,
} from "@/lib/rabbitmq/password-reset-queue";
import {
  closeNewsletterRabbitMq,
  consumeNewsletterConfirms,
  consumeNewsletterIssues,
} from "@/lib/rabbitmq/newsletter-queue";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { sendNewsletterConfirmEmail } from "@/lib/email/send-newsletter-confirm-email";
import { newsletterService } from "@/services/newsletter.service";
import { validateEnv } from "@/env";
import { postService } from "@/services";

validateEnv();

const SCHEDULED_PUBLISH_POLL_MS = 60_000;

async function closeAllRabbitMq() {
  await Promise.all([
    closeRabbitMq(),
    closePasswordResetRabbitMq(),
    closeNewsletterRabbitMq(),
  ]);
}

async function promoteDueScheduledPosts() {
  try {
    const promoted = await postService.promoteDueScheduledPosts();

    if (promoted > 0) {
      console.log(`[scheduled-publish] promoted ${promoted} post(s)`);
    }
  } catch (error) {
    console.error("[scheduled-publish] poll failed", error);
  }
}

async function main() {
  console.log("[email-worker] started (verification + password reset + newsletter + scheduled publish)");

  await promoteDueScheduledPosts();
  const scheduledPublishTimer = setInterval(() => {
    void promoteDueScheduledPosts();
  }, SCHEDULED_PUBLISH_POLL_MS);

  if (typeof scheduledPublishTimer.unref === "function") {
    scheduledPublishTimer.unref();
  }

  await consumeVerificationEmails(async (message) => {
    console.log(`[email-verification] sending to ${message.email} (user ${message.userId})`);
    await sendVerificationEmail({
      to: message.email,
      name: message.name,
      verifyUrl: message.verifyUrl,
    });
    console.log(`[email-verification] sent to ${message.email}`);
  });

  await consumePasswordResetEmails(async (message) => {
    console.log(`[password-reset] sending to ${message.email} (user ${message.userId})`);
    await sendPasswordResetEmail({
      to: message.email,
      name: message.name,
      resetUrl: message.resetUrl,
    });
    console.log(`[password-reset] sent to ${message.email}`);
  });

  await consumeNewsletterConfirms(async (message) => {
    console.log(`[newsletter.confirm] sending to ${message.email}`);
    await sendNewsletterConfirmEmail({
      to: message.email,
      confirmUrl: message.confirmUrl,
    });
    console.log(`[newsletter.confirm] sent to ${message.email}`);
  });

  await consumeNewsletterIssues(async (message) => {
    console.log(`[newsletter.issue] processing ${message.issueId}`);
    await newsletterService.processIssue(message.issueId);
    console.log(`[newsletter.issue] done ${message.issueId}`);
  });
}

main().catch(async (error) => {
  console.error("[email-worker] failed", error);
  await closeAllRabbitMq();
  process.exit(1);
});

process.on("SIGINT", () => {
  void closeAllRabbitMq().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void closeAllRabbitMq().finally(() => process.exit(0));
});
