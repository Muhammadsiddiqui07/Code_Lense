# ---------- Stage 1: install dependencies ----------
FROM node:22-alpine AS deps
# Some native modules (e.g. SWC) need this on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only the manifests first so this layer is cached until dependencies change
COPY package.json package-lock.json ./
# Cache mount keeps downloaded packages between builds; retries help on a slow network
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-retries=5 --fetch-timeout=120000

# ---------- Stage 2: build the app ----------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Needs `output: "standalone"` in next.config.mjs
RUN npm run build

# ---------- Stage 3: small runtime image ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Only what is needed to run: public assets, the standalone server, and static files
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Run as the non-root user that ships with the node image
USER node

EXPOSE 3000

# MONGO_URI and PYTHON_URL are NOT baked in; pass them at runtime
CMD ["node", "server.js"]