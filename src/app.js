const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { setupBot } = require('./bot');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Setup Telegram Bot
const bot = setupBot();
if (bot) {
  bot.launch()
    .then(() => logger.info('Telegram Bot started'))
    .catch(err => logger.error(`Failed to start Telegram Bot: ${err.message}`));
}

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  if (bot) bot.stop('SIGINT');
  // Need to close BullMQ queue and worker gracefully here usually
  // worker.close(), uploadQueue.close()
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

app.listen(config.PORT, () => {
  logger.info(`Server is running on port ${config.PORT}`);
});
