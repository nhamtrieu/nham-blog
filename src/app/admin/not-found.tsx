import Link from "next/link";

import { PublicStatusPage, actionLinkClass } from "@/components/public/public-status-page";

export default function AdminNotFound() {
  return (
    <PublicStatusPage
      description="Trang admin ban tim khong ton tai. Hay quay lai bang dieu khien hoac dang nhap lai."
      title="Khong tim thay trang admin"
      actions={
        <>
          <Link className={actionLinkClass} href="/admin">
            Ve bang dieu khien
          </Link>
          <Link className={actionLinkClass} href="/admin/login">
            Trang dang nhap
          </Link>
        </>
      }
    />
  );
}
