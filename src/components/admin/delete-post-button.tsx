"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DeletePostButtonProps = {
  postId: string;
  postTitle: string;
  redirectTo?: string;
  deleteUrl?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

type ApiErrorResponse = {
  message?: string;
};

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

export function DeletePostButton({
  postId,
  postTitle,
  redirectTo = "/admin/posts",
  deleteUrl,
  size = "sm",
  variant = "outline",
}: DeletePostButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(deleteUrl ?? `/api/admin/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await parseJsonResponse<ApiErrorResponse>(response);
        toast.error(errorBody?.message ?? "Không thể xóa bài viết lúc này. Vui lòng thử lại.");
        return;
      }

      setIsOpen(false);
      toast.success("Đã xóa bài viết thành công.");
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Không thể kết nối tới API xóa bài viết. Vui lòng thử lại.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
      <AlertDialogTrigger
        render={
          <Button
            className="text-destructive hover:text-destructive/90"
            size={size}
            variant={variant}
          />
        }
      >
        <Trash2 className="size-3.5" />
        Xóa
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa bài viết?</AlertDialogTitle>
          <AlertDialogDescription>
            Bài viết &quot;{postTitle}&quot; sẽ bị xóa vĩnh viễn và không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            disabled={isDeleting}
            render={<Button type="button" variant="outline" />}
          >
            Hủy
          </AlertDialogClose>
          <Button
            disabled={isDeleting}
            onClick={() => {
              void handleDelete();
            }}
            type="button"
            variant="destructive"
          >
            {isDeleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Xác nhận xóa
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
