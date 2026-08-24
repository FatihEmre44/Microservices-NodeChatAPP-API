FROM node:22-alpine

WORKDIR /app

COPY chatservices/package*.json ./chatservices/

WORKDIR /app/chatservices
RUN npm ci --omit=dev

WORKDIR /app
COPY chatservices ./chatservices

WORKDIR /app/chatservices

EXPOSE 4003

CMD ["node", "server.js"]
