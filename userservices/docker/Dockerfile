FROM node:22-alpine

WORKDIR /app

COPY userservices/package.json userservices/package-lock.json ./userservices/
COPY userservices ./userservices
COPY package.json ./package.json

WORKDIR /app/userservices
RUN npm install --omit=dev

EXPOSE 4002

CMD ["node", "server.js"]
