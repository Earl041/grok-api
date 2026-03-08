/**
 * Grok Browser Client — Puppeteer on Vercel
 * 
 * Guna @sparticuz/chromium untuk run Chrome dalam serverless.
 * Bypass Cloudflare dengan browser sebenar.
 * 
 * 2 kaedah:
 *   1. Fetch API dari dalam browser context (laju)
 *   2. DOM interaction — type + click (fallback, lebih perlahan)
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// ============================================================
// COOKIE PARSER — Format Netscape (tab-separated)
// ============================================================
function parseCookies(raw) {
  if (!raw || !raw.trim()) return [];
  
  const cookies = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    // Skip comments dan empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    
    const parts = trimmed.split('\t');
    // Netscape format: domain \t includeSubdomains \t path \t secure \t expiry \t name \t value
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
      if (expiry > 0) {
        cookie.expires = expiry;
      }
      
      cookies.push(cookie);
    }
  }
  
  return cookies;
}

// ============================================================
// LAUNCH BROWSER — Proven config untuk Vercel serverless
// ============================================================
async function launchBrowser() {
  // Wajib set sebelum launch — supaya chromium tahu mode
  chromium.setHeadlessMode = true;
  chromium.setGraphicsMode = false;
  
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  
  return browser;
}

// ============================================================
// KAEDAH 1: Fetch API dari dalam browser
// ============================================================
async function tryFetchMethod(page, message) {
  const result = await page.evaluate(async (msg) => {
    try {
      const res = await fetch('https://grok.com/rest/app-chat/conversations/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          temporary: false,
          modelSlug: 'grok-3',
          message: msg,
          fileAttachments: [],
          imageAttachments: [],
          disableSearch: false,
          enableImageGeneration: true,
          returnImageBytes: false,
          returnRawGrokInXaiRequest: false,
          sendFinalMetadata: true,
          customInstructions: '',
          deepsearchPreset: '',
          isPreset: false,
        }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        return { error: `HTTP ${res.status}`, ok: false };
      }
      
      const text = await res.text();
      let fullResponse = '';
      let conversationId = '';
      
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          // Collect tokens
          if (data?.result?.response?.token) {
            fullResponse += data.result.response.token;
          }
          // Get conversation ID
          if (data?.result?.response?.conversationId) {
            conversationId = data.result.response.conversationId;
          }
          // Get final model response
          if (data?.result?.response?.modelResponse?.outputText) {
            fullResponse = data.result.response.modelResponse.outputText;
          }
        } catch {}
      }
      
      return { response: fullResponse, conversationId, ok: true };
    } catch (err) {
      return { error: err.message, ok: false };
    }
  }, message);
  
  return result;
}

// ============================================================
// KAEDAH 2: DOM Interaction (type + click)
// ============================================================
async function tryDOMMethod(page, message) {
  // Cari textarea
  const textareaSelectors = [
    'textarea[placeholder]',
    'textarea',
    'div[contenteditable="true"]',
    '[role="textbox"]',
  ];
  
  let textarea = null;
  for (const sel of textareaSelectors) {
    try {
      textarea = await page.waitForSelector(sel, { timeout: 8000 });
      if (textarea) break;
    } catch {}
  }
  
  if (!textarea) {
    throw new Error('Textarea tidak dijumpai — mungkin Grok UI berubah');
  }
  
  // Click textarea dulu
  await textarea.click();
  await new Promise(r => setTimeout(r, 500));
  
  // Type message — human-like delay
  await textarea.type(message, { delay: 30 });
  await new Promise(r => setTimeout(r, 500));
  
  // Tekan Enter untuk hantar
  await page.keyboard.press('Enter');
  
  // Tunggu response mula muncul
  await new Promise(r => setTimeout(r, 4000));
  
  // Monitor response sehingga stabil
  let responseText = '';
  let lastLength = 0;
  let stableCount = 0;
  
  for (let i = 0; i < 45; i++) {
    responseText = await page.evaluate(() => {
      // Cuba pelbagai selector untuk response Grok
      const selectors = [
        'div[data-testid="message-content"]',
        'div.message-content',
        'article div',
        '[data-message-author-role="assistant"]',
        'div[class*="response"]',
        'div[class*="message"]',
        'div[class*="chat"] div[class*="content"]',
      ];
      
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          const last = els[els.length - 1];
          const text = last.innerText || last.textContent || '';
          if (text.trim().length > 5) return text.trim();
        }
      }
      
      // Fallback — cari semua text containers yang besar
      const allDivs = document.querySelectorAll('div');
      let longestText = '';
      for (const div of allDivs) {
        const text = div.innerText || '';
        if (text.length > longestText.length && text.length > 20) {
          // Skip kalau ni input area
          if (!div.querySelector('textarea') && !div.querySelector('input')) {
            longestText = text;
          }
        }
      }
      
      return longestText;
    });
    
    if (responseText.length > 0 && responseText.length === lastLength) {
      stableCount++;
      if (stableCount >= 4) break; // Stabil 4 kali berturut = siap
    } else {
      stableCount = 0;
    }
    
    lastLength = responseText.length;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  return responseText;
}

// ============================================================
// MAIN: Chat dengan Grok
// ============================================================
async function chatWithGrok(message) {
  const cookieRaw = process.env.GROK_COOKIES || '';
  const cookies = parseCookies(cookieRaw);
  
  if (cookies.length === 0) {
    throw new Error('GROK_COOKIES belum di-set. Tambah di Vercel Environment Variables.');
  }
  
  let browser;
  
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    // Set User-Agent macam Chrome biasa
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set cookies sebelum navigate
    await page.setCookie(...cookies);
    
    // Navigate ke Grok
    await page.goto('https://grok.com/', {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });
    
    // Check login status
    const url = page.url();
    const content = await page.content();
    
    if (url.includes('login') || url.includes('signin') || 
        content.includes('Sign in') || content.includes('Log in')) {
      throw new Error('COOKIES_EXPIRED — Cookies dah expired, sila update.');
    }
    
    // ---- Kaedah 1: Cuba fetch API dulu (laju) ----
    try {
      const fetchResult = await tryFetchMethod(page, message);
      if (fetchResult.ok && fetchResult.response) {
        return {
          success: true,
          response: fetchResult.response,
          conversationId: fetchResult.conversationId || null,
          method: 'fetch',
        };
      }
    } catch (e) {
      // Fetch gagal — teruskan ke DOM
      console.log('[Grok] Fetch method gagal:', e.message);
    }
    
    // ---- Kaedah 2: DOM interaction (fallback) ----
    const domResponse = await tryDOMMethod(page, message);
    
    if (!domResponse) {
      throw new Error('Tiada response dari Grok — cuba lagi.');
    }
    
    return {
      success: true,
      response: domResponse,
      conversationId: null,
      method: 'dom',
    };
    
  } catch (error) {
    // Categorize errors
    let errorType = 'UNKNOWN';
    if (error.message.includes('COOKIES_EXPIRED')) errorType = 'COOKIES_EXPIRED';
    else if (error.message.includes('net::')) errorType = 'NETWORK_ERROR';
    else if (error.message.includes('Textarea')) errorType = 'UI_CHANGED';
    else if (error.message.includes('Tiada response')) errorType = 'NO_RESPONSE';
    
    throw new Error(JSON.stringify({
      type: errorType,
      message: error.message,
    }));
    
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

module.exports = { chatWithGrok, parseCookies, launchBrowser };
