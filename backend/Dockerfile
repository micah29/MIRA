# ---------- ELINA backend (NestJS + Prisma) ----------
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npx prisma generate && npx nest build
ENV NODE_ENV=production TZ=Asia/Jakarta
EXPOSE 3000
# Apply database migrations (or create tables if no migrations folder), then start the API
CMD ["sh", "-c", "if [ -d prisma/migrations ]; then npx prisma migrate deploy; else npx prisma db push --skip-generate; fi && node dist/main"]
