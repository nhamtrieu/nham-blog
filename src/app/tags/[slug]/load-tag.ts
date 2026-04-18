import { cache } from "react";

import { tagService } from "@/services";

export const loadTagBySlug = cache((slug: string) => tagService.getTagBySlug(slug));
