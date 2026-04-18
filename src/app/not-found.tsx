import { PublicStatusPage } from "@/components/public/public-status-page";

export default function RootNotFound() {
  return (
    <PublicStatusPage
      description="Đường dẫn bạn tìm kiếm không tồn tại hoặc đã được thay đổi. Vui lòng kiểm tra URL hoặc quay lại trang chủ."
      title="Trang không tồn tại (404)"
    />
  );
}
