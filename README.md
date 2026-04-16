This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

- `app/`: Next.js App Router entrypoints and route segments.
- `src/components/`: shared and route-level React components.
- `src/components/ui/`: generated and customized primitives from `shadcn/ui`.
- `src/config/`: site metadata and non-secret app configuration.
- `src/db/`: database connection and TypeORM datasource setup.
- `src/entities/`: TypeORM entities.
- `src/services/`: business logic and orchestration helpers.
- `src/validators/`: request and form validation schemas.
- `tests/`: smoke, integration, and end-to-end test entrypoints.

Alias imports use `@/`, so `@/src/config/site` resolves from the repository root.

UI components are standardized on `shadcn/ui`.

## Environment

- Runtime environment variables are validated in [src/env.ts](/home/nham/workspace/nham-blog/src/env.ts) during Next.js boot.
- Tracked defaults and required keys live in [`.env.example`](/home/nham/workspace/nham-blog/.env.example).
- Local development values can live in `.env.local` and are ignored by git.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
