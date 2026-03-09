import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const endpoints = [
  {
    method: 'POST',
    path: '/api/chat',
    title: 'Chat',
    description: 'Chat dengan Grok AI (grok-fast). Internet access via server-side DuckDuckGo search dan web scrape.',
    body: {
      message: 'Search latest AI news 2024',
      userId: 'user123',
      files: [{ name: 'file.txt', data: 'base64...', mimeType: 'text/plain' }],
      enableSearch: true,
      enableScrape: true,
      searchQuery: null,
      scrapeUrls: [],
    },
    response: {
      success: true,
      response: 'Based on the search results, here are the latest AI news...',
      model: 'grok-fast',
      features: { search: true, scrape: false },
      conversationId: 'conv_123',
      webResults: [{ url: 'https://...', title: 'AI News', snippet: '...' }],
      scrapedContent: [],
      extractedFiles: [],
      duration: '3.2s',
    },
    curl: `curl -X POST {BASE_URL}/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"message": "Search latest AI news"}'`,
  },
  {
    method: 'POST',
    path: '/api/execute',
    title: 'Execute Code',
    description: 'Execute code dalam 50+ bahasa via Piston API',
    body: {
      language: 'python',
      code: 'print("Hello World")',
      stdin: '',
    },
    response: {
      success: true,
      language: 'python',
      version: '3.10.0',
      output: 'Hello World\n',
      error: '',
      exitCode: 0,
    },
    curl: `curl -X POST {BASE_URL}/api/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"language": "python", "code": "print(1+1)"}'`,
  },
  {
    method: 'GET',
    path: '/api/languages',
    title: 'List Languages',
    description: 'Senarai semua bahasa yang disokong untuk code execution (50+)',
    body: null,
    response: {
      success: true,
      count: 50,
      languages: [{ language: 'python', version: '3.10.0', aliases: ['py'] }],
    },
    curl: `curl {BASE_URL}/api/languages`,
  },
  {
    method: 'GET',
    path: '/api/session?userId=xxx',
    title: 'Get Session',
    description: 'Dapatkan info session user - conversation history, files, etc',
    body: null,
    response: {
      success: true,
      userId: 'user123',
      conversationId: 'conv_123',
      historyCount: 5,
      files: ['doc.pdf', 'code.py'],
      createdAt: 1699999999999,
    },
    curl: `curl "{BASE_URL}/api/session?userId=user123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'DELETE',
    path: '/api/session?userId=xxx',
    title: 'Clear Session',
    description: 'Clear session & auto cleanup semua files user',
    body: null,
    response: {
      success: true,
      message: 'Session "user123" cleared.',
    },
    curl: `curl -X DELETE "{BASE_URL}/api/session?userId=user123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/api/files?userId=xxx',
    title: 'List Files',
    description: 'List semua files yang ada dalam session user',
    body: null,
    response: {
      success: true,
      userId: 'user123',
      files: ['doc.pdf', 'image.png'],
    },
    curl: `curl "{BASE_URL}/api/files?userId=user123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  },
  {
    method: 'GET',
    path: '/api/files?userId=xxx&filename=xxx',
    title: 'Download File',
    description: 'Download specific file dari session user',
    body: null,
    response: 'Binary file data',
    curl: `curl "{BASE_URL}/api/files?userId=user123&filename=doc.pdf" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  --output doc.pdf`,
  },
  {
    method: 'POST',
    path: '/api/files',
    title: 'Upload File',
    description: 'Upload file ke session user (base64 encoded)',
    body: {
      userId: 'user123',
      filename: 'test.txt',
      data: 'SGVsbG8gV29ybGQh',
    },
    response: {
      success: true,
      message: 'File "test.txt" saved.',
      size: 12,
    },
    curl: `curl -X POST {BASE_URL}/api/files \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"userId":"user123","filename":"test.txt","data":"SGVsbG8="}'`,
  },
  {
    method: 'GET',
    path: '/api/health',
    title: 'Health Check',
    description: 'Check API status, version, dan semua features',
    body: null,
    response: {
      status: 'ok',
      version: '2.0.0',
      model: 'grok-fast',
      features: ['chat', 'file-attachments', 'zip-auto-extract', 'code-execution'],
    },
    curl: `curl {BASE_URL}/api/health`,
  },
];

const features = [
  { icon: '💬', title: 'Chat', desc: 'Hantar text, Grok jawab' },
  { icon: '📎', title: 'File Attachments', desc: 'Any file type + caption' },
  { icon: '🗜️', title: 'ZIP Auto-Extract', desc: 'Recursive! Zip dalam zip' },
  { icon: '🔍', title: 'Auto Search', desc: 'DuckDuckGo search, inject ke context' },
  { icon: '🌐', title: 'Auto Scrape', desc: 'Scrape URL dalam message' },
  { icon: '⚡', title: 'Code Execution', desc: '50+ languages via Piston' },
  { icon: '📤', title: 'Send File Back', desc: 'Grok boleh return files' },
  { icon: '👥', title: 'Per-User Session', desc: 'Isolated conversations' },
  { icon: '🧹', title: 'Auto Cleanup', desc: 'Files auto deleted' },
  { icon: '🚀', title: 'grok-fast', desc: 'Fastest model + our internet' },
];

function MethodBadge({ method }) {
  const colors = {
    GET: { bg: '#064e3b', text: '#6ee7b7' },
    POST: { bg: '#1e3a5f', text: '#7dd3fc' },
    DELETE: { bg: '#7f1d1d', text: '#fca5a5' },
  };
  const c = colors[method] || colors.GET;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      fontSize: '11px',
      fontWeight: '700',
      padding: '4px 8px',
      borderRadius: '4px',
      fontFamily: 'monospace',
    }}>
      {method}
    </span>
  );
}

function EndpointCard({ endpoint, baseUrl }) {
  const [expanded, setExpanded] = useState(false);
  const curl = endpoint.curl.replace(/\{BASE_URL\}/g, baseUrl);

  return (
    <div style={{
      border: '1px solid #2a2a2a',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '8px',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: expanded ? '#151515' : '#111',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <MethodBadge method={endpoint.method} />
        <code style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '13px' }}>
          {endpoint.path}
        </code>
        <span style={{ color: '#666', fontSize: '13px', marginLeft: 'auto' }}>
          {endpoint.title}
        </span>
        <span style={{
          color: '#555',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }}>
          ▼
        </span>
      </button>
      
      {expanded && (
        <div style={{
          borderTop: '1px solid #2a2a2a',
          padding: '16px',
          background: '#0a0a0a',
        }}>
          <p style={{ color: '#999', fontSize: '13px', marginBottom: '16px' }}>
            {endpoint.description}
          </p>
          
          {endpoint.body && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#666', fontSize: '11px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
                Request Body
              </h4>
              <pre style={{
                background: '#151515',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                overflow: 'auto',
                color: '#e0e0e0',
                border: '1px solid #2a2a2a',
              }}>
                {JSON.stringify(endpoint.body, null, 2)}
              </pre>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#666', fontSize: '11px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              Response
            </h4>
            <pre style={{
              background: '#151515',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
              color: '#e0e0e0',
              border: '1px solid #2a2a2a',
            }}>
              {typeof endpoint.response === 'string' 
                ? endpoint.response 
                : JSON.stringify(endpoint.response, null, 2)}
            </pre>
          </div>
          
          <div>
            <h4 style={{ color: '#666', fontSize: '11px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>
              cURL Example
            </h4>
            <pre style={{
              background: '#0f1f0f',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto',
              color: '#4ade80',
              border: '1px solid #1a3a1a',
            }}>
              {curl}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Docs() {
  const [baseUrl, setBaseUrl] = useState('');
  
  // Auto-detect base URL dari browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  return (
    <>
      <Head>
        <title>API Docs — Grok API v2.0</title>
        <meta name="description" content="Grok AI API documentation" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0a0a0a; 
          color: #e0e0e0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
      
      <div style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          borderBottom: '1px solid #222',
          background: '#111',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
              }}>
                G
              </div>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Grok API</h1>
                <p style={{ fontSize: '11px', color: '#666' }}>v2.0 • grok-fast + server-side internet</p>
              </div>
            </div>
            <Link href="/" style={{
              background: '#2563eb',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none',
            }}>
              ← Back to Chat
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>
          {/* Features Grid */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Features</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  background: '#151515',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
                  <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{f.title}</h3>
                  <p style={{ fontSize: '12px', color: '#666' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Base URL Info */}
          <section style={{
            background: '#0f1f0f',
            border: '1px solid #1a3a1a',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#4ade80', fontSize: '14px' }}>Base URL:</span>
              <code style={{ 
                background: '#151515', 
                padding: '6px 12px', 
                borderRadius: '4px',
                fontSize: '13px',
                color: '#4ade80',
              }}>
                {baseUrl || 'Loading...'}
              </code>
            </div>
          </section>

          {/* Endpoints */}
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>API Endpoints</h2>
            {endpoints.map((endpoint, i) => (
              <EndpointCard key={i} endpoint={endpoint} domain={domain} />
            ))}
          </section>

          {/* Setup Guide */}
          <section style={{
            background: '#151515',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '32px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Setup Guide</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                1. Environment Variables
              </h3>
              <pre style={{
                background: '#0a0a0a',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#e0e0e0',
                border: '1px solid #2a2a2a',
              }}>
{`GROK_COOKIES=<netscape format cookies dari grok.com>
API_KEY=<optional, untuk auth>`}
              </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                2. Get Cookies
              </h3>
              <p style={{ fontSize: '13px', color: '#999', lineHeight: '1.6' }}>
                Login ke grok.com → DevTools (F12) → Application → Cookies → grok.com<br/>
                Export dalam format Netscape (tab-separated). Boleh guna extension seperti "Cookie-Editor".
              </p>
            </div>

            <div>
              <h3 style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                3. Deploy ke Vercel
              </h3>
              <p style={{ fontSize: '13px', color: '#999', lineHeight: '1.6' }}>
                Push ke GitHub dan connect dengan Vercel. Set environment variables di Vercel Dashboard.
                API akan available di /api/chat, /api/execute, etc.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: '12px' }}>
            <p>Created by <strong style={{ color: '#888' }}>Earl</strong></p>
            <p style={{ marginTop: '4px' }}>Code, break, learn, repeat</p>
          </footer>
        </main>
      </div>
    </>
  );
}
