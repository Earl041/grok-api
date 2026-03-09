/**
 * GET/POST /api/files
 * 
 * File management
 * 
 * GET  - List or download files
 * POST - Upload file
 * 
 * Query:
 *   ?userId=user123
 *   ?userId=user123&filename=test.txt  (download)
 * 
 * curl:
 *   curl "https://your-domain/api/files?userId=user123"
 *   curl "https://your-domain/api/files?userId=user123&filename=test.txt" --output test.txt
 *   curl -X POST "https://your-domain/api/files" \
 *     -H "Content-Type: application/json" \
 *     -d '{"userId":"user123","filename":"test.txt","data":"base64..."}'
 */

const { saveFile, getFile, listFiles } = require('../../lib/grok');

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
  
  if (req.method === 'GET') {
    const { userId = 'default', filename } = req.query;
    
    // Download specific file
    if (filename) {
      const fileData = getFile(userId, filename);
      if (!fileData) {
        return res.status(404).json({
          success: false,
          error: `File "${filename}" not found.`,
        });
      }
      
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(fileData);
    }
    
    // List files
    const files = listFiles(userId);
    return res.status(200).json({
      success: true,
      userId,
      files,
    });
  }
  
  if (req.method === 'POST') {
    const { userId = 'default', filename, data } = req.body || {};
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Field "filename" is required.',
      });
    }
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Field "data" (base64) is required.',
      });
    }
    
    try {
      const buffer = Buffer.from(data, 'base64');
      const filepath = saveFile(userId, filename, buffer);
      
      return res.status(200).json({
        success: true,
        message: `File "${filename}" saved.`,
        size: buffer.length,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  
  return res.status(405).json({ 
    success: false, 
    error: 'Method not allowed. Use GET or POST.' 
  });
}
