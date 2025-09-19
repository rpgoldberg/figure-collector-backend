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

# Download and install patched Chrome for Testing (140.0.7339.185)
# Backend has Puppeteer as a dependency which would download vulnerable Chrome
RUN apt-get update && apt-get install -y wget unzip \
    && wget -q https://storage.googleapis.com/chrome-for-testing-public/140.0.7339.185/linux64/chrome-linux64.zip \
    && unzip chrome-linux64.zip \
    && mv chrome-linux64 /opt/chrome \
    && rm chrome-linux64.zip \
    && chmod +x /opt/chrome/chrome \
    && apt-get remove -y wget unzip \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path for Puppeteer and skip download
ENV PUPPETEER_EXECUTABLE_PATH=/opt/chrome/chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./

RUN npm install --no-audit --no-fund

# Remove any Chrome that might have been downloaded by Puppeteer
RUN rm -rf /root/.cache/puppeteer \
    && rm -rf node_modules/puppeteer/.local-chromium \
    && rm -rf node_modules/puppeteer-core/.local-chromium

COPY . .

RUN npm run build

# Create non-root user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser \
    && chown -R nodeuser:nodeuser /app

USER nodeuser

# Port will be set by environment variable at runtime
# EXPOSE will be handled by Docker Compose port mapping

CMD ["npm", "start"]
