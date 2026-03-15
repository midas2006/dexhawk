const https = require('https');

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DexHawk/1.0', ...headers } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      error: 'No token provided',
      message: 'Please access this page through your Whop purchase confirmation link.'
    });
  }

  try {
    const WHOP_API_KEY    = process.env.WHOP_API_KEY;
    const WHOP_PRODUCT_ID = process.env.WHOP_PRODUCT_ID;
    const FILE_SCRIPT_URL = process.env.FILE_SCRIPT_URL;
    const FILE_README_URL = process.env.FILE_README_URL;

    const whopRes = await httpsGet(
      `https://api.whop.com/api/v2/memberships/${token}`,
      { 'Authorization': `Bearer ${WHOP_API_KEY}` }
    );

    if (whopRes.status !== 200) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Your purchase token could not be verified. Please contact support.'
      });
    }

    const membership = whopRes.body;
    const isValid = ['active', 'trialing', 'past_due'].includes(membership.status);

    if (!isValid) {
      return res.status(403).json({
        error: 'Membership not active',
        message: 'Your membership is not currently active. Please contact support.'
      });
    }

    return res.status(200).json({
      success: true,
      files: [
        { name: 'token_sniper.py', description: 'Main Bot Script', url: FILE_SCRIPT_URL },
        { name: 'README_token_sniper.md', description: 'Setup Guide', url: FILE_README_URL }
      ],
      instructions: [
        'Download both files to the same folder on your computer',
        'Run: pip install requests schedule colorama',
        'Create a Telegram bot via @BotFather and get your token',
        'Get your chat ID via @userinfobot',
        'Edit the CONFIG section in token_sniper.py',
        'Run: python token_sniper.py — alerts start immediately'
      ]
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again or contact support.'
    });
  }
};
