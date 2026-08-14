"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AccountProfile } from "@/services/account-profile.service";

type AccountProfileFormProps = {
  initialProfile: AccountProfile;
};

type ApiErrorResponse = {
  message?: string;
  fields?: Record<string, string[]>;
};

type SignedUploadPayloadResponse = {
  allowedFormats?: string;
  apiKey: string;
  folder: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  error?: {
    message?: string;
  };
};

const LINK_FIELDS = [
  { key: "twitter", label: "Twitter" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "Tiktok" },
  { key: "personal", label: "Personal" },
  { key: "github", label: "Github" },
  { key: "youtube", label: "Youtube" },
  { key: "linkedin", label: "Linkedin" },
] as const;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPT = "image/jpeg,image/png,.jpg,.jpeg,.png";
const AVATAR_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

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

function getAvatarInitial(profile: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  const source =
    profile.firstName?.trim() ||
    profile.lastName?.trim() ||
    profile.name?.trim() ||
    profile.email;

  return source.slice(0, 1).toUpperCase();
}

export function AccountProfileForm({ initialProfile }: AccountProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialProfile.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile.lastName ?? "");
  const [jobTitle, setJobTitle] = useState(initialProfile.jobTitle ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl ?? "");
  const [links, setLinks] = useState<Record<(typeof LINK_FIELDS)[number]["key"], string>>({
    twitter: initialProfile.links.twitter ?? "",
    facebook: initialProfile.links.facebook ?? "",
    tiktok: initialProfile.links.tiktok ?? "",
    personal: initialProfile.links.personal ?? "",
    github: initialProfile.links.github ?? "",
    youtube: initialProfile.links.youtube ?? "",
    linkedin: initialProfile.links.linkedin ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving || isUploadingAvatar) {
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          jobTitle,
          bio,
          avatarUrl,
          links,
        }),
      });
      const responseBody = await parseJsonResponse<
        ApiErrorResponse & { profile?: AccountProfile }
      >(response);

      if (!response.ok) {
        setFieldErrors(responseBody?.fields ?? {});
        toast.error(responseBody?.message ?? "Không thể lưu hồ sơ lúc này.");
        return;
      }

      const profile = responseBody?.profile;
      if (profile) {
        await update({
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        });
        router.refresh();
      }

      toast.success("Đã lưu thay đổi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isUploadingAvatar || isSaving) {
      return;
    }

    if (!AVATAR_ALLOWED_MIME_TYPES.has(file.type)) {
      toast.error("Chỉ hỗ trợ JPG hoặc PNG.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Ảnh avatar tối đa 2MB.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const signResponse = await fetch("/api/account/avatar/sign", {
        method: "POST",
      });
      const signResponseBody = await parseJsonResponse<
        SignedUploadPayloadResponse & ApiErrorResponse
      >(signResponse);

      if (!signResponse.ok || !signResponseBody?.uploadUrl) {
        toast.error(signResponseBody?.message ?? "Không thể tạo chữ ký upload.");
        return;
      }

      const cloudinaryPayload = new FormData();
      cloudinaryPayload.set("file", file);
      cloudinaryPayload.set("api_key", signResponseBody.apiKey);
      cloudinaryPayload.set("folder", signResponseBody.folder);
      cloudinaryPayload.set("timestamp", String(signResponseBody.timestamp));
      cloudinaryPayload.set("signature", signResponseBody.signature);
      if (signResponseBody.allowedFormats) {
        cloudinaryPayload.set("allowed_formats", signResponseBody.allowedFormats);
      }

      const cloudinaryResponse = await fetch(signResponseBody.uploadUrl, {
        method: "POST",
        body: cloudinaryPayload,
      });
      const cloudinaryResponseBody =
        await parseJsonResponse<CloudinaryUploadResponse>(cloudinaryResponse);

      if (!cloudinaryResponse.ok) {
        toast.error(
          cloudinaryResponseBody?.error?.message ?? "Cloudinary từ chối upload."
        );
        return;
      }

      const uploadedUrl =
        cloudinaryResponseBody?.secure_url ?? cloudinaryResponseBody?.url;

      if (!uploadedUrl) {
        toast.error("Upload thành công nhưng thiếu URL ảnh.");
        return;
      }

      setAvatarUrl(uploadedUrl);
      toast.success("Đã chọn ảnh mới. Nhấn Lưu thay đổi để áp dụng.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function getFieldError(path: string) {
    return fieldErrors[path]?.[0];
  }

  const avatarInitial = getAvatarInitial({
    firstName,
    lastName,
    name: initialProfile.name,
    email: initialProfile.email,
  });
  const isBusy = isSaving || isUploadingAvatar;

  return (
    <form className="space-y-10" onSubmit={handleSubmit}>
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Thông tin cá nhân
          </h1>

          <div className="flex items-center gap-4">
            <button
              aria-label="Đổi avatar"
              className="group relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-primary"
              disabled={isBusy}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              type="button"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="size-full object-cover" src={avatarUrl} />
              ) : (
                avatarInitial
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-disabled:opacity-60">
                {isUploadingAvatar ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
              </span>
            </button>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Ảnh đại diện</p>
              <p className="text-xs text-muted-foreground">JPG/PNG, tối đa 2MB.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {isUploadingAvatar ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" />
                  )}
                  {isUploadingAvatar ? "Đang tải..." : "Đổi ảnh"}
                </Button>
                {avatarUrl ? (
                  <Button
                    disabled={isBusy}
                    onClick={() => {
                      setAvatarUrl("");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Xóa ảnh
                  </Button>
                ) : null}
              </div>
            </div>
            <input
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={handleAvatarChange}
              ref={fileInputRef}
              type="file"
            />
          </div>
          {getFieldError("avatarUrl") ? (
            <p className="text-sm text-destructive">{getFieldError("avatarUrl")}</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-last-name">Họ</Label>
              <Input
                aria-invalid={Boolean(getFieldError("lastName"))}
                disabled={isBusy}
                id="account-last-name"
                onChange={(event) => {
                  setLastName(event.target.value);
                }}
                value={lastName}
              />
              {getFieldError("lastName") ? (
                <p className="text-sm text-destructive">{getFieldError("lastName")}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-first-name">Tên</Label>
              <Input
                aria-invalid={Boolean(getFieldError("firstName"))}
                disabled={isBusy}
                id="account-first-name"
                onChange={(event) => {
                  setFirstName(event.target.value);
                }}
                value={firstName}
              />
              {getFieldError("firstName") ? (
                <p className="text-sm text-destructive">{getFieldError("firstName")}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-job-title">Chức Danh</Label>
            <Input
              aria-invalid={Boolean(getFieldError("jobTitle"))}
              disabled={isBusy}
              id="account-job-title"
              onChange={(event) => {
                setJobTitle(event.target.value);
              }}
              placeholder="Nhập chức danh của bạn"
              value={jobTitle}
            />
            {getFieldError("jobTitle") ? (
              <p className="text-sm text-destructive">{getFieldError("jobTitle")}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-bio">Bio</Label>
            <Textarea
              aria-invalid={Boolean(getFieldError("bio"))}
              disabled={isBusy}
              id="account-bio"
              onChange={(event) => {
                setBio(event.target.value);
              }}
              placeholder="Nhập bio của bạn"
              rows={5}
              value={bio}
            />
            {getFieldError("bio") ? (
              <p className="text-sm text-destructive">{getFieldError("bio")}</p>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Links</h2>
          <div className="space-y-4">
            {LINK_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`account-link-${field.key}`}>{field.label}</Label>
                <Input
                  aria-invalid={Boolean(getFieldError(`links.${field.key}`))}
                  disabled={isBusy}
                  id={`account-link-${field.key}`}
                  onChange={(event) => {
                    setLinks((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }));
                  }}
                  placeholder="http://..."
                  value={links[field.key]}
                />
                {getFieldError(`links.${field.key}`) ? (
                  <p className="text-sm text-destructive">
                    {getFieldError(`links.${field.key}`)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <Button aria-busy={isSaving} className="min-w-40" disabled={isBusy} type="submit">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
