# Using Ubuntu 22.04 LTS with official Node.js binaries for better security
FROM ubuntu:22.04

# Install Node.js 24 using official binaries (avoids package manager CVEs)
RUN apt-get update && apt-get install -y \
    curl \
    xz-utils \
    && NODE_VERSION=v24.8.0 \
    && curl -fsSLO https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz \
    && tar -xJf node-${NODE_VERSION}-linux-x64.tar.xz -C /usr/local --strip-components=1 \
    && rm node-${NODE_VERSION}-linux-x64.tar.xz \
    && apt-get remove -y curl xz-utils \
    && apt-get autoremove -y --purge \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

# Create non-root user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser \
    && chown -R nodeuser:nodeuser /app

USER nodeuser

# Port will be set by environment variable at runtime
# EXPOSE will be handled by Docker Compose port mapping

CMD ["npm", "start"]
