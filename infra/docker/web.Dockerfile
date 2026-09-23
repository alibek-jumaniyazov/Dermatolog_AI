FROM node:22.18.0-bookworm-slim AS build
RUN npm install -g pnpm@11.19.0
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
RUN pnpm --filter @derma/web build
FROM nginx:1.28.0-alpine
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY infra/proxy/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
