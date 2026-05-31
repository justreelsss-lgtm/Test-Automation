const isValidUrl = (string) => {
  try {
    const url = new URL(string);
    const validHosts = ['instagram.com', 'www.instagram.com', 'youtube.com', 'www.youtube.com', 'youtu.be'];
    if (!validHosts.includes(url.hostname)) return false;
    
    // Check for shorts or reels specifically if needed
    if (url.hostname.includes('youtube') || url.hostname.includes('youtu.be')) {
      return url.pathname.includes('/shorts/') || url.pathname.includes('/watch') || url.hostname === 'youtu.be';
    }
    
    if (url.hostname.includes('instagram.com')) {
      return url.pathname.includes('/reel/') || url.pathname.includes('/p/');
    }
    
    return true;
  } catch (_) {
    return false;
  }
};

module.exports = { isValidUrl };
