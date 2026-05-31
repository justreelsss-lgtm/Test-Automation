require('dotenv').config();
const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 1. Configure your OAuth2 Client using the .env variables
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const TEST_VIDEO_PATH = 'c:\\Users\\acer\\Desktop\\Youtube Automation\\temp\\b4eef960-562f-416e-9461-60ff97280633.mp4';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// 2. Start local server to catch the callback code
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send('Authentication failed. No code found.');
  }

  try {
    // 3. Exchange the temporary code for permanent tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('\n==================================================');
    console.log('🎉 SUCCESS! TOKENS RECEIVED FROM GOOGLE:');
    console.log('==================================================');
    console.log(`REFRESH_TOKEN: ${tokens.refresh_token}`);
    console.log('👉 Copy this refresh token and update your .env file with it!');
    console.log('==================================================\n');

    res.send('Successfully authenticated! You can close this tab. Check your terminal console for the refresh token and upload progress.');

    // 4. Trigger the test upload immediately now that we are authorized
    await runTestUpload();

  } catch (error) {
    console.error('Error exchanging token:', error.message);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// 5. Function to upload the test video
async function runTestUpload() {
  console.log('Starting test video upload...');
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    if (!fs.existsSync(TEST_VIDEO_PATH)) {
      throw new Error(`Test video file not found at path: ${TEST_VIDEO_PATH}`);
    }

    const fileSize = fs.statSync(TEST_VIDEO_PATH).size;

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: 'API Test Video',
          description: 'Testing nodejs script upload workflow.',
          categoryId: '22'
        },
        status: {
          privacyStatus: 'private', // Uploaded as private so it doesn't show publicly
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        contentType: 'video/mp4',
        body: fs.createReadStream(TEST_VIDEO_PATH)
      }
    }, {
      onUploadProgress: evt => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`Upload Progress: ${Math.round(progress)}%`);
      }
    });

    console.log('\n🚀 TEST UPLOAD SUCCESSFUL!');
    console.log(`Uploaded Video ID: ${response.data.id}`);
    console.log('You can close this script terminal process now. (Ctrl+C)');
    process.exit(0);

  } catch (error) {
    console.error('❌ Upload execution failed:', error.response?.data?.error || error.message);
    process.exit(1);
  }
}

// 6. Start the flow
app.listen(PORT, () => {
  // Generate the auth URL with access_type: 'offline' to enforce refresh token delivery
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    prompt: 'consent', // Forces Google to show consent screen and give refresh token again
    // CORRECTED SCOPE to allow video uploads
    scope: ['https://www.googleapis.com/auth/youtube.upload'] 
  });

  console.log('==================================================');
  console.log('🔗 CLICK THE URL BELOW TO AUTHORIZE AND RUN TEST:');
  console.log('==================================================');
  console.log(authUrl);
  console.log('==================================================\n');
});
