# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Production server
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
