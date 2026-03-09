/**
 * POST /api/chat
 * 
 * Chat dengan Grok AI
 * 
 * Body:
 *   {
 *     "message": "Hello Grok",
 *     "userId": "user123",        // Optional, untuk session
 *     "model": "grok-3",          // Optional: grok-3 (default), grok-2, grok-fast
 *     "files": [{                 // Optional
 *       "name": "file.txt",
 *       "data": "base64...",
 *       "mimeType": "text/plain"
 *     }],
 *     "enableSearch": true,       // Optional, default ON (only for grok-3/grok-2)
 *     "enableScrape": true        // Optional, default ON (only for grok-3/grok-2)
 *   }
 * 
 * Models:
 *   - grok-3: Most capable, full internet access (default)
 *   - grok-2: Balanced speed and capability, internet access
 *   - grok-fast: Fastest response, NO internet
 * 
 * curl:
 *   curl -X POST https://your-domain/api/chat \
 *     -H "Content-Type: application/json" \
 *     -H "Authorization: Bearer YOUR_API_KEY" \
 *     -d '{"message": "Hello", "model": "grok-3"}'
 */

const { chatWithGrok } = require('../../lib/grok');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Support large file uploads
    },
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }
  
  // Auth check
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (token !== apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or missing API key.' 
      });
    }
  }
  
  // Parse body
  const { 
    message, 
    userId = 'default',
    model = 'grok-3',  // default ke model paling power
    files = [],
    enableSearch = true,  // default ON
    enableScrape = true,  // default ON
  } = req.body || {};
  
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ 
      success: false, 
      error: 'Field "message" is required.' 
    });
  }
  
  if (message.length > 50000) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message too long (max 50,000 chars).' 
    });
  }
  
  const startTime = Date.now();
  
  try {
    const result = await chatWithGrok({
      message: message.trim(),
      userId,
      model,
      files,
      enableSearch,
      enableScrape,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return res.status(200).json({
      success: true,
      response: result.response,
      model: result.model,
      modelInfo: result.modelInfo,
      features: result.features,
      conversationId: result.conversationId || null,
      webResults: result.webResults || [],
      extractedFiles: result.extractedFiles || [],
      duration: `${duration}s`,
    });
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
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
