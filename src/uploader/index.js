const { google } = require('googleapis');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

const oauth2Client = new google.auth.OAuth2(
  config.YOUTUBE_CLIENT_ID,
  config.YOUTUBE_CLIENT_SECRET,
  "http://localhost:3000/oauth2callback");

// We assume the refresh token is valid and set in config
if (config.YOUTUBE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: config.YOUTUBE_REFRESH_TOKEN
  });
}

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client
});

const uploadVideo = async (filePath, options = {}) => {
  const {
    title = 'Awesome Short #shorts',
    description = 'Check out this awesome short! #shorts',
    tags = ['shorts', 'trending'],
    privacyStatus = 'private' // default to private for safety
  } = options;

  logger.info(`Starting upload for ${filePath}`);

  try {
    const fileSize = fs.statSync(filePath).size;
    const res = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title,
          description,
          tags,
          categoryId: '22' // People & Blogs
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(filePath)
      }
    }, {
      onUploadProgress: evt => {
        const progress = (evt.bytesRead / fileSize) * 100;
        logger.info(`Upload Progress: ${Math.round(progress)}%`);
      }
    });

    logger.info(`Successfully uploaded video. Video ID: ${res.data.id}`);
    return res.data;
  } catch (error) {
    logger.error(`Upload failed: ${error.message}`);
    throw error;
  }
};

module.exports = { uploadVideo };
