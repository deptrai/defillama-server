# DeFiLlama WebSocket Server Dockerfile
# 100% FREE solution with unlimited connections
# Optimized for high-performance WebSocket handling

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S defillama -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=defillama:nodejs /app/dist ./dist
COPY --from=builder --chown=defillama:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=defillama:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown defillama:nodejs /app/logs

# Switch to non-root user
USER defillama

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/server.js"]

# Labels
LABEL maintainer="DeFiLlama Team"
LABEL description="DeFiLlama WebSocket Server for Self-hosted Supabase"
LABEL version="1.0.0"
