# Nia Football

The operating system for football development in Africa.

See [docs/Claude.md](docs/Claude.md) for engineering standards and architecture,
and [docs/01-product-overview.md](docs/01-product-overview.md) for product context.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in Supabase and Cloudflare credentials
before running features that depend on them.

## Stack

TypeScript, Next.js (App Router), Tailwind CSS, Shadcn, Supabase (Postgres + Auth),
Cloudflare Stream + R2, deployed on Render. Python/PyTorch/OpenCV/YOLO power the
computer vision subsystem.
