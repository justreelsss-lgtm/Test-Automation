FROM node:18-bullseye-slim

# Install Python and ffmpeg for yt-dlp
RUN apt-get update && apt-get install -y python3 ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package info and install deps
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Setup temp dir
RUN mkdir -p temp
ENV TEMP_DIR=/app/temp

EXPOSE 3000

CMD ["node", "src/app.js"]
