/**
 * POST /api/chat
 * 
 * Chat dengan Grok AI melalui browser.
 * 
 * Headers:
 *   Authorization: Bearer <API_KEY>
 * 
 * Body (JSON):
 *   { "message": "Apa tu AI?" }
 * 
 * Response (JSON):
 *   { "success": true, "response": "AI ialah...", "method": "fetch" }
 */

const { chatWithGrok } = require('../../lib/grok');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST only
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Guna POST.' 
    });
  }
  
  // ---- Auth check ----
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (token !== apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'API key salah atau tiada. Sertakan header: Authorization: Bearer <key>' 
      });
    }
  }
  
  // ---- Parse body ----
  const { message } = req.body || {};
  
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Field "message" diperlukan.' 
    });
  }
  
  if (message.length > 10000) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message terlalu panjang (max 10,000 aksara).' 
    });
  }
  
  // ---- Chat dengan Grok ----
  const startTime = Date.now();
  
  try {
    const result = await chatWithGrok(message.trim());
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return res.status(200).json({
      success: true,
      response: result.response,
      method: result.method,
      conversationId: result.conversationId || null,
      duration: `${duration}s`,
    });
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Try parse structured error
    let errorInfo;
    try {
      errorInfo = JSON.parse(error.message);
    } catch {
      errorInfo = { type: 'UNKNOWN', message: error.message };
    }
    
    const statusCode = errorInfo.type === 'COOKIES_EXPIRED' ? 401 : 500;
    
    return res.status(statusCode).json({
      success: false,
      error: errorInfo.message,
      errorType: errorInfo.type,
      duration: `${duration}s`,
    });
  }
}
