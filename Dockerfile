FROM node:20-slim

RUN apt-get update && apt-get install -y openssl git

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE ${PORT:-3001}

CMD ["npm", "run", "start-with-migrate"]