import { PostStatus } from "@/entities/post.entity";
import type { PostCreateInput, PostUpdateInput } from "@/validators/post.validator";

/** Force create payloads from writers to draft-only. */
export function toWriterCreateInput(input: PostCreateInput): PostCreateInput {
  return {
    ...input,
    status: PostStatus.DRAFT,
    publishedAt: null,
  };
}

/** Strip publish controls so writers cannot publish/unpublish via API. */
export function toWriterUpdateInput(input: PostUpdateInput): PostUpdateInput {
  const { status: _status, publishedAt: _publishedAt, ...rest } = input;
  return rest;
}
