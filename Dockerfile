FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV NODE_ENV=production PORT=5000
EXPOSE 5000
LABEL org.opencontainers.image.source="https://github.com/mafzalkalwardev/bulk-email-verifier"
CMD ["node", "server.js"]
