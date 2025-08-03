# Change from node:18-alpine to node:20-alpine
FROM node:20-alpine

WORKDIR /app

# Install Chromium and other dependencies needed for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    curl

# Tell Puppeteer to skip installing Chromium since we installed it manually
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5060

CMD ["npm", "start"]
