FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY authservices ./authservices

EXPOSE 4001

CMD ["node", "authservices/server.js"]