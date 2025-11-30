# ---------- BUILD STAGE ----------
FROM node:20-alpine AS builder

WORKDIR /app

# 1) samo package datoteke (cache deps)
COPY package*.json ./

# 2) namestimo vse odvisnosti (tudi dev – za build)
RUN npm ci

# 3) kopiramo config + source
COPY tsconfig*.json nest-cli.json ./
COPY src ./src

# 4) build v dist/
RUN npm run build

# 5) porežemo dev odvisnosti (za runtime)
RUN npm prune --omit=dev


# ---------- RUNTIME STAGE ----------
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# node_modules in build iz builder stage-a
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# port (lahko prepišeš z -e APP_PORT=...)
ENV APP_PORT=3000
EXPOSE 3000

CMD ["node", "dist/main.js"]
