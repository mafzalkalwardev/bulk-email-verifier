FROM node:20-bookworm-slim
# mongodb-memory-server (used when MONGO_URI is empty or unreachable) needs libcurl.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
LABEL org.opencontainers.image.source="https://github.com/mafzalkalwardev/bulk-email-verifier"
# The Go verifier is a separate compose service. This image only serves the UI and API.
CMD ["node", "server.js"]
