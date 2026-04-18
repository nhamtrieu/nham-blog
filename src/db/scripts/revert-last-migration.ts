import { createCliDataSource } from "../data-source-cli";

async function main() {
  const dataSource = createCliDataSource();

  try {
    await dataSource.initialize();
    await dataSource.undoLastMigration({ transaction: "all" });
    console.log("Reverted the most recent migration.");
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error("Migration revert failed.");
  console.error(error);
  process.exit(1);
});
