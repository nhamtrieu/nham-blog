export const siteConfig = {
  name: "Nham Blog",
  title: "Nham Blog",
  heading: "Blog foundation is ready for the next implementation tasks.",
  description:
    "Scaffolded with Next.js App Router, wired for Yarn workflows, and organized for the upcoming TypeORM, auth, and CMS features.",
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
] as const;

export const plannedDirectories = [
  {
    name: "src/components",
    description: "Reusable UI components and route-specific presentation pieces.",
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
