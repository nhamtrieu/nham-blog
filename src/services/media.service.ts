import { initializeDataSource } from "@/db/data-source";
import { MediaAsset } from "@/entities/media-asset.entity";
import { User } from "@/entities/user.entity";
import {
  SERVICE_ERROR_CODES,
  ServiceError,
} from "@/services/service-error";

type DataSourceFactory = typeof initializeDataSource;

export type CreateMediaAssetInput = {
  url: string;
  publicId: string;
  alt?: string | null;
  width: number;
  height: number;
  uploadedById: string;
};

export type MediaAssetRecord = {
  id: string;
  url: string;
  publicId: string;
  alt: string | null;
  width: number;
  height: number;
  uploadedById: string | null;
  createdAt: Date;
};

function normalizeAlt(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function mapMediaAssetRecord(mediaAsset: MediaAsset) {
  return {
    id: mediaAsset.id,
    url: mediaAsset.url,
    publicId: mediaAsset.publicId,
    alt: mediaAsset.alt,
    width: mediaAsset.width,
    height: mediaAsset.height,
    uploadedById: mediaAsset.uploadedById,
    createdAt: mediaAsset.createdAt,
  } satisfies MediaAssetRecord;
}

async function assertUploaderExists(
  dataSource: Awaited<ReturnType<DataSourceFactory>>,
  uploadedById: string
) {
  const userRepository = dataSource.getRepository(User);
  const uploaderExists = await userRepository.existsBy({ id: uploadedById });

  if (uploaderExists) {
    return;
  }

  throw new ServiceError({
    code: SERVICE_ERROR_CODES.INVALID_REFERENCE,
    message: "Uploader does not exist.",
    statusCode: 400,
    fields: {
      uploadedById: ["Uploader does not exist."],
    },
  });
}

export function createMediaService(dataSourceFactory: DataSourceFactory = initializeDataSource) {
  return {
    async createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
      const dataSource = await dataSourceFactory();
      const mediaAssetRepository = dataSource.getRepository(MediaAsset);

      await assertUploaderExists(dataSource, input.uploadedById);

      const existingMediaAsset = await mediaAssetRepository.findOneBy({
        publicId: input.publicId,
      });

      if (existingMediaAsset) {
        throw new ServiceError({
          code: SERVICE_ERROR_CODES.CONFLICT,
          message: "Media asset public ID already exists.",
          statusCode: 409,
          fields: {
            publicId: ["Media asset public ID already exists."],
          },
        });
      }

      const mediaAsset = mediaAssetRepository.create({
        url: input.url,
        publicId: input.publicId,
        alt: normalizeAlt(input.alt),
        width: input.width,
        height: input.height,
        uploadedById: input.uploadedById,
      });

      return mapMediaAssetRecord(await mediaAssetRepository.save(mediaAsset));
    },
  };
}

export const mediaService = createMediaService();
