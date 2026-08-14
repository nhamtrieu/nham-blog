import "reflect-metadata";

import { closeRabbitMq, consumeVerificationEmails } from "@/lib/rabbitmq/email-verification-queue";
import {
  closePasswordResetRabbitMq,
  consumePasswordResetEmails,
} from "@/lib/rabbitmq/password-reset-queue";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { validateEnv } from "@/env";

validateEnv();

async function closeAllRabbitMq() {
  await Promise.all([closeRabbitMq(), closePasswordResetRabbitMq()]);
}

async function main() {
  console.log("[email-worker] started (verification + password reset)");

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
