/**
 * GROK API - Full Featured Browser Client
 * 
 * Features:
 *   - Chat biasa (text)
 *   - File attachments (any type + caption)
 *   - ZIP auto-extract (recursive)
 *   - Auto search (Grok decide)
 *   - Auto scrape (Grok bukak website)
 *   - Code execution (50+ languages via Piston)
 *   - Send file back
 *   - Per-user session management
 *   - Auto cleanup
 * 
 * Model: grok-fast (no internet, fastest)
 */

// Set env SEBELUM require chromium
process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// CONSTANTS
// ============================================================
const GROK_URL = 'https://grok.com/';
const GROK_API_BASE = 'https://grok.com/rest/app-chat';
const PISTON_API = 'https://emkc.org/api/v2/piston';
const TEMP_DIR = path.join(os.tmpdir(), 'grok-files');

// Available models
const MODELS = {
  'grok-3': { name: 'Grok 3', hasInternet: true, description: 'Most capable, full features' },
  'grok-2': { name: 'Grok 2', hasInternet: true, description: 'Balanced speed and capability' },
  'grok-fast': { name: 'Grok Fast', hasInternet: false, description: 'Fastest, no internet' },
};
const DEFAULT_MODEL = 'grok-3'; // Default ke model paling power

// Session storage (per-user)
const sessions = new Map();

// ============================================================
// COOKIE PARSER - Netscape format
// ============================================================
function parseCookies(raw) {
  if (!raw?.trim()) return [];
  
  const cookies = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    
    const parts = trimmed.split('\t');
    if (parts.length >= 7) {
      const cookie = {
        name: parts[5].trim(),
        value: parts[6].trim(),
        domain: parts[0].trim(),
        path: parts[2].trim(),
        secure: parts[3].trim().toUpperCase() === 'TRUE',
        httpOnly: false,
      };
      
      const expiry = parseInt(parts[4].trim());
      if (expiry > 0) cookie.expires = expiry;
      
      cookies.push(cookie);
    }
  }
  return cookies;
}

// ============================================================
// FILE UTILITIES
// ============================================================
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

function cleanupFiles(userId) {
  const userDir = path.join(TEMP_DIR, userId);
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}

function saveFile(userId, filename, buffer) {
  const userDir = path.join(ensureTempDir(), userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const filepath = path.join(userDir, filename);
  fs.writeFileSync(filepath, buffer);
  return filepath;
}

function getFile(userId, filename) {
  const filepath = path.join(TEMP_DIR, userId, filename);
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath);
  }
  return null;
}

function listFiles(userId) {
  const userDir = path.join(TEMP_DIR, userId);
  if (!fs.existsSync(userDir)) return [];
  return fs.readdirSync(userDir);
}

// ============================================================
// ZIP EXTRACTOR - Recursive
// ============================================================
async function extractZip(buffer, userId, depth = 0) {
  if (depth > 5) return []; // Max recursion depth
  
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const extracted = [];
  
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    
    const filename = path.basename(entry.entryName);
    const content = entry.getData();
    
    // Recursive extract if nested zip
    if (filename.toLowerCase().endsWith('.zip')) {
      const nested = await extractZip(content, userId, depth + 1);
      extracted.push(...nested);
    } else {
      const filepath = saveFile(userId, `${depth}_${filename}`, content);
      extracted.push({
        name: filename,
        path: filepath,
        size: content.length,
      });
    }
  }
  
  return extracted;
}

// ============================================================
// CODE EXECUTOR - Piston API (50+ languages)
// ============================================================
const LANGUAGE_ALIASES = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'rs': 'rust',
  'go': 'go',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'cs': 'csharp',
  'php': 'php',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'scala': 'scala',
  'r': 'r',
  'perl': 'perl',
  'lua': 'lua',
  'bash': 'bash',
  'sh': 'bash',
  'sql': 'sqlite3',
  'asm': 'nasm',
};

async function executeCode(language, code, stdin = '') {
  const lang = LANGUAGE_ALIASES[language.toLowerCase()] || language.toLowerCase();
  
  // Get runtime info
  const runtimesRes = await fetch(`${PISTON_API}/runtimes`);
  const runtimes = await runtimesRes.json();
  const runtime = runtimes.find(r => r.language === lang || r.aliases?.includes(lang));
  
  if (!runtime) {
    return { success: false, error: `Language "${language}" tidak disokong.` };
  }
  
  // Execute
  const execRes = await fetch(`${PISTON_API}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ content: code }],
      stdin: stdin,
      compile_timeout: 10000,
      run_timeout: 10000,
    }),
  });
  
  const result = await execRes.json();
  
  return {
    success: !result.run?.stderr,
    language: runtime.language,
    version: runtime.version,
    output: result.run?.stdout || '',
    error: result.run?.stderr || result.compile?.stderr || '',
    exitCode: result.run?.code || 0,
  };
}

async function listLanguages() {
  const res = await fetch(`${PISTON_API}/runtimes`);
  const runtimes = await res.json();
  return runtimes.map(r => ({
    language: r.language,
    version: r.version,
    aliases: r.aliases || [],
  }));
}

// ============================================================
// BROWSER LAUNCHER
// ============================================================
async function launchBrowser() {
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;
  
  const executablePath = await chromium.executablePath();
  const execDir = path.dirname(executablePath);
  
  process.env.LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH 
    ? `${execDir}:${process.env.LD_LIBRARY_PATH}` 
    : execDir;
  
  return puppeteer.launch({
    args: [
      ...chromium.args,
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================
function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      conversationId: null,
      history: [],
      files: [],
      createdAt: Date.now(),
    });
  }
  return sessions.get(userId);
}

function clearSession(userId) {
  sessions.delete(userId);
  cleanupFiles(userId);
}

// ============================================================
// GROK API CALLER (via Browser)
// ============================================================
async function callGrokAPI(page, payload) {
  return page.evaluate(async (data) => {
    try {
      const res = await fetch('https://grok.com/rest/app-chat/conversations/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      
      const text = await res.text();
      let fullResponse = '';
      let conversationId = '';
      let webResults = [];
      let generatedFiles = [];
      
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const d = JSON.parse(line);
          
          if (d?.result?.response?.token) {
            fullResponse += d.result.response.token;
          }
          if (d?.result?.response?.conversationId) {
            conversationId = d.result.response.conversationId;
          }
          if (d?.result?.response?.modelResponse?.outputText) {
            fullResponse = d.result.response.modelResponse.outputText;
          }
          if (d?.result?.response?.webSearchResults) {
            webResults = d.result.response.webSearchResults;
          }
          if (d?.result?.response?.generatedFiles) {
            generatedFiles = d.result.response.generatedFiles;
          }
        } catch {}
      }
      
      return { 
        ok: true, 
        response: fullResponse, 
        conversationId,
        webResults,
        generatedFiles,
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, payload);
}

// ============================================================
// MAIN: CHAT WITH GROK
// ============================================================
async function chatWithGrok(options) {
  const {
    message,
    userId = 'default',
    model = DEFAULT_MODEL, // grok-3, grok-2, or grok-fast
    files = [],            // Array of { name, data (base64), mimeType }
    enableSearch = true,   // Auto search (Grok decide) - default ON
    enableScrape = true,   // Auto scrape websites - default ON
  } = options;
  
  // Validate model
  const modelSlug = MODELS[model] ? model : DEFAULT_MODEL;
  const modelInfo = MODELS[modelSlug];
  
  const cookieRaw = process.env.GROK_COOKIES || '';
  const cookies = parseCookies(cookieRaw);
  
  if (cookies.length === 0) {
    throw new Error('GROK_COOKIES belum set.');
  }
  
  const session = getSession(userId);
  let browser;
  
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    );
    
    await page.setCookie(...cookies);
    await page.goto(GROK_URL, { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Check login
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin') || url.includes('/auth')) {
      throw new Error('COOKIES_EXPIRED');
    }
    
    // Verify logged in
    const isLoggedIn = await page.evaluate(() => {
      const hasInput = document.querySelector('textarea') || 
                       document.querySelector('[contenteditable="true"]');
      return !!hasInput;
    });
    
    if (!isLoggedIn) {
      throw new Error('COOKIES_EXPIRED');
    }
    
    // Process file attachments
    const fileAttachments = [];
    const extractedFiles = [];
    
    for (const file of files) {
      const buffer = Buffer.from(file.data, 'base64');
      
      // Auto extract ZIP
      if (file.name.toLowerCase().endsWith('.zip')) {
        const extracted = await extractZip(buffer, userId);
        extractedFiles.push(...extracted);
        
        // Add extracted files info to message
        const fileList = extracted.map(f => `- ${f.name} (${f.size} bytes)`).join('\n');
        if (fileList) {
          // Append to message context
        }
      } else {
        // Save file
        const filepath = saveFile(userId, file.name, buffer);
        session.files.push({ name: file.name, path: filepath });
        
        // Convert to attachment format
        fileAttachments.push({
          name: file.name,
          data: file.data,
          mimeType: file.mimeType || 'application/octet-stream',
        });
      }
    }
    
    // Build API payload
    // Search hanya available kalau model ada internet
    const canSearch = modelInfo.hasInternet && enableSearch;
    const canScrape = modelInfo.hasInternet && enableScrape;
    
    const payload = {
      temporary: false,
      modelSlug: modelSlug,
      message: message,
      fileAttachments: fileAttachments,
      imageAttachments: [],
      disableSearch: !canSearch,     // Enable search kalau model support
      enableWebsiteScrape: canScrape, // Enable scrape kalau model support
      enableImageGeneration: false,
      returnImageBytes: false,
      returnRawGrokInXaiRequest: false,
      sendFinalMetadata: true,
      customInstructions: '',
      deepsearchPreset: '',
      isPreset: false,
    };
    
    // Use existing conversation if any
    if (session.conversationId) {
      payload.conversationId = session.conversationId;
    }
    
    // Call Grok API
    const result = await callGrokAPI(page, payload);
    
    if (!result.ok) {
      throw new Error(result.error || 'Grok API error');
    }
    
    // Update session
    session.conversationId = result.conversationId;
    session.history.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });
    session.history.push({
      role: 'assistant', 
      content: result.response,
      timestamp: Date.now(),
    });
    
    return {
      success: true,
      response: result.response,
      conversationId: result.conversationId,
      webResults: result.webResults || [],
      generatedFiles: result.generatedFiles || [],
      extractedFiles: extractedFiles.map(f => f.name),
      model: modelSlug,
      modelInfo: modelInfo,
      features: {
        search: canSearch,
        scrape: canScrape,
      },
    };
    
  } catch (error) {
    let errorType = 'UNKNOWN';
    if (error.message.includes('COOKIES_EXPIRED')) errorType = 'COOKIES_EXPIRED';
    else if (error.message.includes('net::')) errorType = 'NETWORK_ERROR';
    
    throw new Error(JSON.stringify({ type: errorType, message: error.message }));
    
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  chatWithGrok,
  executeCode,
  listLanguages,
  parseCookies,
  launchBrowser,
  getSession,
  clearSession,
  saveFile,
  getFile,
  listFiles,
  cleanupFiles,
  extractZip,
  MODELS,
  DEFAULT_MODEL,
  PISTON_API,
};
