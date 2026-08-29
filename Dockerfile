FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Sem isso, o V8 usa um teto de heap baseado só na RAM física (1GB numa t3.micro) e nem
# tenta usar o swap disponível — estoura "heap out of memory" mesmo com swap configurado.
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN pnpm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/server/infra/db/schema ./src/server/infra/db/schema
COPY package.json ./package.json

EXPOSE 3000
CMD ["pnpm", "run", "start"]
