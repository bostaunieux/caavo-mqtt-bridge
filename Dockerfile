FROM node:14-alpine

VOLUME /config

WORKDIR /app

COPY . .

RUN npm install --production

CMD ["npm", "start"]



