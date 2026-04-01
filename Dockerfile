# syntax=docker/dockerfile:1

############################
# 1) Build stage
############################
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer cache
COPY package*.json ./

# Deterministic install for CI/CD
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

############################
# 2) Runtime stage (Nginx)
############################
FROM nginx:1.27-alpine AS runner

# Replace default server config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
