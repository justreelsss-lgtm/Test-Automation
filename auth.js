const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID?.trim(),
  process.env.YOUTUBE_CLIENT_SECRET?.trim(),
  "http://localhost:3000/oauth2callback"
);

// We need the youtube.upload scope to upload videos
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // This forces Google to provide a new refresh token
  scope: SCOPES,
});

console.log('\n======================================================');
console.log('1. Authorize this app by visiting this URL in your browser:\n');
console.log(authUrl);
console.log('======================================================\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('2. After logging in and authorizing, you will be redirected to a URL that looks like:\n   http://localhost:3000/oauth2callback?code=4/0AeaYIo...&scope=...\n\n   Copy the string AFTER "code=" and BEFORE "&scope" and paste it here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n=== ✅ SUCCESS ===\n');
    console.log('Your new YOUTUBE_REFRESH_TOKEN is:\n');
    console.log(tokens.refresh_token);
    console.log('\nCopy the token above and replace the old one in your .env file.');
  } catch (err) {
    console.error('\n❌ Error getting tokens:', err.message);
    console.log('Make sure you copied only the code parameter and not the whole URL.');
  } finally {
    rl.close();
  }
});
