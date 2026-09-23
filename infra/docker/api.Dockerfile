FROM node:22.18.0-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.19.0
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY .env.example .env.example
RUN DATABASE_URL=postgresql://build_only:build_only@127.0.0.1:5432/build_only pnpm --filter @rd/api db:generate && pnpm --filter @rd/api build
ENV NODE_ENV=production
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
