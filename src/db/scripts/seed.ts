import bcrypt from "bcrypt";

import { createDataSource } from "@/db/data-source";
import { Tag, User } from "@/entities";
import { UserRole } from "@/entities/user.entity";
import { env } from "@/env";

const DEFAULT_TAGS = [
  { name: "Next.js", slug: "nextjs", orderNumber: 1 },
  { name: "TypeScript", slug: "typescript", orderNumber: 2 },
  { name: "PostgreSQL", slug: "postgresql", orderNumber: 3 },
];

async function seedAdmin() {
  const dataSource = createDataSource();

  try {
    await dataSource.initialize();

    const userRepository = dataSource.getRepository(User);
    const tagRepository = dataSource.getRepository(Tag);

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    const existingUser = await userRepository.findOne({
      where: { email: env.ADMIN_EMAIL },
    });

    if (existingUser) {
      await userRepository.update(
        { id: existingUser.id },
        {
          name: env.ADMIN_NAME,
          passwordHash,
          role: UserRole.ADMIN,
        }
      );
      console.log(`Updated admin user: ${env.ADMIN_EMAIL}`);
    } else {
      await userRepository.insert({
        email: env.ADMIN_EMAIL,
        name: env.ADMIN_NAME,
        passwordHash,
        role: UserRole.ADMIN,
      });
      console.log(`Created admin user: ${env.ADMIN_EMAIL}`);
    }

    for (const tag of DEFAULT_TAGS) {
      const existingTag = await tagRepository.findOne({
        where: [{ slug: tag.slug }, { name: tag.name }],
      });

      if (existingTag) {
        await tagRepository.update(
          { id: existingTag.id },
          {
            name: tag.name,
            slug: tag.slug,
            orderNumber: tag.orderNumber,
          }
        );
        console.log(`Updated tag: ${tag.slug}`);
      } else {
        await tagRepository.insert(tag);
        console.log(`Created tag: ${tag.slug}`);
      }
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

seedAdmin().catch((error) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
