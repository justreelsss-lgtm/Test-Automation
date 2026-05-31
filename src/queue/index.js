const fs = require('fs');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { downloadVideo } = require('../downloader');
const { uploadVideo } = require('../uploader');

// Simple in-memory storage for jobs since it's just one URL at a time
const jobs = new Map();
let isProcessing = false;
const queue = [];

const processJob = async (job) => {
  job.state = 'active';
  job.progress = 10;
  let videoPath = null;
  
  try {
    logger.info(`Processing job ${job.id} for URL: ${job.data.url}`);
    
    // Download
    videoPath = await downloadVideo(job.data.url);
    job.progress = 50;
    
    // Upload
    const ytData = await uploadVideo(videoPath, {
      title: `Trending Reel ${Date.now()} #shorts`,
      description: `Original URL: ${job.data.url}\n\n#shorts #trending`,
      tags: ['shorts', 'trending', 'reels'],
      privacyStatus: 'private' 
    });
    
    job.progress = 100;
    job.state = 'completed';
    job.returnvalue = {
      videoId: ytData.id,
      originalUrl: job.data.url,
      uploadTime: new Date().toISOString()
    };
    logger.info(`Job ${job.id} completed! YouTube Video ID: ${ytData.id}`);
    if (job.callbacks?.onSuccess) job.callbacks.onSuccess(job.returnvalue);
    
  } catch (error) {
    job.state = 'failed';
    job.failedReason = error.message;
    logger.error(`Job ${job.id} failed: ${error.message}`);
    if (job.callbacks?.onError) job.callbacks.onError(error);
  } finally {
    if (videoPath && fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      logger.info(`Cleaned up temp file: ${videoPath}`);
    }
  }
};

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  const job = queue.shift();
  await processJob(job);
  isProcessing = false;
  
  // Process next if any
  processQueue();
};

const addJob = async (url, callbacks = {}) => {
  // Check for duplicates
  for (const [id, existingJob] of jobs.entries()) {
    if (existingJob.data.url === url && ['waiting', 'active', 'completed'].includes(existingJob.state)) {
      throw new Error('URL already processed or in queue');
    }
  }
  
  const id = randomUUID();
  const job = {
    id,
    name: 'process-video',
    data: { url },
    progress: 0,
    state: 'waiting',
    failedReason: null,
    returnvalue: null,
    callbacks
  };
  
  jobs.set(id, job);
  queue.push(job);
  logger.info(`Added job ${job.id} for URL: ${url}`);
  
  // Start processing if not already running
  processQueue();
  
  return job;
};

const getQueueStats = async () => {
  let waiting = 0, active = 0, completed = 0, failed = 0;
  for (const job of jobs.values()) {
    if (job.state === 'waiting') waiting++;
    if (job.state === 'active') active++;
    if (job.state === 'completed') completed++;
    if (job.state === 'failed') failed++;
  }
  return { waiting, active, completed, failed };
};

const getAllJobs = async () => {
  return Array.from(jobs.values());
};

module.exports = {
  addJob,
  getQueueStats,
  getAllJobs
};
