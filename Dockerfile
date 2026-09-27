FROM node:20-alpine

WORKDIR /app

COPY server/ ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
