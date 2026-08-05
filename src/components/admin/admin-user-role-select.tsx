"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/entities/user.entity";

type AdminUserRoleSelectProps = {
  userId: string;
  email: string;
  role: UserRole;
};

export function AdminUserRoleSelect({ userId, email, role }: AdminUserRoleSelectProps) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState(role);
  const [isSaving, setIsSaving] = useState(false);

  if (role === UserRole.ADMIN) {
    return <span className="text-sm font-medium text-foreground">ADMIN</span>;
  }

  async function handleRoleChange(nextRole: string) {
    if (nextRole !== UserRole.READER && nextRole !== UserRole.WRITER) {
      return;
    }

    if (nextRole === currentRole || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: nextRole }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        toast.error(body?.message ?? "Không thể cập nhật role.");
        return;
      }

      setCurrentRole(nextRole);
      toast.success(`Đã cập nhật role cho ${email}. Có hiệu lực trong khoảng 30 giây.`);
      router.refresh();
    } catch {
      toast.error("Không thể kết nối API cập nhật role.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        disabled={isSaving}
        onValueChange={(value) => {
          if (!value) {
            return;
          }

          void handleRoleChange(value);
        }}
        value={currentRole}
      >
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UserRole.READER}>READER</SelectItem>
          <SelectItem value={UserRole.WRITER}>WRITER</SelectItem>
        </SelectContent>
      </Select>
      {isSaving ? <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
