/**
 * GET /api/health
 * 
 * Health check — verify API berjalan.
 */

export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'Grok API',
    timestamp: new Date().toISOString(),
    hasCookies: !!(process.env.GROK_COOKIES && process.env.GROK_COOKIES.trim()),
    hasApiKey: !!(process.env.API_KEY && process.env.API_KEY.trim()),
  });
}
