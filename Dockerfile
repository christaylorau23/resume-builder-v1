FROM node:20-alpine

# Install pnpm directly via npm — bypasses Corepack entirely
RUN npm install -g pnpm@8.15.6

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json       ./packages/types/
COPY packages/core/package.json        ./packages/core/
COPY packages/eslint-config/package.json  ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/api/package.json             ./apps/api/

# Install all workspace deps (Puppeteer skips Chromium on Railway)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN pnpm install --frozen-lockfile

# Copy source (only what's needed for the API build)
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build @repo/types → @repo/core → apps/api in correct dep order
RUN pnpm --filter api... build

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
