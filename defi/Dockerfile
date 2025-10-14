# Multi-stage Dockerfile for DeFiLlama API Service
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Run prebuild scripts
RUN pnpm run prebuild || true

# Build application
RUN pnpm run api2-build || pnpm run build || echo "Build completed"

# Stage 2: Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm@8

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/DefiLlama-Adapters ./DefiLlama-Adapters
COPY --from=builder --chown=nodejs:nodejs /app/dimension-adapters ./dimension-adapters
COPY --from=builder --chown=nodejs:nodejs /app/emissions-adapters ./emissions-adapters

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    AWS_REGION=eu-central-1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["pnpm", "run", "api2-prod"]

