/**
 * GET /api/health
 * 
 * Health check endpoint
 * 
 * curl:
 *   curl https://your-domain/api/health
 */

const { MODEL_SLUG } = require('../../lib/grok');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({
    status: 'ok',
    version: '2.0.0',
    model: MODEL_SLUG,
    features: [
      'chat',
      'file-attachments',
      'zip-auto-extract',
      'code-execution',
      'per-user-session',
      'auto-cleanup',
    ],
    endpoints: {
      chat: 'POST /api/chat',
      execute: 'POST /api/execute',
      languages: 'GET /api/languages',
      session: 'GET|DELETE /api/session',
      files: 'GET|POST /api/files',
      health: 'GET /api/health',
      docs: 'GET /',
    },
    hasCookies: !!(process.env.GROK_COOKIES && process.env.GROK_COOKIES.trim()),
    hasApiKey: !!(process.env.API_KEY && process.env.API_KEY.trim()),
    timestamp: new Date().toISOString(),
  });
}
