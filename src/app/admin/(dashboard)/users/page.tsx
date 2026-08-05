import { Users } from "lucide-react";

import { AdminUserRoleSelect } from "@/components/admin/admin-user-role-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRole } from "@/entities/user.entity";
import { userService } from "@/services";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function AdminUsersPage() {
  const users = await userService.listUsersForAdmin();
  const writerCount = users.filter((user) => user.role === UserRole.WRITER).length;

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-8">
      <Card className="gap-0 py-0 shadow-md">
        <CardHeader className="flex flex-col gap-5 border-b border-border px-6 pt-6 pb-6">
          <Badge className="w-fit" variant="secondary">
            <Users className="size-3.5 opacity-80" />
            Users
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">Người dùng</CardTitle>
          <CardDescription className="max-w-3xl text-pretty leading-relaxed">
            Chỉ định role <strong>WRITER</strong> để cho phép tạo bài (draft). Admin vẫn publish qua
            Posts. Role mới có hiệu lực trong khoảng 30 giây (không cần đăng nhập lại). Không đổi được
            role ADMIN tại đây.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4 text-sm text-muted-foreground">
          {users.length} users · {writerCount} writer
        </CardContent>
      </Card>

      <Card className="gap-0 py-0 shadow-sm">
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tạo lúc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name?.trim() || "—"}</TableCell>
                  <TableCell>
                    <AdminUserRoleSelect email={user.email} role={user.role} userId={user.id} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
