# order-service/Dockerfile
#
# Multi-stage build for the Order service.
# Same pattern as user-service — builder installs deps and copies src,
# production copies only what is needed to run.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

# Copy source AFTER npm ci to preserve the dependency cache layer
COPY src/ ./src/

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS production

RUN apk add --no-cache wget

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source from builder stage
COPY --from=builder /app/src ./src

COPY package.json ./

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "src/app.js"]
