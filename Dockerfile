# Change from node:18-alpine to node:20-alpine
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Port will be set by environment variable at runtime
# EXPOSE will be handled by Docker Compose port mapping

# Curl removed due to CVE-2025-9086 - using Node for healthchecks

CMD ["npm", "start"]
