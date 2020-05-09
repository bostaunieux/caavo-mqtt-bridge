FROM node:8-alpine

VOLUME /config

WORKDIR /app

COPY . .

RUN npm install --production

CMD ["npm", "start"]



