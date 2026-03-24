🎬 HLS Native Player
Player video murni berbasis HLS.js — tanpa iframe, tanpa iklan, tanpa dependencies berat.
Dibangun dengan Node.js + Express, siap deploy ke Render via GitHub.
✨ Fitur
✅ Native HLS.js player (tidak ada iframe sama sekali)
✅ Proxy server bawaan untuk bypass CORS
✅ M3U8 segment rewriter (semua segment lewat proxy)
✅ Quality selector otomatis (multi-level HLS)
✅ Live stream detection + badge
✅ Picture-in-Picture support
✅ Keyboard shortcuts
✅ Info panel (resolusi, bitrate, buffer, dropped frames)
✅ Fullscreen
✅ Mobile responsive
⌨️ Keyboard Shortcuts
Tombol
Fungsi
Space / K
Play / Pause
← / →
Skip -10s / +10s
↑ / ↓
Volume naik / turun
M
Mute toggle
F
Fullscreen toggle
🚀 Deploy ke Render (via GitHub)
1. Push ke GitHub
git init
git add .
git commit -m "init: hls player"
git branch -M main
git remote add origin https://github.com/USERNAME/hls-player.git
git push -u origin main
2. Deploy di Render
Buka render.com → New Web Service
Connect repo GitHub kamu
Render otomatis detect render.yaml
Klik Deploy — selesai!
3. Atau manual di Render
Setting
Value
Environment
Node
Build Command
npm install
Start Command
npm start
Port
3000
🛠️ Local Development
npm install
npm run dev   # pakai nodemon (auto-restart)
# atau
npm start
Buka: http://localhost:3000
📡 API Endpoints
GET /proxy?url=<encoded_url>
Proxy fetch resource (ts segment, key, dll) dengan header browser.
Query params:
url — URL yang ingin di-fetch (wajib, URL-encoded)
referer — nilai Referer header (opsional)
origin — nilai Origin header (opsional)
GET /proxy-m3u8?url=<encoded_url>
Fetch file .m3u8 lalu rewrite semua segment URL agar lewat /proxy.
Berguna untuk stream yang segmennya relative path.
Query params: sama seperti /proxy
GET /health
Health check endpoint. Return JSON status + uptime.
📁 Struktur Project
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
📝 Cara Pakai
Buka URL player
Paste URL .m3u8 atau stream HLS ke input
Centang "Gunakan Proxy" jika stream kena CORS
Centang "Rewrite M3U8 Segments" jika segmen relative
Klik LOAD
🔧 Environment Variables (opsional)
Buat file .env di root:
PORT=3000
