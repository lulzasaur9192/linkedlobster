FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ src/
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
