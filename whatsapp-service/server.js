/**
 * DentFlow WhatsApp Microservice — Baileys Edition
 * Manages per-clinic WhatsApp connections using @whiskeysockets/baileys.
 * 
 * Benefits over whatsapp-web.js:
 * 1. Pure WebSocket connection (no headless Chromium/Puppeteer).
 * 2. Extremely low memory footprint (~40MB vs ~400MB RAM).
 * 3. Perfect for resource-constrained environments like Render Free Tier.
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
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

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

// ─── Baileys Connection Handler ──────────────────────────────────────────────
async function startBaileysSession(clinicId) {
  const session = getSessionState(clinicId);

  // If already connected, do nothing
  if (session.client && session.status === STATUS.CONNECTED) {
    return;
  }

  session.status = STATUS.INITIALIZING;
  session.qrDataUrl = null;

  const authDir = path.join(__dirname, 'sessions', `clinic-${clinicId}`);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  session.client = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[${clinicId}] QR generated`);
      session.status = STATUS.QR_REQUIRED;
      session.qrDataUrl = await qrcode.toDataURL(qr);
      session.lastActivity = new Date().toISOString();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[${clinicId}] Connection closed. StatusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        session.status = STATUS.RECONNECTING;
        // Wait a bit and reconnect
        setTimeout(() => {
          startBaileysSession(clinicId).catch(err => {
            console.error(`[${clinicId}] Reconnect failed:`, err.message);
          });
        }, 5000);
      } else {
        session.status = STATUS.DISCONNECTED;
        session.client = null;
        session.qrDataUrl = null;
        session.phoneInfo = null;
        // Clean up session folder
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (_) {}
      }
    } else if (connection === 'open') {
      console.log(`[${clinicId}] Connected successfully`);
      session.status = STATUS.CONNECTED;
      session.qrDataUrl = null;
      session.lastActivity = new Date().toISOString();

      const user = sock.user;
      session.phoneInfo = {
        number: user.id.split(':')[0],
        name: user.name || 'WhatsApp Session',
        platform: 'Baileys',
      };
    }
  });
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

// ─── POST /sessions/:clinicId/start ──────────────────────────────────────────
app.post('/sessions/:clinicId/start', requireSecret, async (req, res) => {
  const { clinicId } = req.params;
  const session = getSessionState(clinicId);

  if (session.client && session.status === STATUS.CONNECTED) {
    return res.json({ status: session.status, message: 'Already connected' });
  }

  // Non-blocking initialization
  startBaileysSession(clinicId).catch((err) => {
    console.error(`[${clinicId}] Initialization error:`, err.message);
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
  const authDir = path.join(__dirname, 'sessions', `clinic-${clinicId}`);

  try {
    if (session.client) {
      await session.client.logout();
    }
  } catch (err) {
    console.error(`[${clinicId}] Disconnect error:`, err.message);
  }

  session.client = null;
  session.status = STATUS.DISCONNECTED;
  session.qrDataUrl = null;
  session.phoneInfo = null;

  // Ensure directory is deleted
  try {
    fs.rmSync(authDir, { recursive: true, force: true });
  } catch (_) {}

  res.json({ status: STATUS.DISCONNECTED, message: 'Session disconnected and cleared' });
});

// ─── POST /sessions/:clinicId/send ───────────────────────────────────────────
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
    // Baileys format: <number>@s.whatsapp.net
    const cleaned = to.replace(/\D/g, '');
    const chatId = `${cleaned}@s.whatsapp.net`;
    
    await session.client.sendMessage(chatId, { text: message });
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

// ─── Restore sessions on startup ─────────────────────────────────────────────
function restoreSessions() {
  const sessionsDir = path.join(__dirname, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const folders = fs.readdirSync(sessionsDir);
    for (const folder of folders) {
      if (folder.startsWith('clinic-')) {
        const clinicId = folder.replace('clinic-', '');
        console.log(`[Startup] Restoring session for clinic ${clinicId}`);
        startBaileysSession(clinicId).catch((err) => {
          console.error(`[Startup] Failed to restore clinic ${clinicId}:`, err.message);
        });
      }
    }
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`DentFlow WhatsApp Service running on port ${PORT}`);
  restoreSessions();
});
