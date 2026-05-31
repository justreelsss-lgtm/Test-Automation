const { uploadVideo } = require('./src/uploader/index.js');

const filePath = 'c:\\Users\\acer\\Desktop\\Youtube Automation\\temp\\b4eef960-562f-416e-9461-60ff97280633.mp4';

async function test() {
  try {
    console.log('Testing upload for:', filePath);
    const result = await uploadVideo(filePath, {
      title: 'Test Video',
      description: 'This is a test upload from the bot',
      privacyStatus: 'private'
    });
    console.log('Upload Result:', result);
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

test();
