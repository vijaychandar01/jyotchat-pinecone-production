# Base image with Node.js and pnpm installed
FROM node:20-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate 
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh - 

# Install dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the Next.js application
COPY . .
RUN pnpm run build

# Expose the port for the application
EXPOSE 3000

# Command to run the application in production mode
CMD ["pnpm", "run", "start"]
