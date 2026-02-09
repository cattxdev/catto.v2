# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma:generate

# Build the application (tsc + copy:templates via cpy-cli)
RUN pnpm build

# Ensure HTML templates are in dist (fallback if cpy-cli glob fails on Alpine)
RUN mkdir -p dist/lib/templates && cp src/lib/templates/*.html dist/lib/templates/

# Production stage
FROM node:20-alpine AS production

ARG DEPLOY_VERSION=dev
ENV DEPLOY_VERSION=$DEPLOY_VERSION

# Install Chromium for Puppeteer (rank card / leaderboard image generation)
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont

# Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built application and runtime assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/languages ./languages

# Generate Prisma Client (needed for production)
RUN pnpm prisma:generate

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 4000

# Health check: wget sends GET, discards body, checks HTTP status
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO /dev/null http://localhost:4000/api/health || exit 1

# Run migrations and start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/index.js"]
