FROM node:20-alpine

WORKDIR /app

COPY authservices/package*.json ./authservices/
RUN cd authservices && npm ci --omit=dev

COPY authservices ./authservices

EXPOSE 4001

CMD ["node", "authservices/server.js"]