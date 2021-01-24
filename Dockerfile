FROM node:14-alpine

VOLUME /config

WORKDIR /app

COPY . .

RUN npm install

RUN npm install -g pm2

RUN npm run build

CMD ["pm2-runtime", "dist/index.js"]



