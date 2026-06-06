/**
 * DentFlow WhatsApp Microservice
 * Manages per-clinic WhatsApp Web sessions using whatsapp-web.js.
 * Each clinic gets an isolated session stored on disk under ./sessions/<clinicId>/
 */

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_SECRET = process.env.SERVICE_SECRET || 'changeme';

// In-memory map: clinicId -> { client, status, qrDataUrl, phoneInfo, lastActivity }
const sessions = {};

// Status constants
const STATUS = {
  INITIALIZING: 'INITIALIZING',
  QR_REQUIRED: 'QR_REQUIRED',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
};

app.use(cors());
app.use(express.json());

// ─── Middleware: secret key auth ─────────────────────────────────────────────
function requireSecret(req, res, next) {
  const secret = req.headers['x-service-secret'];
  if (secret !== SERVICE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Health / keep-alive endpoint ────────────────────────────────────────────
app.get('/health', (req, res) => {
  const sessionSummary = Object.entries(sessions).map(([id, s]) => ({
    clinicId: id,
    status: s.status,
    lastActivity: s.lastActivity,
  }));
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    sessions: sessionSummary,
  });
});

// ─── Helper: get or create session object ────────────────────────────────────
function getSessionState(clinicId) {
  if (!sessions[clinicId]) {
    sessions[clinicId] = {
      client: null,
      status: STATUS.DISCONNECTED,
      qrDataUrl: null,
      phoneInfo: null,
      lastActivity: null,
    };
  }
  return sessions[clinicId];
}

// ─── POST /sessions/:clinicId/start ──────────────────────────────────────────
// Initialize or restart a WhatsApp session for a clinic.
app.post('/sessions/:clinicId/start', requireSecret, async (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);

  if (session.client && session.status === STATUS.CONNECTED) {
    return res.json({ status: session.status, message: 'Already connected' });
  }

  // Destroy existing client if any
  if (session.client) {
    try { await session.client.destroy(); } catch (_) {}
    session.client = null;
  }

  session.status = STATUS.INITIALIZING;
  session.qrDataUrl = null;

  const client = new Client({
    authTimeoutMs: 90000,
    authStrategy: new LocalAuth({
      clientId: `clinic-${clinicId}`,
      dataPath: './sessions',
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--mute-audio',
        '--safebrowsing-disable-auto-update',
        '--js-flags="--max-old-space-size=150"',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    },
  });

  session.client = client;

  client.on('qr', async (qr) => {
    console.log(`[${clinicId}] QR generated`);
    session.status = STATUS.QR_REQUIRED;
    session.qrDataUrl = await qrcode.toDataURL(qr);
    session.lastActivity = new Date().toISOString();
  });

  client.on('authenticated', () => {
    console.log(`[${clinicId}] Authenticated`);
    session.status = STATUS.RECONNECTING;
    session.lastActivity = new Date().toISOString();
  });

  client.on('ready', async () => {
    console.log(`[${clinicId}] Ready`);
    session.status = STATUS.CONNECTED;
    session.qrDataUrl = null;
    session.lastActivity = new Date().toISOString();
    try {
      const info = client.info;
      session.phoneInfo = {
        number: info.wid.user,
        name: info.pushname,
        platform: info.platform,
      };
    } catch (_) {}
  });

  client.on('disconnected', (reason) => {
    console.log(`[${clinicId}] Disconnected: ${reason}`);
    session.status = STATUS.DISCONNECTED;
    session.qrDataUrl = null;
    session.phoneInfo = null;
    session.lastActivity = new Date().toISOString();
    session.client = null;
  });

  client.on('auth_failure', (msg) => {
    console.error(`[${clinicId}] Auth failure: ${msg}`);
    session.status = STATUS.DISCONNECTED;
    session.qrDataUrl = null;
    session.client = null;
  });

  // Initialize (non-blocking)
  client.initialize().catch((err) => {
    console.error(`[${clinicId}] Init error:`, err.message);
    session.status = STATUS.DISCONNECTED;
    session.client = null;
  });

  res.json({ status: STATUS.INITIALIZING, message: 'Session starting, poll /status for QR' });
});

// ─── GET /sessions/:clinicId/status ──────────────────────────────────────────
app.get('/sessions/:clinicId/status', requireSecret, (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);
  res.json({
    clinicId,
    status: session.status,
    hasQr: !!session.qrDataUrl,
    phoneInfo: session.phoneInfo,
    lastActivity: session.lastActivity,
  });
});

// ─── GET /sessions/:clinicId/qr ──────────────────────────────────────────────
app.get('/sessions/:clinicId/qr', requireSecret, (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);
  if (!session.qrDataUrl) {
    return res.status(404).json({ error: 'No QR available', status: session.status });
  }
  res.json({ qrDataUrl: session.qrDataUrl, status: session.status });
});

// ─── POST /sessions/:clinicId/disconnect ─────────────────────────────────────
app.post('/sessions/:clinicId/disconnect', requireSecret, async (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);
  try {
    if (session.client) {
      await session.client.logout();
      await session.client.destroy();
    }
  } catch (err) {
    console.error(`[${clinicId}] Disconnect error:`, err.message);
  }
  session.client = null;
  session.status = STATUS.DISCONNECTED;
  session.qrDataUrl = null;
  session.phoneInfo = null;
  res.json({ status: STATUS.DISCONNECTED, message: 'Session disconnected and cleared' });
});

// ─── POST /sessions/:clinicId/send ───────────────────────────────────────────
// Body: { to: "+91XXXXXXXXXX", message: "Hello!" }
app.post('/sessions/:clinicId/send', requireSecret, async (req, res) => {
  const { clinicId } = req.params;
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message" in request body' });
  }

  const session = getSessionState(clinicId);
  if (!session.client || session.status !== STATUS.CONNECTED) {
    return res.status(503).json({
      error: 'WhatsApp not connected for this clinic',
      status: session.status,
    });
  }

  try {
    // WhatsApp ID format: <number>@c.us (strip non-digits, add @c.us)
    const cleaned = to.replace(/\D/g, '');
    const chatId = `${cleaned}@c.us`;
    await session.client.sendMessage(chatId, message);
    session.lastActivity = new Date().toISOString();
    res.json({ success: true, to: chatId });
  } catch (err) {
    console.error(`[${clinicId}] Send error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /sessions/:clinicId/info ────────────────────────────────────────────
app.get('/sessions/:clinicId/info', requireSecret, (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);
  res.json({
    clinicId,
    status: session.status,
    phoneInfo: session.phoneInfo,
    lastActivity: session.lastActivity,
  });
});

// ─── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DentFlow WhatsApp Service running on port ${PORT}`);
});
