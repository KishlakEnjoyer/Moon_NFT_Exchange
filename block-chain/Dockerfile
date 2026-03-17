FROM node:20-slim

WORKDIR /app

COPY package.json .
RUN npm install -g ts-node typescript

COPY . .

CMD ["npx", "hardhat", "run", "scripts/deploy.ts", "--network", "localhost"]