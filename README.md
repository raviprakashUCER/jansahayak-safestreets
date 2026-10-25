<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project structure

The application uses a feature-oriented structure so the public landing page can grow without turning `app/page.tsx` into a monolith:

```text
app/                  Route entry points and global styles
components/           Reusable presentational components
components/layout/    Page shells and shared layout composition
components/sections/  Reusable section-level UI composition
lib/                  Typed product configuration and shared domain values
public/               Static assets
```

Keep route files thin. Put reusable UI in `components/`, domain constants and types in `lib/`, and feature-specific composition under `components/<feature>/`. Prefer server components by default; introduce a client component only when a feature needs browser state, event handlers, or an interactive API.

## Development checks

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

The project uses strict TypeScript settings, including unchecked-index protection. New domain values should be added to typed constants with `satisfies` or `as const` rather than duplicated across route components.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# jansahayak-safestreets
AI-powered Civic Issue Reporting and Public Accountability Platform
>>>>>>> a5dfc8ba5721e5663797f52ee067cbf627bc37c2
