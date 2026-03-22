# Dockerfile — User Service
#
# MULTI-STAGE BUILD:
#   Stage 1 (builder): installs ALL dependencies including devDependencies
#   Stage 2 (production): copies only what's needed to run the app
#
# WHY MULTI-STAGE?
#   The final image doesn't contain eslint, jest, nodemon, or other dev tools.
#   This makes the production image smaller (faster to pull) and more secure
#   (fewer packages = smaller attack surface).
#
# SECURITY PRACTICES:
#   - Non-root user (node) runs the application
#   - Only production node_modules in final image
#   - No .env files copied into the image — injected at runtime

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS builder

WORKDIR /app

# Copy package files first — Docker layer cache means npm install only
# re-runs when package.json or package-lock.json changes, not on every code change
COPY package*.json ./

# Install ALL dependencies (including devDependencies for any build steps)
RUN npm ci --include=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20.19-alpine3.21 AS production

# Install wget for the HEALTHCHECK command
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies in the final image)
RUN npm ci --only=production && npm cache clean --force

# Copy application source from builder stage
COPY --from=builder /app/src ./src

# Copy package.json (needed for version field in health endpoint)
COPY package.json ./

# Security: run as non-root user
# 'node' user is built into the node:alpine image
USER node

# Expose the port the app runs on
EXPOSE 3001

# HEALTHCHECK: Docker calls this to determine container health
# --interval=30s: check every 30 seconds
# --timeout=5s: fail if no response within 5 seconds
# --start-period=20s: give the app 20 seconds to start before first check
# --retries=3: mark unhealthy after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "src/app.js"]
