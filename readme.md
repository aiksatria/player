# 🎬 HLS Native Player

Player video murni berbasis **HLS.js** — tanpa iframe, tanpa iklan, tanpa dependencies berat.  
Dibangun dengan Node.js + Express, siap deploy ke **Render** via GitHub.

---

## ✨ Fitur

- ✅ Native HLS.js player (tidak ada iframe sama sekali)
- ✅ Proxy server bawaan untuk bypass CORS
- ✅ M3U8 segment rewriter (semua segment lewat proxy)
- ✅ Quality selector otomatis (multi-level HLS)
- ✅ Live stream detection + badge
- ✅ Picture-in-Picture support
- ✅ Keyboard shortcuts
- ✅ Info panel (resolusi, bitrate, buffer, dropped frames)
- ✅ Fullscreen
- ✅ Mobile responsive

---

## ⌨️ Keyboard Shortcuts

| Tombol | Fungsi |
|--------|--------|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Skip -10s / +10s |
| `↑` / `↓` | Volume naik / turun |
| `M` | Mute toggle |
| `F` | Fullscreen toggle |

---

## 🚀 Deploy ke Render (via GitHub)

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "init: hls player"
git branch -M main
git remote add origin https://github.com/aiksatria/hls-player.git
git push -u origin main
```

### 2. Deploy di Render

1. Buka [render.com](https://render.com) → **New Web Service**
2. Connect repo GitHub kamu
3. Render otomatis detect `render.yaml`
4. Klik **Deploy** — selesai!

### 3. Atau manual di Render

| Setting | Value |
|---------|-------|
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Port | `3000` |

---

## 🛠️ Local Development

```bash
npm install
npm run dev   # pakai nodemon (auto-restart)
# atau
npm start
```

Buka: `http://localhost:3000`

---

## 📡 API Endpoints

### `GET /proxy?url=<encoded_url>`
Proxy fetch resource (ts segment, key, dll) dengan header browser.

**Query params:**
- `url` — URL yang ingin di-fetch (wajib, URL-encoded)
- `referer` — nilai Referer header (opsional)
- `origin` — nilai Origin header (opsional)

### `GET /proxy-m3u8?url=<encoded_url>`
Fetch file `.m3u8` lalu **rewrite semua segment URL** agar lewat `/proxy`.  
Berguna untuk stream yang segmennya relative path.

**Query params:** sama seperti `/proxy`

### `GET /health`
Health check endpoint. Return JSON status + uptime.

---

## 📁 Struktur Project

```
hls-player/
├── src/
│   └── server.js        # Express server + proxy endpoints
├── public/
│   ├── index.html       # UI player
│   ├── style.css        # Styling
│   └── player.js        # HLS.js logic + controls
├── render.yaml          # Konfigurasi deploy Render
├── package.json
└── .gitignore
```

---

## 📝 Cara Pakai

1. Buka URL player
2. Paste URL `.m3u8` atau stream HLS ke input
3. Centang **"Gunakan Proxy"** jika stream kena CORS
4. Centang **"Rewrite M3U8 Segments"** jika segmen relative
5. Klik **LOAD**

---

## 🔧 Environment Variables (opsional)

Buat file `.env` di root:

```env
PORT=3000
```
