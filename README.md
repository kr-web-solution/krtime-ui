# KRTime Admin

Next.js 15 static-export admin console for KRTime.

- **Stack**: TypeScript, Tailwind, TanStack Query, Leaflet, Recharts, React Hook Form + Zod
- **Output**: static files in `out/` (nginx in Docker)

## Environment

| File | Use |
| --- | --- |
| `.env` | Local development |
| `.env.production` | Production / Dokploy build args |
| `.env.example` | Template (safe to commit) |

`NEXT_PUBLIC_*` values are baked in at **build** time.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8010
NEXT_PUBLIC_APP_NAME=KRTime
```

```bash
cp .env.example .env
```

## Local development

API must already be running (default http://localhost:8010).

```bash
cd krtime-ui
npm install
npm run dev
```

Open http://localhost:3000 (or the port Next prints).

Default admin: `admin@example.com` / `ChangeMeNow!Admin1`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production static export → `out/` |
| `npm run start` | Serve built app (non-export mode) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Screens

| Route | Purpose |
| --- | --- |
| `/login` | Admin sign-in |
| `/dashboard` | KPIs + present-by-site |
| `/daily-attendance` | Day board |
| `/locations` | Sites, map pin, geofence radius |
| `/qr/[site_slug]` | Full-screen QR tablet page |
| `/employees` | Create, site/shift, enroll codes |
| `/devices` | List / approve devices |
| `/shifts` | Shift definitions |
| `/leave` | Leave requests |
| `/holidays` | Holiday calendar |
| `/corrections` | Attendance corrections |
| `/reviews` | Face / attendance reviews |
| `/reports` | Exports & charts |
| `/security` | Security events (e.g. geofence exit) |
| `/settings` | Org settings |

## Static export

```bash
npm run build
# output: krtime-ui/out/
```

Production `next.config` enables `output: "export"`.

## Docker / Dokploy

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api-attendance.krwebsolution.com \
  --build-arg NEXT_PUBLIC_APP_NAME=KRTime \
  -t krtime-ui .
```

| Setting | Value |
| --- | --- |
| Dockerfile | `krtime-ui/Dockerfile` |
| Context | `krtime-ui/` |
| Port | `3000` (nginx) |
| Build args | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_APP_NAME` |

Use values from `.env.production`. See [docs/DOKPLOY_DEPLOY.md](../docs/DOKPLOY_DEPLOY.md).

## Notes

- CORS on the API must include this UI origin (`CORS_ORIGINS`).
- Refresh tokens use an HTTP-only cookie from the API; for local HTTP keep `REFRESH_COOKIE_SECURE=false` on the API.
- Prefer `.env` for local; if `.env.local` also exists, Next.js gives it higher priority.
