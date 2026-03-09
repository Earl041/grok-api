/**
 * POST /api/chat
 * 
 * Chat dengan Grok AI (grok-fast) + Internet via server-side search/scrape
 * 
 * Body:
 *   {
 *     "message": "Hello Grok",
 *     "userId": "user123",        // Optional, untuk session
 *     "files": [{                 // Optional
 *       "name": "file.txt",
 *       "data": "base64...",
 *       "mimeType": "text/plain"
 *     }],
 *     "enableSearch": true,       // Optional, auto web search (default ON)
 *     "enableScrape": true,       // Optional, auto scrape URLs (default ON)
 *     "searchQuery": "AI news",   // Optional, force search query
 *     "scrapeUrls": ["https://..."] // Optional, force scrape URLs
 *   }
 * 
 * Features:
 *   - Uses grok-fast (fastest model)
 *   - Internet access via our own DuckDuckGo search
 *   - Auto scrape any URLs in message
 *   - Results injected into prompt context
 * 
 * curl:
 *   curl -X POST https://your-domain/api/chat \
 *     -H "Content-Type: application/json" \
 *     -H "Authorization: Bearer YOUR_API_KEY" \
 *     -d '{"message": "Search latest AI news"}'
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
    files = [],
    enableSearch = true,   // auto search bila detect keywords
    enableScrape = true,   // auto scrape URLs dalam message
    searchQuery = null,    // force search specific query
    scrapeUrls = [],       // force scrape specific URLs
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
      files,
      enableSearch,
      enableScrape,
      searchQuery,
      scrapeUrls,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return res.status(200).json({
      success: true,
      response: result.response,
      model: result.model,
      features: result.features,
      conversationId: result.conversationId || null,
      webResults: result.webResults || [],
      scrapedContent: result.scrapedContent || [],
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
