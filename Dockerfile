# KRTime UI — Next.js standalone on port 3000
# Config comes from .env.production (preferred) or Dokploy build-args.
# Do not hardcode domains / credentials in this file.
# Dokploy Domains → Port = 3000

FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Optional overrides from Dokploy build-args (empty = use .env.production as-is)
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_NAME

RUN set -eu; \
  if [ -n "${NEXT_PUBLIC_API_BASE_URL:-}" ]; then \
    printf '%s\n' \
      "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}" \
      "NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-KRTime}" \
      > .env.production; \
  fi; \
  if [ ! -f .env.production ]; then \
    echo "ERROR: Provide krtime-ui/.env.production or build-arg NEXT_PUBLIC_API_BASE_URL" >&2; \
    exit 1; \
  fi; \
  grep -qE '^NEXT_PUBLIC_API_BASE_URL=.+' .env.production || { \
    echo "ERROR: NEXT_PUBLIC_API_BASE_URL is missing/empty in .env.production" >&2; \
    exit 1; \
  }

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin appuser

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
