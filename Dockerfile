FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p data secrets

EXPOSE 3000

CMD ["npm", "start"]

