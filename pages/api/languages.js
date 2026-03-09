/**
 * GET /api/languages
 * 
 * List all supported programming languages for code execution
 * 
 * curl:
 *   curl https://your-domain/api/languages
 */

const { listLanguages } = require('../../lib/grok');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET.' 
    });
  }
  
  try {
    const languages = await listLanguages();
    return res.status(200).json({
      success: true,
      count: languages.length,
      languages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
