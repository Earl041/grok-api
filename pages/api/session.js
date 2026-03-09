/**
 * GET/DELETE /api/session
 * 
 * Manage user sessions
 * 
 * GET  - Get session info
 * DELETE - Clear session & cleanup files
 * 
 * Query: ?userId=user123
 * 
 * curl:
 *   curl "https://your-domain/api/session?userId=user123"
 *   curl -X DELETE "https://your-domain/api/session?userId=user123"
 */

const { getSession, clearSession, listFiles } = require('../../lib/grok');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
  
  const { userId = 'default' } = req.query;
  
  if (req.method === 'GET') {
    const session = getSession(userId);
    const files = listFiles(userId);
    
    return res.status(200).json({
      success: true,
      userId,
      conversationId: session.conversationId,
      historyCount: session.history.length,
      files,
      createdAt: session.createdAt,
    });
  }
  
  if (req.method === 'DELETE') {
    clearSession(userId);
    
    return res.status(200).json({
      success: true,
      message: `Session "${userId}" cleared.`,
    });
  }
  
  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed. Use GET or DELETE.' 
  });
}
