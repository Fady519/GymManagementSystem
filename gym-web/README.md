# gym-web: Power Fitness frontend

Next.js 16 (App Router) + TypeScript frontend for the Gym Management API in this repo.

## Run it locally

1. Start the API (from the repo root, or press F5 in Visual Studio):

   ```bash
   dotnet run --project GymManagementAPI --launch-profile https
   ```

2. Start the frontend (in this folder):

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

The first `npm run dev` exports the ASP.NET Core HTTPS development certificate to `.certs/` (git-ignored),
so the Next.js server can forward `/api/*` to `https://localhost:7080`.

## Scripts

| Script            | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `npm run dev`     | Development server with hot reload                           |
| `npm run build`   | Production build (also type-checks)                          |
| `npm run lint`    | ESLint                                                       |
| `npm run format`  | Prettier (also sorts Tailwind classes)                       |
| `npm run gen:api` | Regenerates `src/types/api.d.ts` from `../GymManagement.Tests/Snapshots/openapi.json` |

## How it talks to the API

The browser only calls its own origin (`/api/...`). `next.config.ts` rewrites those calls to the API
(`API_URL`, default `https://localhost:7080`). One origin means no CORS and the refresh-token cookie is first-party.

## Folder structure

```
src/
├─ app/                 routes, root layout, providers.tsx
├─ components/ui/       shadcn/ui components (copied into the project, editable)
├─ components/shared/   app-wide components (Logo, ThemeToggle, ...)
├─ features/<module>/   api.ts (HTTP calls) · queries.ts (TanStack Query hooks) · components/
├─ lib/                 api-client (Axios), api-error, query-client, format (Cairo time, EGP)
├─ store/               Redux Toolkit: auth + UI state
└─ types/               api.d.ts (generated) + friendly aliases in index.ts
```
