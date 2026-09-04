# Next.js + Prisma on Fly.io.
#
# The whole app runs in this container, so the SQLite database can live on a Fly
# volume mounted at /data and no separate database service is needed. That also
# means the app must stay on ONE machine: two machines get two independent
# volumes and the data silently diverges.

FROM node:22-slim AS base
# Prisma's query engine needs OpenSSL at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` never queries the database, but the Prisma CLI insists on the var
# being present. The real URL is injected at runtime.
ENV DATABASE_URL="file:/tmp/build.db"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Path inside the Fly volume declared in fly.toml.
ENV DATABASE_URL="file:/data/skysurvey.db"
ENV PORT=3000

# The Prisma CLI has to be in the runtime image: Fly release commands run without
# volumes attached, so the schema is applied on container start instead.
COPY --from=build /app ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
