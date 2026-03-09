/**
 * POST /api/execute
 * 
 * Execute code in 50+ languages via Piston API
 * 
 * Body:
 *   {
 *     "language": "python",
 *     "code": "print('Hello World')",
 *     "stdin": ""  // Optional input
 *   }
 * 
 * curl:
 *   curl -X POST https://your-domain/api/execute \
 *     -H "Content-Type: application/json" \
 *     -H "Authorization: Bearer YOUR_API_KEY" \
 *     -d '{"language": "python", "code": "print(1+1)"}'
 */

const { executeCode } = require('../../lib/grok');

export const config = {
  maxDuration: 30,
};

export default async function handler(req, res) {
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
  
  const { language, code, stdin = '' } = req.body || {};
  
  if (!language) {
    return res.status(400).json({ 
      success: false, 
      error: 'Field "language" is required.' 
    });
  }
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Field "code" is required.' 
    });
  }
  
  try {
    const result = await executeCode(language, code, stdin);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
