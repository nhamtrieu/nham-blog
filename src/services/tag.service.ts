import { Not } from "typeorm";

import { initializeDataSource } from "@/db/data-source";
import { Tag } from "@/entities/tag.entity";
import { slugify } from "@/lib/slug";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
  type ServiceFieldErrors,
} from "@/services/service-error";
import type { TagCreateInput, TagUpdateInput } from "@/validators/tag.validator";

type DataSourceFactory = typeof initializeDataSource;

export type TagRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TagListItem = {
  id: string;
  name: string;
  slug: string;
  updatedAt: Date;
};

type CreateTagParams = {
  input: TagCreateInput;
};

type UpdateTagParams = {
  tagId: string;
  input: TagUpdateInput;
};

function mapTagRecord(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  } satisfies TagRecord;
}

function mapTagListItem(tag: Tag) {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    updatedAt: tag.updatedAt,
  } satisfies TagListItem;
}

async function loadTagOrThrow(dataSource: Awaited<ReturnType<DataSourceFactory>>, tagId: string) {
  const tagRepository = dataSource.getRepository(Tag);
  const tag = await tagRepository.findOneBy({ id: tagId });

  if (tag) {
    return tag;
  }

  throw new ServiceError({
    code: SERVICE_ERROR_CODES.NOT_FOUND,
    message: "Tag not found.",
    statusCode: 404,
  });
}

function buildTagConflictError(fields: ServiceFieldErrors) {
  return new ServiceError({
    code: SERVICE_ERROR_CODES.CONFLICT,
    message: Object.values(fields)[0]?.[0] ?? "Tag already exists.",
    statusCode: 409,
    fields,
  });
}

async function assertTagUniqueness(
  dataSource: Awaited<ReturnType<DataSourceFactory>>,
  options: {
    tagId?: string;
    name: string;
    slug: string;
  }
) {
  const tagRepository = dataSource.getRepository(Tag);
  const fields: ServiceFieldErrors = {};

  const conflictingNameTag = await tagRepository
    .createQueryBuilder("tag")
    .where("LOWER(tag.name) = LOWER(:name)", { name: options.name })
    .andWhere(options.tagId ? "tag.id <> :tagId" : "1 = 1", { tagId: options.tagId })
    .getOne();

  if (conflictingNameTag) {
    fields.name = ["Tag name already exists."];
  }

  const conflictingSlugTag = await tagRepository.findOne({
    where: options.tagId
      ? {
        slug: options.slug,
        id: Not(options.tagId),
      }
      : {
        slug: options.slug,
      },
  });

  if (conflictingSlugTag && conflictingSlugTag.id !== options.tagId) {
    fields.slug = ["Tag slug already exists."];
  }

  if (Object.keys(fields).length > 0) {
    throw buildTagConflictError(fields);
  }
}

export function createTagService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async getTagBySlug(slug: string): Promise<TagListItem> {
      const dataSource = await dataSourceFactory();
      const normalizedSlug = slug.trim();

      if (normalizedSlug.length === 0) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Tag not found.",
          statusCode: 404,
        });
      }

      const tag = await dataSource.getRepository(Tag).findOneBy({ slug: normalizedSlug });

      if (!tag) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.NOT_FOUND,
          message: "Tag not found.",
          statusCode: 404,
        });
      }

      return mapTagListItem(tag);
    },

    async listTags(): Promise<TagListItem[]> {
      const dataSource = await dataSourceFactory();
      const tagRepository = dataSource.getRepository(Tag);
      const tags = await tagRepository.find({
        order: {
          name: "ASC",
        },
      });

      return tags.map(mapTagListItem);
    },

    async createTag({ input }: CreateTagParams): Promise<TagRecord> {
      const dataSource = await dataSourceFactory();
      const tagRepository = dataSource.getRepository(Tag);
      const slug = slugify(input.slug ?? input.name, "tag");

      await assertTagUniqueness(dataSource, {
        name: input.name,
        slug,
      });

      const tag = tagRepository.create({
        name: input.name,
        slug,
      });

      return mapTagRecord(await tagRepository.save(tag));
    },

    async updateTag({ tagId, input }: UpdateTagParams): Promise<TagRecord> {
      const dataSource = await dataSourceFactory();
      const tagRepository = dataSource.getRepository(Tag);
      const existingTag = await loadTagOrThrow(dataSource, tagId);
      const nextName = input.name ?? existingTag.name;
      const nextSlug = input.slug === undefined ? existingTag.slug : slugify(input.slug, "tag");

      await assertTagUniqueness(dataSource, {
        tagId,
        name: nextName,
        slug: nextSlug,
      });

      const updatedTag = tagRepository.merge(existingTag, {
        name: nextName,
        slug: nextSlug,
      });

      return mapTagRecord(await tagRepository.save(updatedTag));
    },

    async deleteTag(tagId: string): Promise<void> {
      const dataSource = await dataSourceFactory();
      const tagRepository = dataSource.getRepository(Tag);

      await loadTagOrThrow(dataSource, tagId);
      await tagRepository.delete({ id: tagId });
    },
  };
}

export const tagService = createTagService();
