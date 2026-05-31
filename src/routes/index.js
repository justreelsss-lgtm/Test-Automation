const express = require('express');
const { getQueueStats, getAllJobs } = require('../queue');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const jobs = await getAllJobs();
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
