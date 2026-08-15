# ─────────────────────────────────────────────────────────────────
# DropShare Server — Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder): install all deps including devDeps
#   Stage 2 (runtime): copy only production deps + source
#
# Runs as non-root user 'node' for security.
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files first — Docker layer caching:
# If package.json doesn't change, npm install layer is cached
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production runtime ──────────────────────────────────
FROM node:20-alpine AS runtime

# Create app directory
WORKDIR /app

# Don't run as root — security best practice
USER node

# Copy only production node_modules from builder stage
COPY --from=builder --chown=node:node /build/node_modules ./node_modules

# Copy application source
COPY --chown=node:node src/ ./src/
COPY --chown=node:node package.json ./

# Expose the application port
EXPOSE 5000

# Health check — ALB uses GET /health to determine instance health
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
