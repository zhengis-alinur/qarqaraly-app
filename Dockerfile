FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
ARG NEXT_PUBLIC_TILE_ATTRIBUTION="© OpenStreetMap contributors"
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_TILE_URL=$NEXT_PUBLIC_TILE_URL NEXT_PUBLIC_TILE_ATTRIBUTION=$NEXT_PUBLIC_TILE_ATTRIBUTION
RUN npm run build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 UPLOAD_DIR=/app/uploads
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 nextjs -G nodejs && mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
FROM deps AS tools
WORKDIR /app
COPY scripts ./scripts
COPY content ./content
COPY src/lib ./src/lib
COPY tsconfig.json ./
ENTRYPOINT ["node", "--import", "tsx"]
# Keep production runtime as the default final target.
FROM runner AS production
