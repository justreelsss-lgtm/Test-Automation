# YouTube Shorts Automation Bot

This system allows you to send an Instagram Reel or YouTube Short URL to a Telegram Bot, which then automatically downloads the highest quality version of the video and uploads it to your YouTube channel as a Short.

## Features
- **Telegram Bot Integration:** Send links directly through Telegram.
- **Robust Downloading:** Utilizes `yt-dlp` for extracting the highest quality videos.
- **Queueing System:** Built with `BullMQ` and `Redis` for reliable background processing, with retries and state management.
- **YouTube Upload:** Seamlessly uploads directly using the YouTube Data API v3.
- **REST API:** Check system health and queue stats on the fly.
- **Docker & Render Ready:** Production-ready deployment setup included.

## Prerequisites
1. **Node.js**: v18+
2. **Redis Server**: Running locally or remotely (URL configured in `.env`).
3. **Python & FFmpeg**: Required by `yt-dlp` for downloading and merging. (These are bundled automatically if using the provided Dockerfile).

## Setup & Run Locally
1. Clone the repository and install dependencies (already done if you're in the workspace).
   ```bash
   npm install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   
3. **Configure the Environment Variables**:
   - `TELEGRAM_BOT_TOKEN`: Obtain from [@BotFather](https://t.me/BotFather) on Telegram.
   - `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`: 
     - Go to Google Cloud Console.
     - Enable the "YouTube Data API v3".
     - Create OAuth 2.0 Credentials (Web Application or Desktop App).
     - Authorize the app to your channel and extract the refresh token using the Google OAuth2 Playground (ensure scopes include `https://www.googleapis.com/auth/youtube.upload`).
   - `REDIS_URL`: Your Redis connection string (e.g., `redis://localhost:6379`).

4. Start the Application:
   ```bash
   node src/app.js
   ```

## API Endpoints
- `GET /api/health`: Health check.
- `GET /api/stats`: Queue statistics (waiting, active, completed, failed).
- `GET /api/jobs`: Detailed information about jobs in the queue.

## Deployment to Render
The provided `render.yaml` and `Dockerfile` make this simple:
1. Push this repository to GitHub.
2. In the Render Dashboard, create a new "Blueprint" from your repository.
3. Render will automatically provision a Redis instance and deploy the Web Service via Docker.
4. Go to the Environment section in Render and fill in the un-synced secrets (`TELEGRAM_BOT_TOKEN`, `YOUTUBE_CLIENT_*`, etc).
