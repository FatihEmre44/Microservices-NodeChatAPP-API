FROM node:22-alpine

WORKDIR /app

COPY chatservices/package.json ./chatservices/package.json
COPY chatservices ./chatservices

WORKDIR /app/chatservices
RUN npm install --omit=dev

EXPOSE 4003

CMD ["node", "server.js"]
