"use client";

import { type FormEvent, useState } from "react";
import { Check, LoaderCircle, PencilLine, PlusCircle, Tags, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type TagManagementItem = {
  id: string;
  name: string;
  slug: string;
};

type TagManagementPanelProps = {
  initialTags: TagManagementItem[];
};

type ApiErrorResponse = {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
  requestId?: string;
};

type SavedTagResponse = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

function sortTagsByName(tags: TagManagementItem[]) {
  return [...tags].sort((leftTag, rightTag) =>
    leftTag.name.localeCompare(rightTag.name, "vi", {
      sensitivity: "base",
    })
  );
}

function normalizeSavedTag(savedTag: SavedTagResponse): TagManagementItem {
  return {
    id: savedTag.id,
    name: savedTag.name,
    slug: savedTag.slug,
  };
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

export function TagManagementPanel({ initialTags }: TagManagementPanelProps) {
  const [tags, setTags] = useState(() => sortTagsByName(initialTags));
  const [createValues, setCreateValues] = useState({
    name: "",
    slug: "",
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    name: "",
    slug: "",
  });
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isCreating || isUpdating || deletingTagId !== null;

  function getCreateFieldError(field: "name" | "slug") {
    return createFieldErrors[field]?.[0];
  }

  function getEditFieldError(field: "name" | "slug") {
    return editFieldErrors[field]?.[0];
  }

  function startEditTag(tag: TagManagementItem) {
    setEditingTagId(tag.id);
    setEditValues({
      name: tag.name,
      slug: tag.slug,
    });
    setEditFieldErrors({});
    setErrorMessage(null);
    setFeedbackMessage(null);
  }

  function cancelEdit() {
    setEditingTagId(null);
    setEditFieldErrors({});
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setIsCreating(true);
    setCreateFieldErrors({});
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createValues.name,
          slug: createValues.slug,
        }),
      });
      const responseBody = await parseJsonResponse<SavedTagResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        const errorBody = responseBody as ApiErrorResponse | null;

        setCreateFieldErrors(errorBody?.fields ?? {});
        setErrorMessage(errorBody?.message ?? "Khong the tao tag luc nay. Vui long thu lai.");
        return;
      }

      if (!responseBody) {
        setErrorMessage("API da tra ve mot phan hoi khong hop le. Vui long thu lai.");
        return;
      }

      const savedTag = normalizeSavedTag(responseBody as SavedTagResponse);

      setTags((currentTags) => sortTagsByName([...currentTags, savedTag]));
      setCreateValues({
        name: "",
        slug: "",
      });
      setCreateFieldErrors({});
      setFeedbackMessage(`Da tao tag ${savedTag.name}.`);
    } catch {
      setErrorMessage("Khong the ket noi toi API tags. Vui long thu lai.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveTag(tagId: string) {
    if (isBusy) {
      return;
    }

    setIsUpdating(true);
    setEditFieldErrors({});
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await fetch(`/api/admin/tags/${tagId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editValues.name,
          slug: editValues.slug,
        }),
      });
      const responseBody = await parseJsonResponse<SavedTagResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        const errorBody = responseBody as ApiErrorResponse | null;

        setEditFieldErrors(errorBody?.fields ?? {});
        setErrorMessage(errorBody?.message ?? "Khong the cap nhat tag luc nay. Vui long thu lai.");
        return;
      }

      if (!responseBody) {
        setErrorMessage("API da tra ve mot phan hoi khong hop le. Vui long thu lai.");
        return;
      }

      const savedTag = normalizeSavedTag(responseBody as SavedTagResponse);

      setTags((currentTags) =>
        sortTagsByName(
          currentTags.map((currentTag) => (currentTag.id === savedTag.id ? savedTag : currentTag))
        )
      );
      setEditingTagId(null);
      setEditFieldErrors({});
      setFeedbackMessage(`Da cap nhat tag ${savedTag.name}.`);
    } catch {
      setErrorMessage("Khong the ket noi toi API tags. Vui long thu lai.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteTag(tag: TagManagementItem) {
    if (isBusy) {
      return;
    }

    const shouldDelete = window.confirm(
      `Ban co chac muon xoa tag "${tag.name}" khong? Hanh dong nay khong the hoan tac.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingTagId(tag.id);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "DELETE",
      });
      const responseBody = await parseJsonResponse<ApiErrorResponse>(response);

      if (!response.ok) {
        setErrorMessage(
          responseBody?.message ?? "Khong the xoa tag luc nay. Vui long thu lai."
        );
        return;
      }

      setTags((currentTags) => currentTags.filter((currentTag) => currentTag.id !== tag.id));

      if (editingTagId === tag.id) {
        setEditingTagId(null);
        setEditFieldErrors({});
      }

      setFeedbackMessage(`Da xoa tag ${tag.name}.`);
    } catch {
      setErrorMessage("Khong the ket noi toi API tags. Vui long thu lai.");
    } finally {
      setDeletingTagId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Tạo tag mới</CardTitle>
            <CardDescription>
              Nhập tên tag và slug tùy chọn. Nếu bỏ trống slug, server sẽ tự chuẩn hóa.
            </CardDescription>
          </div>
          <Badge className="w-fit" variant="secondary">
            <Tags className="size-3.5 opacity-80" />
            Tổng {tags.length} tags
          </Badge>
        </CardHeader>

        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleCreateTag}>
            <div>
              <Input
                aria-invalid={Boolean(getCreateFieldError("name"))}
                disabled={isBusy}
                onChange={(event) => {
                  setCreateValues((currentValues) => ({
                    ...currentValues,
                    name: event.target.value,
                  }));

                  if (getCreateFieldError("name")) {
                    setCreateFieldErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      delete nextErrors.name;
                      return nextErrors;
                    });
                  }
                }}
                placeholder="VD: TypeScript"
                value={createValues.name}
              />
              {getCreateFieldError("name") ? (
                <p className="mt-2 text-sm text-destructive">{getCreateFieldError("name")}</p>
              ) : null}
            </div>
            <div>
              <Input
                aria-invalid={Boolean(getCreateFieldError("slug"))}
                disabled={isBusy}
                onChange={(event) => {
                  setCreateValues((currentValues) => ({
                    ...currentValues,
                    slug: event.target.value,
                  }));

                  if (getCreateFieldError("slug")) {
                    setCreateFieldErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      delete nextErrors.slug;
                      return nextErrors;
                    });
                  }
                }}
                placeholder="slug-tuy-chon"
                value={createValues.slug}
              />
              {getCreateFieldError("slug") ? (
                <p className="mt-2 text-sm text-destructive">{getCreateFieldError("slug")}</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Co the bo trong de server tu sinh slug.</p>
              )}
            </div>
            <Button className="h-11 sm:mt-0" disabled={isBusy} type="submit">
              {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              Tao tag
            </Button>
          </form>
        </CardContent>
      </Card>

      {feedbackMessage ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {feedbackMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">Bảng tags</CardTitle>
          <CardDescription>Quản lý tạo, sửa, xóa tag trực tiếp trên bảng.</CardDescription>
        </CardHeader>

        {tags.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
              <Tags className="size-5" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Chưa có tag nào</p>
              <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
                Tạo tag đầu tiên để phân loại nội dung bài viết rõ ràng hơn.
              </p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="overflow-x-auto px-0 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[260px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id;
                  const isDeleting = deletingTagId === tag.id;

                  return (
                    <TableRow key={tag.id}>
                      <TableCell>
                        {isEditing ? (
                          <div>
                            <Input
                              aria-invalid={Boolean(getEditFieldError("name"))}
                              disabled={isBusy}
                              onChange={(event) => {
                                setEditValues((currentValues) => ({
                                  ...currentValues,
                                  name: event.target.value,
                                }));

                                if (getEditFieldError("name")) {
                                  setEditFieldErrors((currentErrors) => {
                                    const nextErrors = { ...currentErrors };
                                    delete nextErrors.name;
                                    return nextErrors;
                                  });
                                }
                              }}
                              value={editValues.name}
                            />
                            {getEditFieldError("name") ? (
                              <p className="mt-2 text-sm text-destructive">{getEditFieldError("name")}</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="font-semibold text-foreground">{tag.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div>
                            <Input
                              aria-invalid={Boolean(getEditFieldError("slug"))}
                              disabled={isBusy}
                              onChange={(event) => {
                                setEditValues((currentValues) => ({
                                  ...currentValues,
                                  slug: event.target.value,
                                }));

                                if (getEditFieldError("slug")) {
                                  setEditFieldErrors((currentErrors) => {
                                    const nextErrors = { ...currentErrors };
                                    delete nextErrors.slug;
                                    return nextErrors;
                                  });
                                }
                              }}
                              value={editValues.slug}
                            />
                            {getEditFieldError("slug") ? (
                              <p className="mt-2 text-sm text-destructive">{getEditFieldError("slug")}</p>
                            ) : null}
                          </div>
                        ) : (
                          <Badge className="uppercase tracking-wide" variant="secondary">
                            {tag.slug}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                disabled={isBusy}
                                onClick={() => {
                                  void handleSaveTag(tag.id);
                                }}
                                size="sm"
                                type="button"
                              >
                                {isUpdating ? (
                                  <LoaderCircle className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5" />
                                )}
                                Lưu
                              </Button>
                              <Button disabled={isBusy} onClick={cancelEdit} size="sm" type="button" variant="outline">
                                <X className="size-3.5" />
                                Hủy
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                disabled={isBusy}
                                onClick={() => {
                                  startEditTag(tag);
                                }}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                <PencilLine className="size-3.5" />
                                Sửa
                              </Button>
                              <Button
                                className={cn(isDeleting ? "cursor-wait" : "")}
                                disabled={isBusy}
                                onClick={() => {
                                  void handleDeleteTag(tag);
                                }}
                                size="sm"
                                type="button"
                                variant="destructive"
                              >
                                {isDeleting ? (
                                  <LoaderCircle className="size-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3.5" />
                                )}
                                Xóa
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

