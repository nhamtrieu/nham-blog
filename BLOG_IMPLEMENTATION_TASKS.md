# Task Breakdown Triển Khai Blog (Next.js + PostgreSQL + TypeORM)

Tài liệu này tách nhỏ từ [BLOG_IMPLEMENTATION_PLAN.md](./BLOG_IMPLEMENTATION_PLAN.md) thành các task có thể triển khai ngay.

## Quy Ước

- Mỗi task có mã `Txxx`.
- Trạng thái dùng checklist `[ ]` / `[x]`.
- `Depends`: task cần hoàn thành trước.
- `DoD` (Definition of Done): tiêu chí hoàn thành tối thiểu.

## Milestone A - Project Foundation

- [x] `T001` Khởi tạo Next.js App Router + TypeScript
      Depends: Không
      DoD: Chạy được `yarn dev`, cấu trúc `app/` hoạt động, commit khởi tạo sạch.

- [x] `T002` Cấu hình ESLint + Prettier + scripts chuẩn
      Depends: `T001`
      DoD: Có script `lint`, `format`, `typecheck`; chạy pass trên code mẫu.

- [x] `T003` Thiết lập alias import và cấu trúc thư mục chuẩn
      Depends: `T001`
      DoD: Alias như `@/` dùng được trong app và test.

- [x] `T004` Thiết lập env schema bằng `zod`
      Depends: `T001`
      DoD: Có module validate env khi boot app; thiếu env thì fail sớm với lỗi rõ ràng.

- [x] `T005` Cài dependencies chính
      Depends: `T001`
      DoD: Cài xong `typeorm`, `pg`, `reflect-metadata`, `next-auth`, `bcrypt`, `zod`, MDX libs, cloudinary SDK, `shadcn/ui` và các dependency UI liên quan.

- [x] `T005A` Khởi tạo `shadcn/ui`
      Depends: `T003`, `T005`
      DoD: Có `components.json`, alias hoạt động với `shadcn/ui`, và thư mục `src/components/ui` sẵn sàng để generate component.

## Milestone B - Database & TypeORM

- [x] `T006` Tạo `DataSource` và chiến lược kết nối DB
      Depends: `T004`, `T005`
      DoD: Có `src/db/data-source.ts`, tái sử dụng kết nối an toàn khi dev/prod.

- [x] `T007` Tạo entity `User`
      Depends: `T006`
      DoD: Mapping cột chuẩn, unique email, timestamp đầy đủ.

- [x] `T008` Tạo entity `Post`
      Depends: `T006`, `T007`
      DoD: Có `status`, `slug unique`, `publishedAt`, quan hệ author.

- [x] `T009` Tạo entity `Tag` + quan hệ N-N với `Post`
      Depends: `T008`
      DoD: Join table chuẩn (`post_tags`), unique theo `postId + tagId`.

- [x] `T010` Tạo entity `MediaAsset`
      Depends: `T007`
      DoD: Lưu đủ `url`, `publicId`, kích thước ảnh, người upload.

- [x] `T011` Tạo migration đầu tiên
      Depends: `T007`, `T008`, `T009`, `T010`
      DoD: Chạy `migration:run` tạo đủ bảng và index như design.

- [x] `T012` Seed dữ liệu cơ bản (admin + tags mẫu)
      Depends: `T011`
      DoD: Script seed idempotent; chạy nhiều lần không tạo dữ liệu trùng.

- [x] `T013` Script đổi mật khẩu admin
      Depends: `T012`
      DoD: Có CLI/script nhận password mới, hash bằng bcrypt, cập nhật thành công.

## Milestone C - Auth & Access Control

- [x] `T014` Cấu hình Auth.js với Credentials
      Depends: `T007`, `T006`
      DoD: Đăng nhập bằng email/password từ DB thành công.

- [x] `T015` Tạo trang `/admin/login`
      Depends: `T014`
      DoD: Form login có xử lý lỗi sai thông tin và redirect đúng khi thành công.

- [x] `T016` Cấu hình middleware bảo vệ `/admin/*`
      Depends: `T014`
      DoD: Chưa đăng nhập thì bị chuyển về login; đã đăng nhập vào được admin.

- [x] `T017` Session + CSRF hardening theo mặc định Auth.js
      Depends: `T014`
      DoD: Cookie/session settings chuẩn production, không có warning bảo mật quan trọng.

- [x] `T018` Rate limit nhẹ cho endpoint login
      Depends: `T015`
      DoD: Nhiều request login thất bại liên tiếp bị throttle, có thông báo hợp lệ.

## Milestone D - Domain Services & Validation

- [x] `T019` Utility tạo slug + xử lý trùng (`-2`, `-3`)
      Depends: `T008`
      DoD: Có unit test cho các case trùng slug.

- [x] `T020` Utility tính reading time
      Depends: `T008`
      DoD: Tính đúng từ nội dung MDX, có unit test.

- [x] `T021` Schema `zod` cho Post create/update
      Depends: `T008`, `T019`
      DoD: Validate đầy đủ field, trả lỗi theo chuẩn `{code,message,fields?}`.

- [x] `T022` Schema `zod` cho Tag create/update
      Depends: `T009`
      DoD: Validate name/slug, không cho duplicate logic ở tầng service.

- [x] `T023` Service layer cho Post/Tag/Media
      Depends: `T021`, `T022`, `T010`
      DoD: Route handlers chỉ gọi service, không chứa business logic phức tạp.

## Milestone E - Admin APIs

- [x] `T024` `POST /api/admin/posts`
      Depends: `T021`, `T023`, `T016`
      DoD: Tạo post draft thành công, slug unique, lưu relations tag.

- [x] `T025` `PATCH /api/admin/posts/:id`
      Depends: `T024`
      DoD: Cập nhật được field chính, đổi trạng thái publish đúng logic.

- [x] `T026` `DELETE /api/admin/posts/:id`
      Depends: `T024`
      DoD: Xóa post an toàn, xử lý quan hệ tags đúng.

- [x] `T027` `POST /api/admin/tags`
      Depends: `T022`, `T023`, `T016`
      DoD: Tạo tag mới, chống trùng name/slug.

- [x] `T028` `PATCH /api/admin/tags/:id`
      Depends: `T027`
      DoD: Cập nhật tag hợp lệ, lỗi rõ ràng khi conflict unique.

- [x] `T029` `DELETE /api/admin/tags/:id`
      Depends: `T027`
      DoD: Xóa tag và xử lý liên kết post-tag không để dữ liệu mồ côi.

- [x] `T030` `POST /api/admin/media/sign` cho Cloudinary
      Depends: `T010`, `T016`
      DoD: Trả chữ ký upload hợp lệ theo policy (folder, timestamp, signature).

- [x] `T031` Logging lỗi API với request id
      Depends: `T024`, `T025`, `T026`, `T027`, `T028`, `T029`
      DoD: Lỗi server có log route + user id + request id.

## Milestone F - Admin UI (CMS MVP)

- [x] `T032` Layout admin + navigation
      Depends: `T016`
      DoD: Có khung dashboard, menu Post/Tag/Media, trạng thái active rõ ràng, dùng `shadcn/ui` làm nền tảng component.

- [x] `T033` Trang danh sách bài viết (filter + search)
      Depends: `T024`, `T025`
      DoD: Filter theo status và search theo title hoạt động, dùng input/select/table patterns từ `shadcn/ui`.

- [x] `T034` Form tạo/sửa bài viết
      Depends: `T033`, `T025`
      DoD: Edit đầy đủ title/slug/excerpt/content/tags/SEO/cover/status, dùng các form primitives từ `shadcn/ui`.

- [x] `T035` Auto-save draft (debounce)
      Depends: `T034`
      DoD: Tự lưu bản nháp theo chu kỳ debounce, có trạng thái “Đã lưu”.

- [x] `T036` Nút Publish/Unpublish
      Depends: `T034`, `T025`
      DoD: Chuyển trạng thái bài viết đúng; set/unset `publishedAt` theo rules.

- [x] `T037` Trang quản lý tags (CRUD UI)
      Depends: `T027`, `T028`, `T029`
      DoD: Tạo/sửa/xóa tag từ UI, cập nhật tức thì sau thao tác, thống nhất UI qua `shadcn/ui`.

- [x] `T038` Upload ảnh từ admin lên Cloudinary
      Depends: `T030`, `T034`
      DoD: Upload trực tiếp từ client, lưu metadata vào DB và chèn link ảnh vào post.

## Milestone G - Public Site

- [x] `T039` Trang chủ danh sách post published + cursor pagination
      Depends: `T025`
      DoD: Chỉ hiển thị bài `PUBLISHED`, phân trang cursor chạy đúng.

- [x] `T040` Trang chi tiết `/blog/[slug]` render MDX
      Depends: `T039`
      DoD: Render MDX an toàn, hiển thị cover/excerpt/date/tags.

- [x] `T041` Tạo mục lục heading + share links
      Depends: `T040`
      DoD: TOC bám theo heading trong bài, có nút chia sẻ cơ bản.

- [x] `T042` Trang tag `/tags/[slug]`
      Depends: `T039`, `T009`
      DoD: Hiển thị danh sách bài theo tag, phân trang nhất quán.

- [x] `T043` Trạng thái empty + 404 + 500
      Depends: `T039`, `T040`, `T042`
      DoD: Trang lỗi và empty-state rõ ràng, không lộ thông tin nội bộ.

## Milestone H - SEO & Discovery

- [x] `T044` Dynamic metadata cho post và tag pages
      Depends: `T040`, `T042`
      DoD: `title`, `description`, canonical và OG cơ bản đúng theo dữ liệu bài/tag.

- [x] `T045` Tạo `sitemap.xml`
      Depends: `T039`, `T040`, `T042`
      DoD: Bao gồm routes public và bài đã publish.

- [x] `T046` Tạo `robots.txt`
      Depends: `T045`
      DoD: Cho phép crawl public pages, chặn route admin.

- [x] `T047` Tạo `rss.xml`
      Depends: `T039`
      DoD: Feed có bài mới nhất đã publish, format hợp lệ.

- [x] `T048` Twitter/Open Graph card từ cover + excerpt
      Depends: `T044`
      DoD: Preview mạng xã hội hiển thị ảnh và mô tả đúng.

## Milestone I - Quality & Testing

- [ ] `T049` Unit test cho slug, reading-time, validation, mdx utils
      Depends: `T019`, `T020`, `T021`, `T022`
      DoD: Test pass và cover đúng các case quan trọng.

- [ ] `T050` Integration test cho admin APIs + auth guard
      Depends: `T024`, `T025`, `T026`, `T027`, `T028`, `T029`, `T016`
      DoD: Test được create/update/delete + unauthorized access.

- [ ] `T051` Integration test publish visibility
      Depends: `T025`, `T039`
      DoD: Bài draft không lên public; bài published xuất hiện đúng.

- [ ] `T052` E2E Playwright: login -> create post -> publish -> public visible
      Depends: `T015`, `T034`, `T036`, `T039`
      DoD: Kịch bản end-to-end chạy xanh trong CI local.

- [ ] `T053` Thiết lập quality gate trước release
      Depends: `T049`, `T050`, `T051`, `T052`
      DoD: Pipeline fail nếu `lint/typecheck/test/build` không pass.

## Milestone J - Docker VPS & Operations

- [ ] `T054` Viết `Dockerfile` multi-stage cho Next.js standalone
      Depends: `T001`, `T005`
      DoD: Build image thành công, run app production ổn định.

- [ ] `T055` Viết `docker-compose.yml` (`app`, `postgres`, `caddy`)
      Depends: `T054`
      DoD: `docker compose up` chạy đủ service và app truy cập được.

- [ ] `T056` Cấu hình Caddy reverse proxy + HTTPS
      Depends: `T055`
      DoD: Domain chạy HTTPS hợp lệ, route admin/public ổn định.

- [ ] `T057` Job migration khi deploy + healthcheck
      Depends: `T011`, `T055`
      DoD: Deploy tự chạy migration an toàn, healthcheck phản ánh đúng trạng thái app.

- [ ] `T058` Cấu hình biến môi trường production
      Depends: `T055`
      DoD: Có tài liệu `.env.example` đầy đủ `DATABASE_URL`, `NEXTAUTH_SECRET`, `CLOUDINARY_*`.

- [ ] `T059` Backup PostgreSQL tự động (daily + retention)
      Depends: `T055`
      DoD: Có script/cron backup hằng ngày và chính sách giữ bản sao 7/30 ngày.

- [ ] `T060` Runbook rollback + smoke test sau deploy
      Depends: `T057`, `T059`
      DoD: Có checklist rollback image + restore DB; smoke test xác nhận app hoạt động.

## Trình Tự Ưu Tiên Triển Khai

1. `T001` -> `T018` (nền tảng + DB + auth).
2. `T019` -> `T038` (domain logic + admin API/UI).
3. `T039` -> `T048` (public pages + SEO).
4. `T049` -> `T053` (test & quality gate).
5. `T054` -> `T060` (deploy & vận hành).

## Mốc Nghiệm Thu MVP

- MVP đạt khi hoàn thành tối thiểu:
  `T001` đến `T048`, `T053`, `T055`, `T057`, `T058`.
