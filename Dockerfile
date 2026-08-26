# Skip Puppeteer's own Chromium download everywhere in this image; the
# runtime stage installs system Chromium instead (smaller, no headless
# browser is needed until a PDF is actually generated at runtime).
ARG PUPPETEER_SKIP_DOWNLOAD=true

FROM node:22-slim AS deps
ARG PUPPETEER_SKIP_DOWNLOAD
ENV PUPPETEER_SKIP_DOWNLOAD=${PUPPETEER_SKIP_DOWNLOAD}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DATABASE_URL=file:/data/app.db
ENV UPLOADS_DIR=/data/uploads

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=10 \
  CMD curl -sf http://localhost:3000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "start"]
