# Multi-stage production Dockerfile for Gatekeeper License Plate Gate Access Control
# Stage 1: Build Frontend and Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm ci

# Copy application source code
COPY . .

# Build production assets into /app/dist
RUN npm run build

# Stage 2: Production Server Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist
# Copy backend server script and configuration
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules ./node_modules

# Create non-root security user
RUN addgroup -S gatekeeper && adduser -S gatekeeper -G gatekeeper && \
    chown -R gatekeeper:gatekeeper /app

USER gatekeeper

# Expose standard Gatekeeper port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the full-stack server
CMD ["npx", "tsx", "server.ts"]
