const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_EMBEDDING_CHARS = 12_000;

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);

  if (denominator === 0) {
    return 0;
  }

  return dot / denominator;
}

export function buildPostEmbeddingInput(post: {
  title: string;
  excerpt: string | null;
  contentText: string;
}) {
  const parts = [post.title.trim()];

  if (post.excerpt?.trim()) {
    parts.push(post.excerpt.trim());
  }

  if (post.contentText.trim()) {
    parts.push(post.contentText.trim());
  }

  return parts.join("\n\n").slice(0, MAX_EMBEDDING_CHARS);
}

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

export async function embedText(input: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey || input.trim().length === 0) {
    return null;
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
      }),
    });
    const payload = (await response.json()) as OpenAIEmbeddingResponse;

    if (!response.ok) {
      console.error("[embedding] OpenAI error", payload.error?.message ?? response.status);
      return null;
    }

    const embedding = payload.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      return null;
    }

    return embedding;
  } catch (error) {
    console.error("[embedding] request failed", error);
    return null;
  }
}
