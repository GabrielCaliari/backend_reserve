# syntax=docker/dockerfile:1
# Backend Reserve (NestJS + Prisma 7). Node 22 LTS: suportado por prisma 7,
# sharp e @sparticuz/chromium.

# ---------- deps: todas as dependencias (inclui dev) ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# postinstall roda "prisma generate"; precisa do schema e do config antes.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---------- build: gera o client do Prisma e compila ----------
FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
# Remove dev deps so o runtime leva so o necessario.
RUN npm prune --omit=dev --ignore-scripts

# ---------- migrate: roda "prisma migrate deploy" (precisa do CLI = devDependency) ----------
FROM deps AS migrate
ENV NODE_ENV=production
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---------- runtime: imagem final da API ----------
FROM node:22-bookworm-slim AS runtime
# Chromium e usado so no export de PDF. Para uma imagem menor: --build-arg INSTALL_CHROMIUM=false
ARG INSTALL_CHROMIUM=true
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# A pasta public/ (global-bundle.pem da AWS RDS) NAO entra de proposito: com NODE_ENV=production
# o PrismaService passaria a validar o SSL com a CA da AWS e a conexao com a Neon falharia.
# Sem o .pem, o SSL vem do "?sslmode=require" da DATABASE_URL.
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini curl \
    && if [ "$INSTALL_CHROMIUM" = "true" ]; then \
         apt-get install -y --no-install-recommends chromium fonts-liberation; \
       fi \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/main"]
