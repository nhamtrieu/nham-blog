export const siteConfig = {
  name: "Nham Blog",
  title: "Nham Blog",
  heading: "Viết về engineering một cách rõ ràng.",
  description:
    "Nhật ký kỹ thuật, pattern thực dụng và những ghi chú mình muốn giữ lại khi làm sản phẩm và cuộc sống.",
  locale: "vi",
} as const;

export const quickLinks = [
  {
    href: "https://nextjs.org/docs",
    label: "Next.js Docs",
    variant: "secondary",
  },
  {
    href: "https://orkhan.gitbook.io/typeorm",
    label: "TypeORM Docs",
    variant: "primary",
  },
] as const;

export const foundationChecklist = [
  "Next.js App Router + TypeScript bootstrapped with Yarn.",
  "ESLint, Prettier, and typecheck scripts are available and passing.",
  "Alias imports via @/ are active in app code and test smoke files.",
  "shadcn/ui is initialized with Tailwind v4 support and src-based aliases.",
] as const;

export const plannedDirectories = [
  {
    name: "src/components",
    description: "Reusable UI components and route-specific presentation pieces.",
  },
  {
    name: "src/components/ui",
    description: "Generated and customized shadcn/ui primitives.",
  },
  {
    name: "src/db",
    description: "Database connection setup and TypeORM datasource configuration.",
  },
  {
    name: "src/entities",
    description: "TypeORM entity definitions for posts, tags, users, and media.",
  },
  {
    name: "src/hooks",
    description: "Shared React hooks and shadcn/ui-compatible helpers.",
  },
  {
    name: "src/lib",
    description: "Low-level utilities such as class merging helpers.",
  },
  {
    name: "src/services",
    description: "Business logic shared across route handlers and admin UI actions.",
  },
  {
    name: "src/validators",
    description: "Zod schemas and request validation helpers.",
  },
  {
    name: "tests",
    description: "Smoke, integration, and end-to-end test entry points.",
  },
] as const;
