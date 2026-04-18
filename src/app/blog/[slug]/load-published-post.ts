import { cache } from "react";

import { postService } from "@/services";

export const loadPublishedPostBySlug = cache((slug: string) => postService.getPublishedPostBySlug(slug));
