import "reflect-metadata";

import { closeRabbitMq, consumeVerificationEmails } from "@/lib/rabbitmq/email-verification-queue";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { validateEnv } from "@/env";

validateEnv();

async function main() {
  console.log("[email-verification] worker started");

  await consumeVerificationEmails(async (message) => {
    console.log(`[email-verification] sending to ${message.email} (user ${message.userId})`);
    await sendVerificationEmail({
      to: message.email,
      name: message.name,
      verifyUrl: message.verifyUrl,
    });
    console.log(`[email-verification] sent to ${message.email}`);
  });
}

main().catch(async (error) => {
  console.error("[email-verification] worker failed", error);
  await closeRabbitMq();
  process.exit(1);
});

process.on("SIGINT", () => {
  void closeRabbitMq().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void closeRabbitMq().finally(() => process.exit(0));
});
