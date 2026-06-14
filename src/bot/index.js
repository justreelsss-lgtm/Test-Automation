const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');
const { isValidUrl } = require('../utils/validator');

const pendingJobs = new Map();

const setupBot = () => {
  if (!config.TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN not provided, bot will not start.');
    return null;
  }

  const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply('Welcome! Send me an Instagram Reel or YouTube Short URL.');
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    if (isValidUrl(text)) {
      pendingJobs.set(ctx.from.id, text);
      await ctx.reply('Which format do you want to use?',
        Markup.inlineKeyboard([
          [Markup.button.callback('70/30 Split (Template 1)', 'use_bottom1')],
          [Markup.button.callback('70/30 Split (Template 2)', 'use_bottom2')],
          [Markup.button.callback('AI Influencer Reaction', 'use_influencer')],
          [Markup.button.callback('Original + Watermark', 'use_watermark')]
        ])
      );
    } else {
      ctx.reply('Please send a valid Instagram Reel or YouTube Short URL.');
    }
  });

  bot.action(/use_(bottom1|bottom2|influencer|watermark)/, async (ctx) => {
    const url = pendingJobs.get(ctx.from.id);
    if (!url) return ctx.answerCbQuery('Session expired. Send link again.');

    const choice = ctx.match[1];
    const chatId = ctx.chat.id;

    ctx.answerCbQuery('Triggering GitHub Action...').catch(() => { });

    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      return ctx.reply('❌ Error: GITHUB_TOKEN or GITHUB_REPO is not set in the environment variables.');
    }

    try {
      ctx.reply('🚀 Triggering GitHub Action server...');

      const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/process-video.yml/dispatches`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main', // Make sure your default branch is 'main' (or change this to 'master')
          inputs: {
            videoUrl: url,
            templateType: choice,
            chatId: String(chatId)
          }
        })
      });

      if (response.ok) {
        ctx.reply('✅ Workflow successfully triggered! GitHub is now downloading and processing your video. I will notify you when the upload is complete.');
      } else {
        const errText = await response.text();
        throw new Error(`GitHub API Error: ${response.status} - ${errText}`);
      }

    } catch (error) {
      logger.error(`Error triggering GitHub: ${error.message}`);

      const tokenPrefix = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 4) + '...' : 'none';
      const debugInfo = `\n\nDebug Info:\nRepo: "${process.env.GITHUB_REPO}"\nToken Prefix: ${tokenPrefix}`;

      ctx.reply(`❌ Failed to trigger GitHub Action: ${error.message}${debugInfo}`);
    }
  });

  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}`, err);
  });

  return bot;
};

module.exports = { setupBot };
