# Dockerfile — Order Service (Node.js / Express)
# Multi-stage build — same pattern as user-service

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

FROM node:20-alpine AS production
RUN apk add --no-cache wget
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/src ./src
COPY package.json ./
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3002/health || exit 1
CMD ["node", "src/app.js"]

