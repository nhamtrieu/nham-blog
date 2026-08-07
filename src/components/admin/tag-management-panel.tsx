"use client";

import { type DragEvent, type FormEvent, useRef, useState } from "react";
import {
  Check,
  GripVertical,
  LoaderCircle,
  PencilLine,
  PlusCircle,
  Save,
  Tags,
  Trash2,
  X,
} from "lucide-react";

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
import {
  validateTagCreateInput,
  validateTagUpdateInput,
} from "@/validators/tag.validator";

export type TagManagementItem = {
  id: string;
  name: string;
  slug: string;
  orderNumber: number;
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
  orderNumber: number;
  createdAt: string;
  updatedAt: string;
};

type ReorderTagsResponse = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    orderNumber: number;
    updatedAt: string;
  }>;
};

function sortTagsByOrder(tags: TagManagementItem[]) {
  return [...tags].sort((leftTag, rightTag) => {
    if (leftTag.orderNumber !== rightTag.orderNumber) {
      return leftTag.orderNumber - rightTag.orderNumber;
    }

    return leftTag.name.localeCompare(rightTag.name, "vi", {
      sensitivity: "base",
    });
  });
}

function withSequentialOrder(tags: TagManagementItem[]) {
  return tags.map((tag, index) => ({
    ...tag,
    orderNumber: index + 1,
  }));
}

function normalizeSavedTag(savedTag: SavedTagResponse): TagManagementItem {
  return {
    id: savedTag.id,
    name: savedTag.name,
    slug: savedTag.slug,
    orderNumber: savedTag.orderNumber,
  };
}

function moveTag(tags: TagManagementItem[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= tags.length ||
    toIndex >= tags.length
  ) {
    return tags;
  }

  const nextTags = [...tags];
  const [movedTag] = nextTags.splice(fromIndex, 1);
  nextTags.splice(toIndex, 0, movedTag);
  return withSequentialOrder(nextTags);
}

function orderedIdsEqual(leftIds: string[], rightIds: string[]) {
  return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
}

function applySavedOrder(tags: TagManagementItem[], orderedIds: string[]) {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const orderedTags = orderedIds
    .map((id) => tagById.get(id))
    .filter((tag): tag is TagManagementItem => Boolean(tag));

  for (const tag of tags) {
    if (!orderedIds.includes(tag.id)) {
      orderedTags.push(tag);
    }
  }

  return withSequentialOrder(orderedTags);
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
  const [tags, setTags] = useState(() => sortTagsByOrder(initialTags));
  const [savedOrderedIds, setSavedOrderedIds] = useState(() =>
    sortTagsByOrder(initialTags).map((tag) => tag.id)
  );
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
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggingTagId, setDraggingTagId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    tagId: string;
    position: "before" | "after";
  } | null>(null);
  const dragTagIdRef = useRef<string | null>(null);

  const currentOrderedIds = tags.map((tag) => tag.id);
  const hasOrderChanges = !orderedIdsEqual(currentOrderedIds, savedOrderedIds);
  const isBusy = isCreating || isUpdating || isSavingOrder || deletingTagId !== null;

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

  async function handleSaveOrder() {
    if (isBusy || !hasOrderChanges) {
      return;
    }

    setIsSavingOrder(true);
    setErrorMessage(null);
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/admin/tags/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderedIds: currentOrderedIds,
        }),
      });
      const responseBody = await parseJsonResponse<ReorderTagsResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        setErrorMessage(
          (responseBody as ApiErrorResponse | null)?.message ??
          "Không thể cập nhật thứ tự tag. Vui lòng thử lại."
        );
        return;
      }

      const reorderBody = responseBody as ReorderTagsResponse | null;

      if (!reorderBody?.items) {
        setErrorMessage("API đã trả về một phản hồi không hợp lệ. Vui lòng thử lại.");
        return;
      }

      const nextTags = sortTagsByOrder(
        reorderBody.items.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          orderNumber: item.orderNumber,
        }))
      );

      setTags(nextTags);
      setSavedOrderedIds(nextTags.map((tag) => tag.id));
      setFeedbackMessage("Đã lưu thứ tự tags.");
    } catch {
      setErrorMessage("Không thể kết nối đến API tags. Vui lòng thử lại.");
    } finally {
      setIsSavingOrder(false);
    }
  }

  function handleResetOrder() {
    if (isBusy || !hasOrderChanges) {
      return;
    }

    setTags((currentTags) => applySavedOrder(currentTags, savedOrderedIds));
    setFeedbackMessage(null);
    setErrorMessage(null);
  }

  function handleDragStart(tagId: string) {
    if (isBusy || editingTagId) {
      return;
    }

    dragTagIdRef.current = tagId;
    setDraggingTagId(tagId);
  }

  function resolveDropPosition(event: DragEvent<HTMLTableRowElement>): "before" | "after" {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  function handleDragOver(event: DragEvent<HTMLTableRowElement>, tagId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (!dragTagIdRef.current || dragTagIdRef.current === tagId) {
      return;
    }

    const position = resolveDropPosition(event);
    setDropIndicator((current) => {
      if (current?.tagId === tagId && current.position === position) {
        return current;
      }

      return { tagId, position };
    });
  }

  function handleDragEnd() {
    dragTagIdRef.current = null;
    setDraggingTagId(null);
    setDropIndicator(null);
  }

  function handleDrop(event: DragEvent<HTMLTableRowElement>, targetTagId: string) {
    event.preventDefault();
    const sourceTagId = dragTagIdRef.current;
    const position = dropIndicator?.tagId === targetTagId
      ? dropIndicator.position
      : resolveDropPosition(event);
    handleDragEnd();

    if (!sourceTagId || sourceTagId === targetTagId || isBusy || editingTagId) {
      return;
    }

    const fromIndex = tags.findIndex((tag) => tag.id === sourceTagId);
    const targetIndex = tags.findIndex((tag) => tag.id === targetTagId);

    if (fromIndex < 0 || targetIndex < 0) {
      return;
    }

    let toIndex = position === "after" ? targetIndex + 1 : targetIndex;

    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    if (fromIndex === toIndex) {
      return;
    }

    setTags((currentTags) => moveTag(currentTags, fromIndex, toIndex));
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setErrorMessage(null);
    setFeedbackMessage(null);

    const validationResult = validateTagCreateInput({
      name: createValues.name,
      slug: createValues.slug,
    });

    if (!validationResult.success) {
      setCreateFieldErrors(validationResult.error.fields ?? {});
      setErrorMessage(validationResult.error.fields ? null : validationResult.error.message);
      return;
    }

    setIsCreating(true);
    setCreateFieldErrors({});

    try {
      const response = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });
      const responseBody = await parseJsonResponse<SavedTagResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        const errorBody = responseBody as ApiErrorResponse | null;

        setCreateFieldErrors(errorBody?.fields ?? {});
        setErrorMessage(errorBody?.message ?? "Không thể tạo tag lúc này. Vui lòng thử lại.");
        return;
      }

      if (!responseBody) {
        setErrorMessage("API đã trả về một phản hồi không hợp lệ. Vui lòng thử lại.");
        return;
      }

      const savedTag = normalizeSavedTag(responseBody as SavedTagResponse);

      setTags((currentTags) => withSequentialOrder([...currentTags, savedTag]));
      setSavedOrderedIds((currentIds) => [...currentIds, savedTag.id]);
      setCreateValues({
        name: "",
        slug: "",
      });
      setCreateFieldErrors({});
      setFeedbackMessage(`Đã tạo tag ${savedTag.name}.`);
    } catch {
      setErrorMessage("Không thể kết nối đến API tags. Vui lòng thử lại.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveTag(tagId: string) {
    if (isBusy) {
      return;
    }

    setErrorMessage(null);
    setFeedbackMessage(null);

    const validationResult = validateTagUpdateInput({
      name: editValues.name,
      slug: editValues.slug,
    });

    if (!validationResult.success) {
      setEditFieldErrors(validationResult.error.fields ?? {});
      setErrorMessage(validationResult.error.fields ? null : validationResult.error.message);
      return;
    }

    setIsUpdating(true);
    setEditFieldErrors({});

    try {
      const response = await fetch(`/api/admin/tags/${tagId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validationResult.data),
      });
      const responseBody = await parseJsonResponse<SavedTagResponse | ApiErrorResponse>(response);

      if (!response.ok) {
        const errorBody = responseBody as ApiErrorResponse | null;

        setEditFieldErrors(errorBody?.fields ?? {});
        setErrorMessage(errorBody?.message ?? "Không thể cập nhật tag lúc này. Vui lòng thử lại.");
        return;
      }

      if (!responseBody) {
        setErrorMessage("API đã trả về một phản hồi không hợp lệ. Vui lòng thử lại.");
        return;
      }

      const savedTag = normalizeSavedTag(responseBody as SavedTagResponse);

      setTags((currentTags) =>
        sortTagsByOrder(
          currentTags.map((currentTag) =>
            currentTag.id === savedTag.id
              ? {
                ...savedTag,
                orderNumber: currentTag.orderNumber,
              }
              : currentTag
          )
        )
      );
      setEditingTagId(null);
      setEditFieldErrors({});
      setFeedbackMessage(`Đã cập nhật tag ${savedTag.name}.`);
    } catch {
      setErrorMessage("Không thể kết nối đến API tags. Vui lòng thử lại.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteTag(tag: TagManagementItem) {
    if (isBusy) {
      return;
    }

    const shouldDelete = window.confirm(
      `Bạn có chắc muốn xóa tag "${tag.name}" không? Hành động này không thể hoàn tác.`
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
          responseBody?.message ?? "Không thể xóa tag lúc này. Vui lòng thử lại."
        );
        return;
      }

      setTags((currentTags) => currentTags.filter((currentTag) => currentTag.id !== tag.id));
      setSavedOrderedIds((currentIds) => currentIds.filter((id) => id !== tag.id));

      if (editingTagId === tag.id) {
        setEditingTagId(null);
        setEditFieldErrors({});
      }

      setFeedbackMessage(`Đã xóa tag ${tag.name}.`);
    } catch {
      setErrorMessage("Không thể kết nối đến API tags. Vui lòng thử lại.");
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
          <form
            className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            onSubmit={handleCreateTag}
          >
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
                <p className="mt-2 text-xs text-muted-foreground">Có thể bỏ trống để server tự sinh slug.</p>
              )}
            </div>
            <Button disabled={isBusy} type="submit">
              {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              Tạo tag
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
        <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Bảng tags</CardTitle>
            <CardDescription>
              Kéo grip để sắp xếp tạm. Thả nửa dưới hàng cuối để đưa xuống cuối, rồi bấm Lưu thứ tự.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isBusy || !hasOrderChanges}
              onClick={handleResetOrder}
              size="sm"
              type="button"
              variant="outline"
            >
              <X className="size-3.5" />
              Hủy sắp xếp
            </Button>
            <Button
              disabled={isBusy || !hasOrderChanges}
              onClick={() => {
                void handleSaveOrder();
              }}
              size="sm"
              type="button"
            >
              {isSavingOrder ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Lưu thứ tự
            </Button>
          </div>
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
            {hasOrderChanges ? (
              <p className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
                Thứ tự đang thay đổi cục bộ. Bấm &quot;Lưu thứ tự&quot; để áp dụng lên trang user.
              </p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[260px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => {
                  const isEditing = editingTagId === tag.id;
                  const isDeleting = deletingTagId === tag.id;
                  const isDragging = draggingTagId === tag.id;
                  const showDropBefore =
                    dropIndicator?.tagId === tag.id &&
                    dropIndicator.position === "before" &&
                    draggingTagId !== tag.id;
                  const showDropAfter =
                    dropIndicator?.tagId === tag.id &&
                    dropIndicator.position === "after" &&
                    draggingTagId !== tag.id;

                  return (
                    <TableRow
                      className={cn(
                        isDragging ? "opacity-50" : "",
                        showDropBefore ? "border-t-2 border-primary" : "",
                        showDropAfter ? "border-b-2 border-primary" : ""
                      )}
                      key={tag.id}
                      onDragOver={(event) => {
                        handleDragOver(event, tag.id);
                      }}
                      onDrop={(event) => {
                        handleDrop(event, tag.id);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            aria-label={`Kéo để đổi thứ tự tag ${tag.name}`}
                            className="inline-flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isBusy || Boolean(editingTagId)}
                            draggable={!isBusy && !editingTagId}
                            onDragEnd={handleDragEnd}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              handleDragStart(tag.id);
                            }}
                            type="button"
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <span className="tabular-nums text-muted-foreground">{tag.orderNumber}</span>
                        </div>
                      </TableCell>
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
