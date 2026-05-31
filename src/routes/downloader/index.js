const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const ytdlp = require('yt-dlp-exec');
const { instagramGetUrl } = require('instagram-url-direct');
const logger = require('../utils/logger');
const config = require('../config');

// Ensure temp directory exists
if (!fs.existsSync(config.TEMP_DIR)) {
  fs.mkdirSync(config.TEMP_DIR, { recursive: true });
}

const downloadVideo = async (url) => {
  const filename = `${randomUUID()}.mp4`;
  const outputPath = path.join(config.TEMP_DIR, filename);

  logger.info(`Starting download for URL: ${url}`);
  
  try {
    if (url.includes('instagram.com')) {
      logger.info('Using Instagram API bypass...');
      const result = await instagramGetUrl(url);
      
      if (!result || !result.url_list || result.url_list.length === 0) {
        throw new Error('Could not extract video URL from Instagram.');
      }
      
      const mediaUrl = result.url_list[0];
      
      // Download the direct file
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error(`Failed to fetch media: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      
    } else {
      logger.info('Using yt-dlp...');
      await ytdlp(url, {
        output: outputPath,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        mergeOutputFormat: 'mp4',
        noCheckCertificates: true,
        noWarnings: true
      });
    }
    
    logger.info(`Successfully downloaded to ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error(`Failed to download ${url}: ${error.message}`);
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    throw error;
  }
};

module.exports = { downloadVideo };
