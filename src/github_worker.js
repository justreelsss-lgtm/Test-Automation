require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const util = require('util');
const { downloadVideo } = require('./downloader');
const { uploadVideo } = require('./uploader');
const { Telegraf } = require('telegraf');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const ffprobe = util.promisify(ffmpeg.ffprobe);

const url = process.argv[2];
const templateType = process.argv[3];
const chatId = process.argv[4];

if (!url || !templateType || !chatId) {
  console.error("Missing arguments: url, templateType, or chatId");
  process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const BOTTOM_TEMPLATE_1 = path.join(TEMPLATES_DIR, 'bottom1.mp4');
const BOTTOM_TEMPLATE_2 = path.join(TEMPLATES_DIR, 'bottom2.mp4');
const INFLUENCER_TEMPLATE = path.join(TEMPLATES_DIR, 'Influencer.mp4');

const sendMessage = async (text) => {
  try {
    await bot.telegram.sendMessage(chatId, text);
  } catch (e) {
    console.error("Failed to send telegram message", e.message);
  }
};

(async () => {
  try {
    await sendMessage(`⚙️ GitHub Actions started processing your video...\nURL: ${url}`);
    
    const originalVideoPath = await downloadVideo(url);
    const outputVideoPath = path.join(__dirname, '..', 'temp', `edited_${Date.now()}.mp4`);
    
    const isWatermark = templateType === 'watermark';
    
    let bottomVideoPath;
    if (!isWatermark) {
      if (templateType === 'bottom1') bottomVideoPath = BOTTOM_TEMPLATE_1;
      else if (templateType === 'bottom2') bottomVideoPath = BOTTOM_TEMPLATE_2;
      else if (templateType === 'influencer') bottomVideoPath = INFLUENCER_TEMPLATE;
      else bottomVideoPath = BOTTOM_TEMPLATE_1; // fallback

      if (!fs.existsSync(bottomVideoPath)) {
        throw new Error(`Missing template file: ${bottomVideoPath}`);
      }
    }

    const origMetadata = await ffprobe(originalVideoPath);
    const origDur = origMetadata.format.duration;
    
    const cmd = ffmpeg().input(originalVideoPath);

    if (isWatermark) {
      cmd.complexFilter([
        '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[scaled]',
        `[scaled]drawtext=text='@justreelstamil':fontsize=80:fontcolor=white@0.4:x=(w-text_w)/2:y=h-250[main_v]`
      ]);
    } else {
      const botMetadata = await ffprobe(bottomVideoPath);
      const botDur = botMetadata.format.duration;
      
      const botStartTime = Math.max(0, botDur - origDur);
      cmd.input(bottomVideoPath).seekInput(botStartTime);
      
      cmd.complexFilter([
        '[0:v]scale=1080:1344:force_original_aspect_ratio=increase,crop=1080:1344,setsar=1[orig]',
        '[1:v]scale=1080:576:force_original_aspect_ratio=increase,crop=1080:576,setsar=1[bot]',
        '[orig][bot]vstack=inputs=2[main_v]'
      ]);
    }

    await new Promise((resolve, reject) => {
      cmd.outputOptions([
        '-map [main_v]',
        '-map 0:a?', 
        '-c:v libx264',
        '-c:a aac',
        '-r 30',          
        '-preset fast',
        '-shortest',
        '-vsync 2'
      ])
      .save(outputVideoPath)
      .on('end', resolve)
      .on('error', reject);
    });

    await sendMessage(`✅ Video edited successfully! Now uploading to YouTube...`);

    const captions = [
      {
        title: `This is too funny! 😂 Wait for it... #shorts`,
        description: `I can't stop laughing at this! 💀 Drop a comment if you laughed! 👇\n\n#funny #comedy #viral #trending #shorts #reactionvideo`
      },
      {
        title: `I wasn't expecting THAT! 🤣 #shorts`,
        description: `Bro what even is this?! 😭 Tag a friend who needs to see this! 👇\n\n#funny #viral #comedy #shorts #lol #reaction`
      },
      {
        title: `This actually had me dying! 💀😂 #shorts`,
        description: `Wait until the end... 🤯 What do you guys think? 👇\n\n#funnyvideo #comedy #viral #trending #shorts #lmao`
      },
      {
        title: `Bro really thought he did something 😂 #shorts`,
        description: `I'm crying right now! 🤣 Let me know your thoughts below! 👇\n\n#funny #viral #trending #shorts #comedy #reactionvideo`
      },
      {
        title: `Watch until the end! 🤣 Wait for it... #shorts`,
        description: `This is the funniest thing I've seen all day! 💀 Comment below! 👇\n\n#funny #comedy #viral #trending #shorts #lol`
      }
    ];

    const randomCaption = captions[Math.floor(Math.random() * captions.length)];

    const ytData = await uploadVideo(outputVideoPath, {
      title: randomCaption.title,
      description: randomCaption.description,
      tags: ['shorts', 'funny', 'viral', 'trending', 'comedy', 'reels', 'reaction'],
      privacyStatus: 'public' 
    });

    await sendMessage(`🎉 Upload complete!\nYouTube Video ID: ${ytData.id}\nOriginal URL: ${url}`);

    // Cleanup
    if (fs.existsSync(originalVideoPath)) fs.unlinkSync(originalVideoPath);
    if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);

  } catch (error) {
    console.error(error);
    await sendMessage(`❌ GitHub Action Error: ${error.message}`);
    process.exit(1);
  }
})();
