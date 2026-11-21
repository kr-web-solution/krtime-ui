# KRTime UI — static Next.js export + nginx
# Dokploy: build-arg NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_APP_NAME=KRTime
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
# Dokploy domain Port must be 3000 (matches this listen port).
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
