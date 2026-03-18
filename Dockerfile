FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build:new

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/server/package.json ./dist/server/package.json
COPY --from=build /app/package*.json /app/.npmrc ./
RUN npm ci --omit=dev
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8000/ping/healthcheck || exit 1
CMD ["node", "dist/server/index.js"]
