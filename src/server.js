require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["*"],
      connectSrc: ["'self'", "*"],
      imgSrc: ["'self'", "data:", "*"],
    },
  },
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── HLS Proxy ───────────────────────────────────────────────────────────────
// Proxy untuk fetch .m3u8 / .ts yang membutuhkan header tertentu
// Berguna agar tidak kena CORS dari browser langsung
app.get('/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Parameter url diperlukan' });
  }

  try {
    const decoded = decodeURIComponent(url);

    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': req.query.referer || '',
        'Origin': req.query.origin || '',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
    }

    // Forward content-type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=10');

    // Pipe stream langsung ke client
    response.body.pipe(res);
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).json({ error: 'Gagal mengambil resource', detail: err.message });
  }
});

// ─── M3U8 Rewriter ───────────────────────────────────────────────────────────
// Rewrite isi .m3u8 agar semua segment URL dilewatkan melalui proxy kita
app.get('/proxy-m3u8', async (req, res) => {
  const { url, referer, origin } = req.query;

  if (!url) return res.status(400).json({ error: 'Parameter url diperlukan' });

  try {
    const decoded = decodeURIComponent(url);
    const baseUrl = decoded.substring(0, decoded.lastIndexOf('/') + 1);

    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': referer || '',
        'Origin': origin || '',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
    }

    let m3u8Text = await response.text();

    // Rewrite setiap URI segment/key agar lewat proxy
    m3u8Text = m3u8Text.replace(/(URI=")([^"]+)(")/g, (match, pre, uri, post) => {
      const absUri = uri.startsWith('http') ? uri : baseUrl + uri;
      return `${pre}/proxy?url=${encodeURIComponent(absUri)}&referer=${encodeURIComponent(referer || '')}&origin=${encodeURIComponent(origin || '')}${post}`;
    });

    m3u8Text = m3u8Text.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const absLine = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
      return `/proxy?url=${encodeURIComponent(absLine)}&referer=${encodeURIComponent(referer || '')}&origin=${encodeURIComponent(origin || '')}`;
    }).join('\n');

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(m3u8Text);
  } catch (err) {
    console.error('[M3U8 Rewriter Error]', err.message);
    res.status(500).json({ error: 'Gagal memproses m3u8', detail: err.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎬 HLS Player running on port ${PORT}`);
});
