FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

# Primero solo los manifiestos: así la capa de dependencias se cachea
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# La imagen oficial incluye el usuario "node" (sin privilegios de root)
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
