# Kế Hoạch Xây Blog Cá Nhân (Next.js + PostgreSQL + Docker VPS)

Xem breakdown task triển khai chi tiết tại: [BLOG_IMPLEMENTATION_TASKS.md](./BLOG_IMPLEMENTATION_TASKS.md)

## 1) Summary

- Mục tiêu v1: blog cá nhân có trang public + trang admin, viết bài bằng `MDX` lưu trong PostgreSQL, quản trị bởi 1 tài khoản.
- Công nghệ chốt:
  - `Next.js (App Router) + TypeScript`
  - `PostgreSQL 16`
  - `TypeORM`
  - `shadcn/ui` cho UI component primitives
  - `NextAuth/Auth.js` với `Credentials` (email/password)
  - `Cloudinary` cho ảnh bài viết
  - Deploy bằng `Docker Compose` trên VPS.
- Phạm vi v1: bài viết, tag, SEO cơ bản, admin CRUD; chưa làm comment/newsletter.

## 2) Thiết Kế Kỹ Thuật & Interface Chính

- Cấu trúc module chính:
  - `app/(public)` cho trang người đọc (home, post detail, tag listing).
  - `app/(admin)` cho dashboard và quản lý nội dung.
  - `src/components/ui/*` cho các component được generate từ `shadcn/ui`.
  - `src/entities/*` + `src/db/data-source.ts` cho toàn bộ model dữ liệu và cấu hình kết nối DB.

- Data model (TypeORM Entities):
  - `User`: `id`, `email` (unique), `passwordHash`, `name`, `createdAt`, `updatedAt`.
  - `Post`: `id`, `title`, `slug` (unique), `excerpt`, `contentMdx`, `coverImageUrl`, `status` (`DRAFT|PUBLISHED`), `publishedAt`, `readingTime`, `seoTitle`, `seoDescription`, `createdAt`, `updatedAt`, `authorId`.
  - `Tag`: `id`, `name` (unique), `slug` (unique).
  - `PostTag`: join table `postId + tagId` (composite unique).
  - `MediaAsset`: `id`, `url`, `publicId`, `alt`, `width`, `height`, `createdAt`, `uploadedBy`.
  - Bảng auth session theo Auth.js adapter (nếu dùng DB session).

- API / server contract (v1):
  - Public đọc dữ liệu bằng server components/query trực tiếp (không public write API).
  - Admin route handlers:
    - `POST /api/admin/posts`, `PATCH /api/admin/posts/:id`, `DELETE /api/admin/posts/:id`
    - `POST /api/admin/tags`, `PATCH /api/admin/tags/:id`, `DELETE /api/admin/tags/:id`
    - `POST /api/admin/media/sign` để ký upload Cloudinary.
  - Validation input bằng `zod`; lỗi trả JSON chuẩn `{code,message,fields?}`.

- Quy tắc nghiệp vụ:
  - Slug tự sinh từ title, xử lý trùng bằng hậu tố `-2`, `-3`.
  - Chỉ `PUBLISHED` mới hiển thị public.
  - MDX render có sanitize và whitelist component an toàn cho v1.
  - SEO mặc định: metadata theo từng post + `sitemap.xml`, `robots.txt`, `rss.xml`.

## 3) Các Bước Triển Khai (Decision-Complete)

1. Khởi tạo dự án:
   - Tạo Next.js TypeScript App Router, setup ESLint, Prettier, env schema (`zod`), alias import.
   - Thêm thư viện: `typeorm`, `pg`, `reflect-metadata`, `next-auth`, `bcrypt`, `zod`, `@tanstack/react-query` (nếu cần), MDX renderer, Cloudinary SDK, `shadcn/ui` và các dependency UI liên quan.
   - Khởi tạo `shadcn/ui`, cấu hình `components.json`, và dùng `src/components/ui` làm nơi chứa component generate.

2. Thiết lập DB + TypeORM:
   - Khai báo đầy đủ entities theo model ở trên.
   - Cấu hình `DataSource` và tạo migration đầu tiên bằng TypeORM migrations.
   - Seed dữ liệu: 1 admin user mặc định + vài tag mẫu.
   - Tạo lớp truy cập DB dùng repository/service để tái sử dụng kết nối, tránh khởi tạo lại DataSource không cần thiết khi dev.

3. Authentication & Authorization:
   - Cấu hình Auth.js Credentials.
   - Login form admin tại `/admin/login`.
   - Middleware chặn toàn bộ `/admin/*` nếu chưa đăng nhập.
   - Mã hóa mật khẩu `bcrypt` + script đổi mật khẩu admin.

4. Admin CMS (MVP):
   - Danh sách bài viết: filter theo trạng thái, search title cơ bản, ưu tiên dựng bằng `shadcn/ui` table/input/select primitives.
   - Form tạo/sửa bài: title, slug, excerpt, MDX content, tag, cover, SEO fields, publish toggle; các form control thống nhất qua `shadcn/ui`.
   - Auto-save nháp (debounce) và nút Publish.
   - Quản lý tag CRUD cơ bản bằng cùng hệ component `shadcn/ui`.
   - Upload ảnh: client gọi endpoint ký Cloudinary rồi upload trực tiếp, lưu metadata vào `MediaAsset`.

5. Public site:
   - Trang chủ: danh sách bài đã publish, phân trang (offset/cursor chốt: `cursor pagination`).
   - Trang chi tiết `/blog/[slug]`: render MDX + mục lục heading + share links.
   - Trang tag `/tags/[slug]`.
   - 404/500 pages và trạng thái empty-state rõ ràng.

6. SEO & Content discovery:
   - Dynamic metadata cho từng trang post/tag.
   - Tạo `sitemap.xml`, `robots.txt`, `rss.xml`.
   - Open Graph/Twitter cards từ ảnh cover và excerpt.

7. Chất lượng & bảo mật:
   - CSRF/session bảo vệ theo Auth.js mặc định.
   - Rate limit nhẹ cho login endpoint.
   - Escape/sanitize output HTML từ MDX pipeline.
   - Logging lỗi tập trung (request id + route + user id).

8. Testing:
   - Unit test:
     - slug generation, reading-time, mdx utilities, validation schema.
   - Integration test:
     - API admin create/update/delete post, auth guard, publish visibility.
   - E2E (Playwright):
     - admin login -> tạo bài -> publish -> thấy bài ở public.
   - Thiết lập ngưỡng pass tối thiểu trước deploy: tất cả test xanh + build xanh.

9. Docker VPS deployment:
   - `docker-compose.yml` gồm `app`, `postgres`, `caddy` (TLS tự động).
   - Multi-stage Dockerfile cho Next.js standalone.
   - Env production: `DATABASE_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_*`.
   - Chạy migration khi deploy (pre-start job) + healthcheck.
   - Reverse proxy domain + HTTPS.

10. Vận hành sau go-live:

- Backup PostgreSQL hằng ngày (dump + retention 7/30 ngày).
- Theo dõi uptime và error rate.
- Quy trình rollback: dùng image tag trước đó + restore DB khi cần.

## 4) Test Plan & Acceptance Criteria

- Functional:
  - Admin đăng nhập thành công/ thất bại đúng hành vi.
  - CRUD post/tag hoạt động đầy đủ.
  - Bài nháp không xuất hiện public.
  - Bài published hiển thị đúng slug và metadata.

- Non-functional:
  - Trang public TTFB ổn định trên VPS (mục tiêu ban đầu < 500ms cho page cache nóng).
  - Lighthouse SEO cơ bản >= 90 cho trang post mẫu.

- Release criteria:
  - `docker compose up` chạy ổn định.
  - Migration + seed + login admin + publish bài mẫu thành công end-to-end.

## 5) Assumptions (Đã Chốt)

- Content model: `MDX in DB`.
- Auth: `Single admin`, `email/password`.
- Hạ tầng: `Docker VPS`.
- Media storage: `Cloudinary`.
- Scope v1: `Core blog MVP`, chưa có comments/newsletter.
- Default thêm để tránh mơ hồ:
  - Ngôn ngữ giao diện mặc định: tiếng Việt.
  - Workflow xuất bản: chỉ `Draft/Published`, chưa có schedule publish.
