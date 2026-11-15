# Build from the repo root: docker build -f apps/server/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm install --frozen-lockfile --filter @xiangqi/server...
RUN pnpm --filter @xiangqi/server... build
RUN pnpm --filter @xiangqi/server deploy --prod --legacy /out
# Generate the Prisma client inside the deployed folder (for the Alpine/musl engine).
RUN cd /out && node node_modules/prisma/build/index.js generate

FROM node:22-alpine
# Prisma's query engine needs OpenSSL.
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
