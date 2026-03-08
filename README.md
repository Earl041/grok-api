# ⚡ Grok API — Vercel Edition

Chat dengan Grok AI melalui API anda sendiri. Hosted di Vercel percuma.

## 🚀 Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "Grok API"
git remote add origin https://github.com/username/grok-api.git
git push -u origin main
```

### 2. Deploy di Vercel

1. Pergi ke [vercel.com](https://vercel.com)
2. Import repository dari GitHub
3. Set **Environment Variables**:

| Variable | Keterangan |
|----------|------------|
| `API_KEY` | API key pilihan kau (contoh: `grok-secret-123`) |
| `GROK_COOKIES` | Paste **FULL** isi `cookies.txt` |

4. Klik **Deploy**

### 3. Test

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Chat
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer grok-secret-123" \
  -d '{"message": "Apa itu AI?"}'
```

Atau buka `https://your-app.vercel.app` untuk Web UI.

## 📁 Struktur

```
├── lib/grok.js          # Grok client (Puppeteer)
├── pages/
│   ├── index.js         # Web chat UI
│   └── api/
│       ├── chat.js      # POST /api/chat
│       └── health.js    # GET /api/health
├── package.json
├── vercel.json
└── .env.example
```

## 🔧 API Endpoints

### `POST /api/chat`

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Body:**
```json
{ "message": "Apa khabar?" }
```

**Response:**
```json
{
  "success": true,
  "response": "Khabar baik! Ada apa yang boleh saya bantu?",
  "method": "fetch",
  "duration": "8.2s"
}
```

### `GET /api/health`

```json
{
  "status": "ok",
  "hasCookies": true,
  "hasApiKey": true
}
```

## ⚠️ Nota

- Cookies akan **expired** — update `GROK_COOKIES` di Vercel bila perlu
- Vercel function timeout: **60 saat** — cukup untuk kebanyakan response
- Setiap request = browser baru — response ambil ~8-15 saat
