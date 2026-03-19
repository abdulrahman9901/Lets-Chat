FROM node:20-alpine

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start-prod"]

