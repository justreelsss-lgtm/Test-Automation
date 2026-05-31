require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { downloadVideo } = require('./src/downloader');

// Promisify ffprobe to easily get video durations
const ffprobe = util.promisify(ffmpeg.ffprobe);

// Setup FFMPEG path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Ensure the templates directory exists
const TEMPLATES_DIR = path.join(__dirname, 'templates');
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR);
}

const BOTTOM_TEMPLATE_1 = path.join(TEMPLATES_DIR, 'bottom1.mp4');
const BOTTOM_TEMPLATE_2 = path.join(TEMPLATES_DIR, 'bottom2.mp4');

const pendingJobs = new Map();

bot.start((ctx) => {
  ctx.reply('🎬 Test Video Editor Bot Started!\n\nSend me a link to test the new video format.');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (!text.includes('http')) {
    return ctx.reply('Please send a valid URL.');
  }

  // Save the URL for this user
  pendingJobs.set(ctx.from.id, text);
  
  // Ask which format they want to use
  await ctx.reply('Which format do you want to use?', 
    Markup.inlineKeyboard([
      [Markup.button.callback('70/30 Split (Template 1)', 'use_bottom1')],
      [Markup.button.callback('70/30 Split (Template 2)', 'use_bottom2')],
      [Markup.button.callback('Original + Watermark', 'use_watermark')]
    ])
  );
});

bot.action(/use_(bottom1|bottom2|watermark)/, async (ctx) => {
  const url = pendingJobs.get(ctx.from.id);
  if (!url) return ctx.answerCbQuery('Session expired. Send link again.');
  
  const choice = ctx.match[1];
  const isWatermark = choice === 'watermark';
  
  let bottomVideoPath;
  if (!isWatermark) {
    bottomVideoPath = choice === 'bottom1' ? BOTTOM_TEMPLATE_1 : BOTTOM_TEMPLATE_2;
    if (!fs.existsSync(bottomVideoPath)) {
      return ctx.reply(`❌ Error: Missing template files in the 'templates/' folder.\n\nPlease place your templates here:\n1. ${BOTTOM_TEMPLATE_1}\n2. ${BOTTOM_TEMPLATE_2}`);
    }
  }

  // Catch the query answer error just in case it times out
  ctx.answerCbQuery('Processing...').catch(() => {});

  // We run this in the background so Telegraf doesn't timeout after 90 seconds
  (async () => {
    try {
      const msg = await ctx.reply('⏳ Downloading original video...');
      
      // Download original video
      const originalVideoPath = await downloadVideo(url);
      const outputVideoPath = path.join(__dirname, 'temp', `edited_${Date.now()}.mp4`);
      
      await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '🛠️ Analyzing video durations...');

      // Get durations to calculate when the bottom video should appear
      const origMetadata = await ffprobe(originalVideoPath);
      const origDur = origMetadata.format.duration;
      
      const cmd = ffmpeg().input(originalVideoPath);

      if (isWatermark) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `🛠️ Editing video... (Adding Watermark)`);

        cmd.complexFilter([
          '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]',
          // Add a transparent watermark near the bottom center with increased size
          `[scaled]drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='@justreelstamil':fontsize=80:fontcolor=white@0.4:x=(w-text_w)/2:y=h-250[main_v]`
        ]);
        
      } else {
        const botMetadata = await ffprobe(bottomVideoPath);
        const botDur = botMetadata.format.duration;
        
        // Calculate start time to use the LAST `origDur` seconds of the bottom video
        const botStartTime = Math.max(0, botDur - origDur);

        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `🛠️ Editing video... (Using last ${origDur.toFixed(1)}s of bottom template)`);

        cmd.input(bottomVideoPath).seekInput(botStartTime);
        
        cmd.complexFilter([
          '[0:v]scale=1080:1344:force_original_aspect_ratio=decrease,pad=1080:1344:(ow-iw)/2:(oh-ih)/2,setsar=1[orig]',
          '[1:v]scale=1080:576:force_original_aspect_ratio=decrease,pad=1080:576:(ow-iw)/2:(oh-ih)/2,setsar=1[bot]',
          
          // Stack original and the bottom video
          '[orig][bot]vstack=inputs=2[main_v]'
        ]);
      }

      cmd.outputOptions([
          '-map [main_v]',
          '-map 0:a?', // Optionally map the original video's audio (won't crash if missing)
          '-c:v libx264',
          '-c:a aac',
          '-r 30',          
          '-preset fast',
          '-shortest', // Stop encoding when the shortest stream ends
          '-vsync 2'
        ])
        .save(outputVideoPath)
        .on('end', async () => {
          await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '✅ Video edited successfully! Sending it to you now...');
          await ctx.replyWithVideo({ source: outputVideoPath });
          
          if (fs.existsSync(originalVideoPath)) fs.unlinkSync(originalVideoPath);
          if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
        })
        .on('error', async (err, stdout, stderr) => {
          console.error('FFMPEG Error:', err);
          console.error('FFMPEG STDERR:', stderr);
          await ctx.reply('❌ Error during video editing: ' + err.message + '\n\nDetails: ' + (stderr ? stderr.split('\n').slice(-5).join('\n') : ''));
        });
        
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Error: ' + error.message);
    }
  })();
});

bot.launch().then(() => console.log('✅ Test Editor Bot Started!'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
