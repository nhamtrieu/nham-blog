import bcrypt from "bcrypt";

import { createDataSource } from "@/db/data-source";
import { User } from "@/entities";
import { env } from "@/env";

async function resetAdminPassword() {
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email: env.ADMIN_EMAIL },
    });

    if (!user) {
      throw new Error(`Admin user not found for email: ${env.ADMIN_EMAIL}`);
    }

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

    await userRepository.update(
      { id: user.id },
      {
        passwordHash,
      }
    );

    console.log(`Reset password for admin user: ${env.ADMIN_EMAIL}`);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

resetAdminPassword().catch((error) => {
  console.error("Admin password reset failed.");
  console.error(error);
  process.exit(1);
});
