"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Check,
  ExternalLink,
  FilePenLine,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Tags,
  Upload,
} from "lucide-react";

import { DeletePostButton } from "@/components/admin/delete-post-button";
import { MdxCodeEditor } from "@/components/admin/mdx-code-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PostStatus } from "@/entities/post.entity";
import { calculateReadingTimeFromMdx, countWordsInMdx } from "@/lib/reading-time";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

export type PostEditorTagOption = {
  id: string;
  name: string;
  slug: string;
};

export type PostEditorInitialData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentMdx: string;
  coverImageUrl: string | null;
  status: PostStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type PostEditorFormProps = {
  availableTags: PostEditorTagOption[];
  initialData?: PostEditorInitialData;
  mode: "create" | "edit";
  variant?: "admin" | "writer";
  postsListHref?: string;
  postsApiBasePath?: string;
  mediaSignPath?: string;
  mediaSavePath?: string;
};

type PostEditorFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  contentMdx: string;
  coverImageUrl: string;
  status: PostStatus;
  seoTitle: string;
  seoDescription: string;
  tagIds: string[];
  sendNewsletter: boolean;
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
  requestId?: string;
};

type SavedPostResponse = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentMdx: string;
  coverImageUrl: string | null;
  status: PostStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type SignedUploadPayloadResponse = {
  apiKey: string;
  folder: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  error?: {
    message?: string;
  };
};

type SavedMediaAssetResponse = {
  id: string;
  url: string;
  publicId: string;
  alt: string | null;
  width: number;
  height: number;
  uploadedById: string;
  createdAt: string;
};

type SaveTrigger = "manual" | "autosave";
type ImageInsertTarget = "cover" | "content";

const statusOptions = [
  {
    label: "Draft (Nháp)",
    hint: "Lưu để biên tập tiếp",
    value: PostStatus.DRAFT,
  },
  {
    label: "Published (Công khai)",
    hint: "Công khai ngay sau khi lưu",
    value: PostStatus.PUBLISHED,
  },
] as const;

const AUTO_SAVE_DEBOUNCE_MS = 1200;

function createInitialFormValues(initialData?: PostEditorInitialData): PostEditorFormValues {
  return {
    title: initialData?.title ?? "",
    slug: initialData?.slug ?? "",
    excerpt: initialData?.excerpt ?? "",
    contentMdx: initialData?.contentMdx ?? "",
    coverImageUrl: initialData?.coverImageUrl ?? "",
    status: initialData?.status ?? PostStatus.DRAFT,
    seoTitle: initialData?.seoTitle ?? "",
    seoDescription: initialData?.seoDescription ?? "",
    tagIds: initialData?.tagIds ?? [],
    sendNewsletter: true,
  };
}

function createSavePayload(formValues: PostEditorFormValues, omitPublishFields = false) {
  const payload = {
    title: formValues.title,
    slug: formValues.slug,
    excerpt: formValues.excerpt,
    contentMdx: formValues.contentMdx,
    coverImageUrl: formValues.coverImageUrl,
    seoTitle: formValues.seoTitle,
    seoDescription: formValues.seoDescription,
    tagIds: formValues.tagIds,
  };

  if (omitPublishFields) {
    return payload;
  }

  return {
    ...payload,
    status: formValues.status,
    sendNewsletter: formValues.sendNewsletter,
  };
}

function serializeFormValues(formValues: PostEditorFormValues, omitPublishFields = false) {
  return JSON.stringify(createSavePayload(formValues, omitPublishFields));
}

function hasRequiredDraftFields(formValues: PostEditorFormValues) {
  return formValues.title.trim().length > 0 && formValues.contentMdx.trim().length > 0;
}

function deriveImageAltText(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalizedText = withoutExtension.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

  return normalizedText.length > 0 ? normalizedText : "Image";
}

function buildImageMdxSnippet(url: string, altText: string) {
  return `![${altText}](${url})`;
}

function appendMdxImage(currentContent: string, imageSnippet: string) {
  const trimmedContent = currentContent.trimEnd();
  const separator = trimmedContent.length > 0 ? "\n\n" : "";

  return `${trimmedContent}${separator}${imageSnippet}\n`;
}

function mapSavedPostToInitialData(savedPost: SavedPostResponse): PostEditorInitialData {
  return {
    id: savedPost.id,
    title: savedPost.title,
    slug: savedPost.slug,
    excerpt: savedPost.excerpt,
    contentMdx: savedPost.contentMdx,
    coverImageUrl: savedPost.coverImageUrl,
    status: savedPost.status,
    seoTitle: savedPost.seoTitle,
    seoDescription: savedPost.seoDescription,
    tagIds: savedPost.tagIds,
    createdAt: savedPost.createdAt,
    updatedAt: savedPost.updatedAt,
    publishedAt: savedPost.publishedAt,
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
}

function getTogglePublishStatus(currentStatus: PostStatus) {
  return currentStatus === PostStatus.PUBLISHED ? PostStatus.DRAFT : PostStatus.PUBLISHED;
}

function Field({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

function FieldHeader({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function FieldLabel({
  hint,
  htmlFor,
  label,
}: {
  hint?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label
        className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

export function PostEditorForm({
  availableTags,
  initialData,
  mode,
  variant = "admin",
  postsListHref = "/admin/posts",
  postsApiBasePath = "/api/admin/posts",
  mediaSignPath = "/api/admin/media/sign",
  mediaSavePath = "/api/admin/media",
}: PostEditorFormProps) {
  const isWriterVariant = variant === "writer";
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();
  const [formValues, setFormValues] = useState(() => createInitialFormValues(initialData));
  const [currentPost, setCurrentPost] = useState<PostEditorInitialData | undefined>(initialData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCoverImage, setIsUploadingCoverImage] = useState(false);
  const [isUploadingContentImage, setIsUploadingContentImage] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "pending" | "saving" | "error">(
    "idle"
  );
  const coverImageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const contentImageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const autoSaveControllerRef = useRef<AbortController | null>(null);
  const autoSaveRequestIdRef = useRef(0);
  const persistPostRef = useRef<
    ((trigger: SaveTrigger, valuesOverride?: PostEditorFormValues) => Promise<boolean>) | null
  >(null);
  const lastSavedSnapshotRef = useRef<string | null>(
    initialData
      ? serializeFormValues(createInitialFormValues(initialData), isWriterVariant)
      : null
  );

  const wordCount = countWordsInMdx(formValues.contentMdx);
  const readingTime = calculateReadingTimeFromMdx(formValues.contentMdx);
  const selectedTags = availableTags.filter((tag) => formValues.tagIds.includes(tag.id));
  const hasCoverImage = formValues.coverImageUrl.trim().length > 0;
  const isUploadingImage = isUploadingCoverImage || isUploadingContentImage;
  const isBusy = isSubmitting || isRouting || isUploadingImage;
  const currentStatusMeta = statusOptions.find((option) => option.value === formValues.status);
  const autoSaveStatusMessage =
    autoSaveState === "pending"
      ? "Dang cho tu dong luu nhap..."
      : autoSaveState === "saving"
        ? "Dang tu dong luu nhap..."
        : autoSaveState === "error"
          ? "Auto-save gap loi. Hay luu thu cong."
          : null;

  function updateField<K extends keyof PostEditorFormValues>(
    field: K,
    value: PostEditorFormValues[K]
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));

    setMediaMessage(null);
    setSaveMessage(null);
    setFormMessage(null);

    setFieldErrors((currentErrors) => {
      if (!(field in currentErrors)) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function toggleTag(tagId: string) {
    const nextTagIds = formValues.tagIds.includes(tagId)
      ? formValues.tagIds.filter((currentTagId) => currentTagId !== tagId)
      : [...formValues.tagIds, tagId];

    updateField("tagIds", nextTagIds);
  }

  function applySavedPost(savedPost: SavedPostResponse) {
    const normalizedPost = mapSavedPostToInitialData(savedPost);
    const nextFormValues = createInitialFormValues(normalizedPost);

    setCurrentPost(normalizedPost);
    setFormValues(nextFormValues);
    setFieldErrors({});
    lastSavedSnapshotRef.current = serializeFormValues(nextFormValues, isWriterVariant);
  }

  function getFieldError(fieldName: keyof PostEditorFormValues | "tagIds") {
    return fieldErrors[fieldName]?.[0];
  }

  function abortInFlightAutoSave() {
    autoSaveControllerRef.current?.abort();
    autoSaveControllerRef.current = null;
  }

  async function persistPost(
    trigger: SaveTrigger,
    valuesOverride?: PostEditorFormValues
  ): Promise<boolean> {
    const values = valuesOverride ?? formValues;
    const isCreatingPost = !currentPost;

    if (trigger === "autosave") {
      if (!isWriterVariant && values.status !== PostStatus.DRAFT) {
        return false;
      }

      if (isCreatingPost && !hasRequiredDraftFields(values)) {
        return false;
      }
    }

    if (trigger === "manual") {
      autoSaveRequestIdRef.current += 1;
      setAutoSaveState("idle");
      setIsAutoSaving(false);
      setMediaMessage(null);
      setFormMessage(null);
      setSaveMessage(null);
    }

    abortInFlightAutoSave();

    if (trigger === "manual") {
      setIsSubmitting(true);
    } else {
      setIsAutoSaving(true);
      setAutoSaveState("saving");
    }

    let autoSaveRequestId: number | null = null;
    let autoSaveController: AbortController | null = null;

    if (trigger === "autosave") {
      autoSaveRequestId = autoSaveRequestIdRef.current + 1;
      autoSaveRequestIdRef.current = autoSaveRequestId;
      autoSaveController = new AbortController();
      autoSaveControllerRef.current = autoSaveController;
    }

    try {
      const endpoint = isCreatingPost
        ? postsApiBasePath
        : `${postsApiBasePath}/${currentPost?.id ?? ""}`;
      const method = isCreatingPost ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createSavePayload(values, isWriterVariant)),
        signal: autoSaveController?.signal,
      });
      const responseBody = await parseJsonResponse<SavedPostResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        const errorBody = responseBody as ApiErrorResponse | null;

        setFieldErrors(errorBody?.fields ?? {});
        setFormMessage(
          errorBody?.message ?? "Không thể lưu bài viết lúc này. Vui lòng thử lại."
        );

        if (trigger === "autosave") {
          setAutoSaveState("error");
        }

        return false;
      }

      if (!responseBody) {
        setFormMessage("API đã trả về một phản hồi không hợp lệ. Vui lòng thử lại.");

        if (trigger === "autosave") {
          setAutoSaveState("error");
        }

        return false;
      }

      const savedPost = responseBody as SavedPostResponse;
      applySavedPost(savedPost);
      setSaveMessage(`Đã lưu lúc ${formatDateTime(savedPost.updatedAt)}`);
      setAutoSaveState("idle");

      if (isCreatingPost) {
        startTransition(() => {
          router.replace(`${postsListHref}/${savedPost.id}`);
          router.refresh();
        });
        return true;
      }

      if (trigger === "manual") {
        startTransition(() => {
          router.refresh();
        });
      }

      return true;
    } catch (error) {
      if (trigger === "autosave" && error instanceof Error && error.name === "AbortError") {
        return false;
      }

      setFormMessage("Không thể kết nối đến API lưu bài viết. Vui lòng thử lại.");

      if (trigger === "autosave") {
        setAutoSaveState("error");
      }

      return false;
    } finally {
      if (trigger === "manual") {
        setIsSubmitting(false);
      } else {
        if (autoSaveRequestId === autoSaveRequestIdRef.current) {
          if (autoSaveControllerRef.current === autoSaveController) {
            autoSaveControllerRef.current = null;
          }

          setIsAutoSaving(false);
        }
      }
    }
  }

  persistPostRef.current = persistPost;

  useEffect(() => {
    if (!isWriterVariant && formValues.status !== PostStatus.DRAFT) {
      setAutoSaveState("idle");
      return;
    }

    if (isSubmitting || isRouting || isAutoSaving) {
      return;
    }

    if (!currentPost && !hasRequiredDraftFields(formValues)) {
      return;
    }

    const serializedFormValues = serializeFormValues(formValues, isWriterVariant);

    if (lastSavedSnapshotRef.current === serializedFormValues) {
      setAutoSaveState("idle");
      return;
    }

    setAutoSaveState("pending");

    const timerId = window.setTimeout(() => {
      void persistPostRef.current?.("autosave");
    }, AUTO_SAVE_DEBOUNCE_MS);

    autoSaveTimerRef.current = timerId;

    return () => {
      window.clearTimeout(timerId);

      if (autoSaveTimerRef.current === timerId) {
        autoSaveTimerRef.current = null;
      }
    };
  }, [
    currentPost,
    formValues,
    isAutoSaving,
    isRouting,
    isSubmitting,
    isWriterVariant,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveControllerRef.current?.abort();
      autoSaveControllerRef.current = null;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    await persistPost("manual");
  }

  async function handleTogglePublish() {
    const nextStatus = getTogglePublishStatus(formValues.status);
    const nextFormValues = {
      ...formValues,
      status: nextStatus,
    };

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    await persistPost("manual", nextFormValues);
  }

  function openImageFilePicker(target: ImageInsertTarget) {
    if (isBusy) {
      return;
    }

    if (target === "cover") {
      coverImageUploadInputRef.current?.click();
      return;
    }

    contentImageUploadInputRef.current?.click();
  }

  function insertUploadedImageIntoContent(url: string, altText: string) {
    const imageSnippet = buildImageMdxSnippet(url, altText);

    setFormValues((currentValues) => ({
      ...currentValues,
      contentMdx: appendMdxImage(currentValues.contentMdx, imageSnippet),
    }));
    setSaveMessage(null);
    setFormMessage(null);

    setFieldErrors((currentErrors) => {
      if (!("contentMdx" in currentErrors)) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors.contentMdx;
      return nextErrors;
    });
  }

  async function uploadImageToCloudinary(file: File, target: ImageInsertTarget) {
    if (!file.type.startsWith("image/")) {
      setFormMessage("Chi co the upload file anh (image/*).");
      setMediaMessage(null);
      return;
    }

    if (target === "cover") {
      setIsUploadingCoverImage(true);
    } else {
      setIsUploadingContentImage(true);
    }

    setMediaMessage(null);
    setFormMessage(null);

    const fallbackAltText = deriveImageAltText(file.name);

    try {
      const signResponse = await fetch(mediaSignPath, {
        method: "POST",
      });
      const signResponseBody = await parseJsonResponse<
        SignedUploadPayloadResponse | ApiErrorResponse
      >(signResponse);

      if (!signResponse.ok) {
        const signErrorBody = signResponseBody as ApiErrorResponse | null;
        setFormMessage(
          signErrorBody?.message ?? "Không thể tạo chữ ký upload Cloudinary lúc này."
        );
        return;
      }

      if (!signResponseBody) {
        setFormMessage("API sign upload trả về dữ liệu không hợp lệ.");
        return;
      }

      const signedUploadPayload = signResponseBody as SignedUploadPayloadResponse;
      const cloudinaryPayload = new FormData();
      cloudinaryPayload.set("file", file);
      cloudinaryPayload.set("api_key", signedUploadPayload.apiKey);
      cloudinaryPayload.set("folder", signedUploadPayload.folder);
      cloudinaryPayload.set("timestamp", String(signedUploadPayload.timestamp));
      cloudinaryPayload.set("signature", signedUploadPayload.signature);

      const cloudinaryResponse = await fetch(signedUploadPayload.uploadUrl, {
        method: "POST",
        body: cloudinaryPayload,
      });
      const cloudinaryResponseBody = await parseJsonResponse<CloudinaryUploadResponse>(
        cloudinaryResponse
      );

      if (!cloudinaryResponse.ok) {
        setFormMessage(
          cloudinaryResponseBody?.error?.message ??
          "Cloudinary từ chối upload. Vui lòng thử lại."
        );
        return;
      }

      const uploadedUrl = cloudinaryResponseBody?.secure_url ?? cloudinaryResponseBody?.url;
      const uploadedPublicId = cloudinaryResponseBody?.public_id;
      const uploadedWidth = Number(
        (cloudinaryResponseBody as { width?: unknown } | null | undefined)?.width
      );
      const uploadedHeight = Number(
        (cloudinaryResponseBody as { height?: unknown } | null | undefined)?.height
      );

      if (
        !uploadedUrl ||
        !uploadedPublicId ||
        !Number.isFinite(uploadedWidth) ||
        !Number.isFinite(uploadedHeight)
      ) {
        setFormMessage("Dữ liệu upload Cloudinary không đầy đủ. Vui lòng thử lại.");
        return;
      }

      const saveMediaResponse = await fetch(mediaSavePath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: uploadedUrl,
          publicId: uploadedPublicId,
          alt: fallbackAltText,
          width: Math.round(uploadedWidth),
          height: Math.round(uploadedHeight),
        }),
      });
      const saveMediaResponseBody = await parseJsonResponse<
        SavedMediaAssetResponse | ApiErrorResponse
      >(saveMediaResponse);

      if (!saveMediaResponse.ok) {
        const mediaErrorBody = saveMediaResponseBody as ApiErrorResponse | null;
        setFormMessage(
          mediaErrorBody?.message ?? "Không thể lưu metadata media vào DB lúc này."
        );
        return;
      }

      if (!saveMediaResponseBody) {
        setFormMessage("API media trả về dữ liệu không hợp lệ.");
        return;
      }

      const savedMedia = saveMediaResponseBody as SavedMediaAssetResponse;
      const imageAltText = savedMedia.alt ?? fallbackAltText;

      if (target === "cover") {
        updateField("coverImageUrl", savedMedia.url);
        setMediaMessage("Đã upload ảnh lên Cloudinary và cập nhật cover image.");
        return;
      }

      insertUploadedImageIntoContent(savedMedia.url, imageAltText);
      setMediaMessage("Đã upload ảnh lên Cloudinary và chèn link vào Content MDX.");
    } catch {
      setFormMessage("Không thể kết nối đến dịch vụ upload ảnh. Vui lòng thử lại.");
    } finally {
      if (target === "cover") {
        setIsUploadingCoverImage(false);
      } else {
        setIsUploadingContentImage(false);
      }
    }
  }

  async function handleImageFileChange(
    event: ChangeEvent<HTMLInputElement>,
    target: ImageInsertTarget
  ) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    await uploadImageToCloudinary(selectedFile, target);
  }

  return (
    <form className="min-w-0 w-full max-w-full space-y-6 overflow-x-hidden" onSubmit={handleSubmit}>
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageFileChange(event, "cover");
        }}
        ref={coverImageUploadInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleImageFileChange(event, "content");
        }}
        ref={contentImageUploadInputRef}
        type="file"
      />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              <FilePenLine className="size-3.5" />
              {mode === "create" ? "Tạo bài viết" : "Chỉnh sửa bài viết"}
            </div>
            <div className="space-y-2">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {mode === "create" ? "Tạo bài viết mới" : "Chỉnh sửa bài viết"}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {isWriterVariant
                  ? "Lưu draft tại đây. Admin sẽ publish bài khi sẵn sàng. Bạn không thể tự publish."
                  : "Form này đang nối trực tiếp vào admin APIs cho post create và update. Auto-save draft, publish toggle và media upload đã sẵn sàng cho workflow editor."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "lg",
                }),
                "rounded-2xl border-border bg-muted/40 px-5 text-foreground hover:bg-muted/70"
              )}
              href={postsListHref}
            >
              Quay lại danh sách
            </Link>
            <Button
              className="rounded-2xl bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              disabled={isBusy}
              size="lg"
              type="submit"
            >
              {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {mode === "create" ? "Tạo bài viết" : "Lưu thay đổi"}
            </Button>
            {mode === "edit" && currentPost ? (
              <DeletePostButton
                deleteUrl={`${postsApiBasePath}/${currentPost.id}`}
                postId={currentPost.id}
                postTitle={currentPost.title}
                redirectTo={postsListHref}
                size="lg"
                variant="outline"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
              formValues.status === PostStatus.PUBLISHED
                ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
                : "border-amber-600/25 bg-amber-500/10 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
            )}
          >
            {formValues.status}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {readingTime > 0 ? `${readingTime} phút đọc` : "Chưa có thời gian đọc"}
          </span>
          {saveMessage ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-100">
              <Check className="size-3.5" />
              {saveMessage}
            </span>
          ) : null}
          {autoSaveStatusMessage ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                autoSaveState === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-primary"
              )}
            >
              {autoSaveState === "saving" ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {autoSaveStatusMessage}
            </span>
          ) : null}
          {currentStatusMeta ? (
            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              {currentStatusMeta.hint}
            </span>
          ) : null}
        </div>
      </section>

      {formMessage ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {formMessage}
        </div>
      ) : null}
      {mediaMessage ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4 text-sm text-primary">
          {mediaMessage}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 max-w-full space-y-6 overflow-hidden">
          <Field>
            <FieldHeader
              description="Phần nội dung chính của bài viết, bao gồm title, slug, excerpt và MDX body."
              title="Nội dung bài viết"
            />

            <div className="grid min-w-0 gap-5">
              <div className="min-w-0">
                <FieldLabel htmlFor="title" hint="Bắt buộc" label="Tiêu đề" />
                <Input
                  aria-invalid={Boolean(getFieldError("title"))}
                  className="max-w-full"
                  id="title"
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="VD: Cách xây dựng CMS nhỏ gọn cho blog cá nhân"
                  value={formValues.title}
                />
                <FieldError message={getFieldError("title")} />
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
                    htmlFor="slug"
                  >
                    Slug (URL)
                  </label>
                  <button
                    className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-primary transition hover:text-primary/80"
                    onClick={(event) => {
                      event.preventDefault();
                      updateField("slug", formValues.title.trim().length > 0 ? slugify(formValues.title) : "");
                    }}
                    type="button"
                  >
                    <RefreshCw className="size-3.5" />
                    Tạo lại từ tiêu đề
                  </button>
                </div>
                <Input
                  aria-invalid={Boolean(getFieldError("slug"))}
                  className="max-w-full"
                  id="slug"
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="bo-trong-de-server-tu-sinh-slug"
                  value={formValues.slug}
                />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Nếu trống, server sẽ tự tạo slug unique từ tiêu đề.
                </p>
                <FieldError message={getFieldError("slug")} />
              </div>

              <div className="min-w-0">
                <FieldLabel htmlFor="excerpt" hint={`${formValues.excerpt.length}/500`} label="Tóm tắt" />
                <Textarea
                  aria-invalid={Boolean(getFieldError("excerpt"))}
                  className="min-h-28 max-w-full"
                  id="excerpt"
                  onChange={(event) => updateField("excerpt", event.target.value)}
                  placeholder="Tóm tắt ngắn gọn để hiển thị trong danh sách bài viết và SEO."
                  value={formValues.excerpt}
                />
                <FieldError message={getFieldError("excerpt")} />
              </div>

              <div className="min-w-0">
                <FieldLabel
                  htmlFor="contentMdx"
                  hint={`${wordCount} từ`}
                  label="Nội dung MDX"
                />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-xl border-border bg-muted/40 text-foreground hover:bg-muted/70"
                    disabled={isBusy}
                    onClick={() => {
                      openImageFilePicker("content");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isUploadingContentImage ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    Upload ảnh và chèn vào bài viết
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Ảnh sẽ được upload Cloudinary, lưu metadata vào DB, rồi chèn link vào MDX.
                  </span>
                </div>
                <MdxCodeEditor
                  appearance={isWriterVariant ? "auto" : "dark"}
                  className={cn(
                    "min-w-0 max-w-full",
                    Boolean(getFieldError("contentMdx")) && "rounded-xl ring-2 ring-destructive/40"
                  )}
                  id="contentMdx"
                  onChange={(value) => updateField("contentMdx", value)}
                  value={formValues.contentMdx}
                />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Thời gian đọc sẽ được tính lại từ nội dung MDX mỗi lần lưu.
                </p>
                <FieldError message={getFieldError("contentMdx")} />
              </div>
            </div>
          </Field>

          <Field>
            <FieldHeader
              description="Thông tin bổ sung cho cover, phân loại và SEO."
              title="Meta và SEO"
            />

            <div className="grid min-w-0 gap-5">
              <div className="min-w-0">
                <FieldLabel
                  htmlFor="coverImageUrl"
                  label="URL ảnh cover"
                />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-xl border-border bg-muted/40 text-foreground hover:bg-muted/70"
                    disabled={isBusy}
                    onClick={() => {
                      openImageFilePicker("cover");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {isUploadingCoverImage ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    Upload ảnh cover từ máy
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Upload xong sẽ tự cập nhật trường URL ảnh cover.
                  </span>
                </div>
                <Input
                  aria-invalid={Boolean(getFieldError("coverImageUrl"))}
                  className="max-w-full"
                  id="coverImageUrl"
                  onChange={(event) => updateField("coverImageUrl", event.target.value)}
                  placeholder="https://images.example.com/cover.jpg"
                  type="url"
                  value={formValues.coverImageUrl}
                />
                <FieldError message={getFieldError("coverImageUrl")} />
              </div>

              <div>
                <FieldLabel htmlFor="seoTitle" hint={`${formValues.seoTitle.length}/255`} label="SEO title" />
                <Input
                  aria-invalid={Boolean(getFieldError("seoTitle"))}
                  id="seoTitle"
                  onChange={(event) => updateField("seoTitle", event.target.value)}
                  placeholder="Tiêu đề riêng cho SEO nếu cần"
                  value={formValues.seoTitle}
                />
                <FieldError message={getFieldError("seoTitle")} />
              </div>

              <div>
                <FieldLabel
                  htmlFor="seoDescription"
                  hint={`${formValues.seoDescription.length}/320`}
                  label="Mô tả SEO"
                />
                <Textarea
                  aria-invalid={Boolean(getFieldError("seoDescription"))}
                  className="min-h-28"
                  id="seoDescription"
                  onChange={(event) => updateField("seoDescription", event.target.value)}
                  placeholder="Mô tả ngắn để tối ưu meta description."
                  value={formValues.seoDescription}
                />
                <FieldError message={getFieldError("seoDescription")} />
              </div>
            </div>
          </Field>
        </div>

        <div className="min-w-0 max-w-full space-y-6 xl:sticky xl:top-4 xl:self-start">
          <Field>
            <FieldHeader
              description={
                isWriterVariant
                  ? "Trạng thái publish do admin quản lý. Bạn chỉ lưu nội dung draft."
                  : "Điều khiển trạng thái publish và theo dõi metadata hiện tại của bài viết."
              }
              title={isWriterVariant ? "Trạng thái" : "Publish"}
            />

            <div className="space-y-5">
              {isWriterVariant ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Draft workflow
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Bài viết của bạn được lưu dưới dạng draft. Admin sẽ publish khi nội dung sẵn sàng.
                    Trạng thái hiện tại: <span className="font-medium text-foreground">{formValues.status}</span>
                    {currentPost?.publishedAt
                      ? ` · đã publish lúc ${formatDateTime(currentPost.publishedAt)}`
                      : null}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Hành động nhanh
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formValues.status === PostStatus.PUBLISHED
                        ? "Unpublish sẽ đưa bài viết về Draft và xóa thời gian publish hiện tại."
                        : "Publish sẽ công khai bài viết và đặt thời gian publish theo server rules."}
                    </p>
                    <Button
                      className={cn(
                        "mt-4 w-full rounded-xl",
                        formValues.status === PostStatus.PUBLISHED
                          ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      disabled={isBusy}
                      onClick={() => {
                        void handleTogglePublish();
                      }}
                      type="button"
                      variant={formValues.status === PostStatus.PUBLISHED ? "outline" : "default"}
                    >
                      {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {formValues.status === PostStatus.PUBLISHED ? "Unpublish" : "Publish"}
                    </Button>
                    {formValues.status !== PostStatus.PUBLISHED &&
                    currentPost?.status !== PostStatus.PUBLISHED ? (
                      <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm leading-5 text-muted-foreground">
                        <input
                          checked={formValues.sendNewsletter}
                          className="mt-0.5 size-4 rounded border-input"
                          disabled={isBusy}
                          onChange={(event) => {
                            updateField("sendNewsletter", event.target.checked);
                          }}
                          type="checkbox"
                        />
                        <span>Gửi newsletter khi publish (chỉ lần đầu)</span>
                      </label>
                    ) : null}
                  </div>

                  <div>
                    <FieldLabel htmlFor="status" label="Trạng thái" />
                    <Select
                      onValueChange={(value) => {
                        updateField("status", value as PostStatus);
                      }}
                      value={formValues.status}
                    >
                      <SelectTrigger
                        aria-invalid={Boolean(getFieldError("status"))}
                        className="w-full"
                        id="status"
                        size="default"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError message={getFieldError("status")} />
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {formatDateTime(currentPost?.createdAt ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Updated
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {formatDateTime(currentPost?.updatedAt ?? null)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2 xl:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Published
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {formatDateTime(currentPost?.publishedAt ?? null)}
                  </p>
                </div>
              </div>
            </div>
          </Field>

          <Field>
            <FieldHeader
              description="Gán tag để phân loại bài viết. Có thể bỏ trống nếu chưa cần."
              title="Tags (Phân loại)"
            />

            {availableTags.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {isWriterVariant
                    ? "Chưa có tag nào. Liên hệ admin để tạo tag trước."
                    : "Chưa có tag nào trong hệ thống. Tạo tag trước để editor này hoàn chỉnh hơn."}
                </p>
                {!isWriterVariant ? (
                  <Link
                    className={cn(
                      buttonVariants({
                        variant: "outline",
                        size: "sm",
                      }),
                      "w-fit rounded-xl border-border bg-muted/40 text-foreground hover:bg-muted/70"
                    )}
                    href="/admin/tags"
                  >
                    Đi tới trang tags
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = formValues.tagIds.includes(tag.id);

                    return (
                      <button
                        key={tag.id}
                        aria-pressed={isSelected}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
                          isSelected
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70"
                        )}
                        onClick={() => toggleTag(tag.id)}
                        type="button"
                      >
                        <Tags className="size-3.5" />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Đang chọn {selectedTags.length} tag.
                  {selectedTags.length > 0
                    ? ` ${selectedTags.map((tag) => tag.slug).join(", ")}`
                    : ""}
                </p>
                <FieldError message={getFieldError("tagIds")} />
              </div>
            )}
          </Field>

          <Field>
            <FieldHeader
              description="Preview nhanh một vài metadata để editor để quan sát hon trong lúc viết."
              title="Quick Preview (Xem trước)"
            />

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Từ
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{wordCount}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Thời gian đọc
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{readingTime}m</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Tags (Phân loại)
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{selectedTags.length}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Cover Preview (Xem trước ảnh cover)
                </p>
                {hasCoverImage ? (
                  <div className="mt-3 space-y-3">
                    <div className="overflow-hidden rounded-[1.2rem] border border-border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Cover preview"
                        className="aspect-16/10 w-full object-cover"
                        src={formValues.coverImageUrl}
                      />
                    </div>
                    <a
                      className="inline-flex items-center gap-2 text-sm text-primary transition hover:text-primary/80"
                      href={formValues.coverImageUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Mở ảnh gốc
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Chưa có ảnh cover. Bạn có thể upload trực tiếp từ editor để cập nhật cover.
                  </p>
                )}
              </div>
            </div>
          </Field>
        </div>
      </div>
    </form>
  );
}
