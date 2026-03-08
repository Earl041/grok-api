import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const chatEndRef = useRef(null);

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('grok_api_key');
    if (saved) {
      setApiKey(saved);
      setShowSettings(false);
    }
  }, []);

  // Auto scroll ke bawah
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveApiKey = () => {
    localStorage.setItem('grok_api_key', apiKey);
    setShowSettings(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!apiKey.trim()) {
      alert('Sila masukkan API Key terlebih dahulu!');
      setShowSettings(true);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.response,
          method: data.method,
          duration: data.duration,
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          text: `❌ ${data.error || 'Ralat tidak diketahui'}`,
          errorType: data.errorType,
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'error',
        text: `❌ Gagal menghubungi API: ${err.message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      <Head>
        <title>Grok API — Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0a0a0a; 
          color: #e0e0e0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>⚡</span>
            <h1 style={styles.title}>Grok API</h1>
          </div>
          <div style={styles.headerRight}>
            <button onClick={clearChat} style={styles.btnClear}>🗑️ Clear</button>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              style={styles.btnSettings}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div style={styles.settings}>
            <label style={styles.label}>🔑 API Key</label>
            <div style={styles.settingsRow}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Masukkan API key..."
                style={styles.inputKey}
              />
              <button onClick={saveApiKey} style={styles.btnSave}>Simpan</button>
            </div>
          </div>
        )}

        {/* Chat area */}
        <div style={styles.chatArea}>
          {messages.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>⚡</p>
              <p style={styles.emptyTitle}>Grok API</p>
              <p style={styles.emptySubtitle}>Hantar mesej untuk mula berbual dengan Grok AI</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              ...styles.msgRow,
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                ...styles.msgBubble,
                ...(msg.role === 'user' ? styles.userBubble : 
                    msg.role === 'error' ? styles.errorBubble : styles.assistantBubble),
              }}>
                <pre style={styles.msgText}>{msg.text}</pre>
                {msg.duration && (
                  <span style={styles.msgMeta}>
                    {msg.method === 'fetch' ? '⚡' : '🖱️'} {msg.method} • {msg.duration}
                  </span>
                )}
                {msg.errorType && (
                  <span style={styles.msgMeta}>Jenis: {msg.errorType}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.msgRow}>
              <div style={{...styles.msgBubble, ...styles.assistantBubble}}>
                <div style={styles.loadingDots}>
                  <span>⚡ Grok sedang berfikir</span>
                  <span style={styles.dots}>...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div style={styles.inputBar}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Taip mesej anda..."
            style={styles.inputMsg}
            rows={1}
            disabled={loading}
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || !input.trim()}
            style={{
              ...styles.btnSend,
              opacity: (loading || !input.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #222',
    background: '#111',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  logo: {
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  btnClear: {
    background: '#222',
    color: '#aaa',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  btnSettings: {
    background: '#222',
    color: '#aaa',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  settings: {
    padding: '12px 16px',
    background: '#151515',
    borderBottom: '1px solid #222',
  },
  settingsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '6px',
  },
  label: {
    fontSize: '13px',
    color: '#888',
  },
  inputKey: {
    flex: 1,
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#e0e0e0',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  btnSave: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    opacity: 0.5,
  },
  emptyIcon: {
    fontSize: '48px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#666',
  },
  msgRow: {
    display: 'flex',
    width: '100%',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userBubble: {
    background: '#2563eb',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    background: '#1e1e1e',
    color: '#e0e0e0',
    borderBottomLeftRadius: '4px',
    border: '1px solid #2a2a2a',
  },
  errorBubble: {
    background: '#2d1111',
    color: '#ff6b6b',
    borderBottomLeftRadius: '4px',
    border: '1px solid #3d1111',
  },
  msgText: {
    margin: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  msgMeta: {
    display: 'block',
    marginTop: '6px',
    fontSize: '11px',
    color: '#666',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    color: '#888',
    fontSize: '14px',
  },
  dots: {
    animation: 'blink 1s infinite',
  },
  inputBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #222',
    background: '#111',
  },
  inputMsg: {
    flex: 1,
    background: '#1a1a1a',
    border: '1px solid #333',
    color: '#e0e0e0',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
  },
  btnSend: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
