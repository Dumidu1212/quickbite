# user-service/Dockerfile
#
# Multi-stage build for the User service.
#
# Stage 1 (builder): installs ALL dependencies including devDependencies
#   needed for any build steps. Copies source code.
# Stage 2 (production): installs production dependencies only,
#   copies compiled/source from builder. Smaller final image.

# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS builder

WORKDIR /app

# Copy package files first — Docker caches this layer.
# npm ci only re-runs when package-lock.json changes.
COPY package*.json ./
RUN npm ci --include=dev

# Copy source AFTER installing dependencies so code changes
# do not invalidate the npm ci cache layer
COPY src/ ./src/

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS production

# wget needed for the HEALTHCHECK command
RUN apk add --no-cache wget \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

WORKDIR /app

# Install production dependencies only — keeps image small
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source from builder stage
COPY --from=builder /app/src ./src

# Copy package.json — needed for version field in health endpoint
COPY package.json ./

USER appuser

EXPOSE 3001

# Health check — Docker marks container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "src/app.js"]
