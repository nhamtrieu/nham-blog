import { createCliDataSource } from "../data-source-cli";

async function main() {
  const dataSource = createCliDataSource();

  try {
    await dataSource.initialize();
    const migrations = await dataSource.runMigrations({ transaction: "all" });

    if (migrations.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Applied ${migrations.length} migration(s):`);
    for (const migration of migrations) {
      console.log(`- ${migration.name}`);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error("Migration run failed.");
  console.error(error);
  process.exit(1);
});
