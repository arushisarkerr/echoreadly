# EchoReadly

AI-powered reading platform. Foundation phase — product features are not implemented yet.

## Stack

- Next.js (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint

## Project structure

```text
src/
  app/              # Routes and layouts (thin composition layer)
  components/
    ui/             # Design-system primitives
    layout/         # App chrome and page structure
    shared/         # Cross-feature presentational components
    marketing/      # Acquisition / landing UI
    icons/          # Inline SVG icon components
  features/         # Feature modules (auth, upload, reader, …)
  lib/              # Cross-cutting library wrappers
    supabase/
    auth/
    pdf/
    ai/
    storage/
    validators/
  server/           # Server-only privileged code
  hooks/            # Shared React hooks
  types/            # Shared TypeScript types
  styles/           # Global CSS, theme tokens, animations
  config/           # Runtime / site / env configuration
  constants/        # App-wide constants
  utils/            # Pure helpers

public/
  icons/
  images/
  logos/
  favicons/
```

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_APP_URL` is used for absolute metadata URLs. Supabase variables are required when calling Supabase clients; the marketing site runs without them.
