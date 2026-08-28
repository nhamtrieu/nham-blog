import { postService } from "@/services";

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY is missing. Set it in .env.local then retry.");
    process.exit(1);
  }

  const result = await postService.syncPublicPostEmbeddings();
  console.log(
    `Embedded public posts: ${result.updated} updated, ${result.skipped} skipped.`
  );
}

main().catch((error) => {
  console.error("Embedding backfill failed.");
  console.error(error);
  process.exit(1);
});
