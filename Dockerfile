# Change from node:18-alpine to node:20-alpine
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Port will be set by environment variable
ENV PORT=5050
EXPOSE ${PORT}

RUN apk add --no-cache curl

CMD ["npm", "start"]
