require('dotenv').config();

module.exports = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim(),
  YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID?.trim(),
  YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET?.trim(),
  YOUTUBE_REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN?.trim(),
  PORT: process.env.PORT || 3000,
  TEMP_DIR: process.env.TEMP_DIR || './temp',
};
