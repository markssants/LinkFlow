import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import QRCode from 'qrcode';
import pino from 'pino';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, setLogLevel, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

setLogLevel('silent');

// Safely import Baileys to handle potential export style differences
import * as Baileys from '@whiskeysockets/baileys';
const makeWASocket = (Baileys as any).default || Baileys;
const useMultiFileAuthState = Baileys.useMultiFileAuthState;
const DisconnectReason = Baileys.DisconnectReason;

async function useLocalAuthState() {
  return await useMultiFileAuthState('auth_info_baileys');
}

// Initialize silent logger to keep console output clean
const logger = pino({ level: 'silent' });

interface Group {
  id: string;
  name: string;
}

interface LogTarget {
  targetId: string;
  targetName: string;
  status: 'success' | 'failed';
  error?: string;
}

interface ForwardLog {
  id: string;
  timestamp: string;
  senderName: string;
  masterGroupName?: string;
  originalText?: string;
  text: string;
  targets: LogTarget[];
}

// Configuration file path for persistent settings
const CONFIG_FILE = path.join(process.cwd(), 'whatsapp-config.json');

// Initialize Firebase App and Firestore securely from config file
let firebaseApp: any = null;
let firestoreDb: any = null;
let currentDbId: string = '';

function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    let firebaseConfig: any = null;

    if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
      console.log('Firebase: Initializing using Environment Variables (Detected)');
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        projectId: process.env.FIREBASE_PROJECT_ID,
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)'
      };
    } else {
      const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        console.log('Firebase: Initializing using local config file');
        firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      } else {
        console.warn('Firebase: No config found! Set FIREBASE_API_KEY and FIREBASE_PROJECT_ID env vars or provide firebase-applet-config.json');
      }
    }

    if (firebaseConfig) {
      firebaseApp = initializeApp(firebaseConfig);
      currentDbId = firebaseConfig.firestoreDatabaseId || '(default)';
      firestoreDb = getFirestore(firebaseApp, currentDbId);
      console.log('Firebase initialized successfully for database:', currentDbId);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase in server.ts:', error);
  }
  return firestoreDb;
}

// Memory state matching types.ts
let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
let currentQR: string | null = null;
let currentPairingCode: string | null = null;
let userInfo: { jid: string; name?: string } | null = null;
let availableGroups: Group[] = [];

// Load config from file or defaults
let config = {
  masterGroup: null as Group | null,
  targetGroups: [] as Group[],
  includeSenderPrefix: false,
  forwardDelayMs: 5000,
  cloudPersistenceEnabled: true,
  logs: [] as ForwardLog[],
};

// Helper to recursively strip any undefined fields from Firestore data
function stripUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item));
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = stripUndefined(val);
      }
    }
    return clean;
  }
  return obj;
}

// Firestore Sync Helper Function
async function syncWithFirestore(isInitialLoad: boolean) {
  const db = getFirestoreDb();
  if (!config.cloudPersistenceEnabled || !db) return;

  const performSync = async (databaseInstance: any) => {
    const docRef = doc(databaseInstance, 'configs', 'main');
    if (isInitialLoad) {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        config.masterGroup = cloudData.masterGroup || null;
        config.targetGroups = cloudData.targetGroups || [];
        config.includeSenderPrefix = cloudData.includeSenderPrefix !== undefined ? cloudData.includeSenderPrefix : false;
        config.forwardDelayMs = cloudData.forwardDelayMs !== undefined ? Math.max(5000, Number(cloudData.forwardDelayMs)) : 5000;
        // Load logs from dedicated Firestore collection if possible
        try {
          const logsCol = collection(databaseInstance, 'logs');
          const q = query(logsCol, orderBy('timestamp', 'desc'), limit(100));
          const logsSnap = await getDocs(q);
          const cloudLogs: ForwardLog[] = [];
          logsSnap.forEach((docSnap) => {
            const data = docSnap.data();
            cloudLogs.push({
              id: docSnap.id,
              timestamp: data.timestamp || '',
              senderName: data.senderName || '',
              masterGroupName: data.masterGroupName,
              originalText: data.originalText,
              text: data.text || '',
              targets: data.targets || []
            });
          });
          if (cloudLogs.length > 0) {
            config.logs = cloudLogs;
            console.log(`Synced ${cloudLogs.length} logs FROM dedicated Firestore collection.`);
          } else {
            config.logs = cloudData.logs || [];
          }
        } catch (logErr) {
          console.error('Error fetching logs from Firestore subcollection on startup:', logErr);
          config.logs = cloudData.logs || [];
        }
        console.log('Successfully synced settings FROM LinkFlow Cloud Database.');
      } else {
        // Doc doesn't exist, create it in cloud
        await setDoc(docRef, stripUndefined({
          masterGroup: config.masterGroup,
          targetGroups: config.targetGroups,
          includeSenderPrefix: config.includeSenderPrefix,
          forwardDelayMs: config.forwardDelayMs,
          cloudPersistenceEnabled: true,
          logs: config.logs
        }));
        console.log('Created initial document in LinkFlow Cloud Database.');
      }
    } else {
      // Manual/automatic save TO cloud
      await setDoc(docRef, stripUndefined({
        masterGroup: config.masterGroup,
        targetGroups: config.targetGroups,
        includeSenderPrefix: config.includeSenderPrefix,
        forwardDelayMs: config.forwardDelayMs,
        cloudPersistenceEnabled: true,
        logs: config.logs
      }));
      console.log('Successfully updated settings TO LinkFlow Cloud Database.');
    }
  };

  try {
    await performSync(db);
  } catch (error: any) {
    console.error('Error syncing with LinkFlow Firestore:', error);
    
    // Check if the error is due to database not found or NOT_FOUND status code (gRPC Code 5 / not-found)
    const errStr = String(error);
    
    if (errStr.includes('resource-exhausted') || errStr.includes('Quota limit exceeded')) {
      console.warn('Firestore quota exceeded. Disabling cloud persistence.');
      config.cloudPersistenceEnabled = false;
      return;
    }
    
    const isNotFound = errStr.includes('not-found') || errStr.includes('NOT_FOUND') || errStr.includes('5');
    
    if (isNotFound && currentDbId !== '(default)' && firebaseApp) {
      console.log('Attempting self-healing fallback to default database "(default)"...');
      try {
        currentDbId = '(default)';
        firestoreDb = getFirestore(firebaseApp, '(default)');
        await performSync(firestoreDb);
        console.log('Self-healing fallback to "(default)" Firestore database succeeded!');
      } catch (fallbackErr) {
        console.error('Fallback to "(default)" database also failed:', fallbackErr);
      }
    }
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      config.masterGroup = parsed.masterGroup || null;
      config.targetGroups = parsed.targetGroups || [];
      config.includeSenderPrefix = parsed.includeSenderPrefix !== undefined ? parsed.includeSenderPrefix : false;
      config.forwardDelayMs = parsed.forwardDelayMs !== undefined ? Math.max(5000, Number(parsed.forwardDelayMs)) : 5000;
      config.cloudPersistenceEnabled = parsed.cloudPersistenceEnabled !== undefined ? !!parsed.cloudPersistenceEnabled : true;
      config.logs = parsed.logs || [];
      console.log('Configuration and logs successfully loaded from file.');
    }
  } catch (error) {
    console.error('Failed to load whatsapp-config.json:', error);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    
    // Save to Cloud Firestore as well asynchronously if enabled
    if (config.cloudPersistenceEnabled && getFirestoreDb()) {
      syncWithFirestore(false).catch(err => {
        console.error('Async firestore sync failed:', err);
      });
    }
  } catch (error) {
    console.error('Failed to save whatsapp-config.json:', error);
  }
}

// Global reference of WhatsApp connection
let sock: any = null;
let isConnecting = false;

async function connectToWhatsApp() {
  if (isConnecting) {
    console.log('WhatsApp: Connection already in progress, skipping...');
    return;
  }
  
  console.log('WhatsApp: Starting connection process...');
  isConnecting = true;
  connectionStatus = 'connecting';
  currentQR = null;
  currentPairingCode = null;

  try {
    console.log('WhatsApp: Fetching auth state...');
    const { state, saveCreds } = await useLocalAuthState();

    console.log('WhatsApp: Initializing Socket...');
    
    // Create the socket connection
    sock = makeWASocket({
      auth: state,
      logger: logger,
      printQRInTerminal: true,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      // Add some stabilization options
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    // Save auth credentials whenever they update
    sock.ev.on('creds.update', saveCreds);

    // Track connection updates
    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        try {
          console.log('WhatsApp: Generating QR Data URL...');
          currentQR = await QRCode.toDataURL(qr);
          connectionStatus = 'disconnected';
          console.log('WhatsApp: QR Code ready for client');
        } catch (qrErr) {
          console.error('WhatsApp: Failed to generate QR Code data URL:', qrErr);
        }
      }

      if (connection === 'connecting') {
        connectionStatus = 'connecting';
        isConnecting = true;
      }

      if (connection === 'open') {
        console.log('WhatsApp: Connection opened successfully');
        connectionStatus = 'connected';
        isConnecting = false;
        currentQR = null;
        currentPairingCode = null;

        const userJid = sock.user?.id || sock.user?.jid || '';
        const userName = sock.user?.name || 'WhatsApp Admin';
        userInfo = { jid: userJid, name: userName };

        // Automatically fetch groups on connection open
        setTimeout(() => {
          refreshGroups();
        }, 3000);
      }

      if (connection === 'close') {
        isConnecting = false;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`WhatsApp: Connection closed. StatusCode: ${statusCode}. Reconnecting: ${shouldReconnect}`);
        
        connectionStatus = 'disconnected';
        currentQR = null;
        currentPairingCode = null;

        if (shouldReconnect) {
          // Re-establish connection with exponential backoff or simple delay
          const delay = statusCode === DisconnectReason.restartRequired ? 1000 : 5000;
          setTimeout(connectToWhatsApp, delay);
        } else {
          // Clean up local auth info on logouts
          try {
            fs.rmSync(path.join(process.cwd(), 'auth_info_baileys'), { recursive: true, force: true });
          } catch (e) {}
          userInfo = null;
          console.log('WhatsApp: Logged out successfully.');
        }
      }
    });

    // Listen to messages
    sock.ev.on('messages.upsert', async (upsert: any) => {
      if (upsert.type !== 'notify') return;

      for (const msg of upsert.messages) {
        if (!msg.message) continue;

        const from = msg.key.remoteJid;
        if (!from) continue;

          // Verify if message was received in the configured Master Group
        if (config.masterGroup && from === config.masterGroup.id) {
          const originalText = getMessageText(msg.message);
          if (!originalText) continue;

          const senderName = msg.pushName || 'Participante';
          
          const processedText = originalText;

          // Format text based on includeSenderPrefix preference
          let messageToSend = processedText;
          if (config.includeSenderPrefix) {
            messageToSend = `*[${config.masterGroup.name} - ${senderName}]:*\n${processedText}`;
          }

          // Forward to all target groups in sequence with delay
          const targetsStatus: LogTarget[] = [];
          let isFirst = true;

          for (const target of config.targetGroups) {
            if (!isFirst) {
              const currentDelay = config.forwardDelayMs !== undefined ? config.forwardDelayMs : 5000;
              console.log(`Waiting anti-ban delay of ${currentDelay}ms before sending to ${target.name}`);
              await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
            isFirst = false;

            try {
              await sock.sendMessage(target.id, { text: messageToSend });
              targetsStatus.push({
                targetId: target.id,
                targetName: target.name,
                status: 'success',
              });
            } catch (err: any) {
              console.error(`Failed to forward message to group ${target.name} (${target.id}):`, err);
              targetsStatus.push({
                targetId: target.id,
                targetName: target.name,
                status: 'failed',
                error: err.message || String(err),
              });
            }
          }

          // Append to log list if there are target groups configured
          if (config.targetGroups.length > 0) {
            const newLog: ForwardLog = {
              id: msg.key.id || String(Date.now()),
              timestamp: new Date().toISOString(),
              senderName,
              masterGroupName: config.masterGroup ? config.masterGroup.name : undefined,
              text: processedText,
              targets: targetsStatus,
            };
            config.logs.unshift(newLog);

            // Cap logs at 100 entries to prevent memory bloating
            if (config.logs.length > 100) {
              config.logs = config.logs.slice(0, 100);
            }

            // Save this specific log directly to Firestore if enabled
            if (config.cloudPersistenceEnabled) {
              const firebaseDb = getFirestoreDb();
              if (firebaseDb) {
                setDoc(doc(firebaseDb, 'logs', newLog.id), stripUndefined(newLog)).catch(err => {
                  console.error('Error storing message log to Firestore collection:', err);
                  const errStr = String(err);
                  if (errStr.includes('resource-exhausted') || errStr.includes('Quota limit exceeded')) {
                    console.warn('Firestore quota exceeded for logs. Disabling cloud persistence.');
                    config.cloudPersistenceEnabled = false;
                  }
                });
              }
            }

            saveConfig();
          }
        }
      }
    });
  } catch (error) {
    console.error('Error starting WhatsApp connection:', error);
    connectionStatus = 'disconnected';
  }
}

// Helper to extract clean text from various incoming message types
function getMessageText(message: any): string | null {
  if (!message) return null;
  if (typeof message === 'string') return message;

  if (message.conversation) {
    return message.conversation;
  }
  if (message.extendedTextMessage && message.extendedTextMessage.text) {
    return message.extendedTextMessage.text;
  }
  if (message.imageMessage && message.imageMessage.caption) {
    return message.imageMessage.caption;
  }
  if (message.videoMessage && message.videoMessage.caption) {
    return message.videoMessage.caption;
  }
  if (message.documentWithCaptionMessage && message.documentWithCaptionMessage.message?.documentMessage?.caption) {
    return message.documentWithCaptionMessage.message.documentMessage.caption;
  }

  // Handle ephemeral and view-once wrapped statements
  if (message.ephemeralMessage && message.ephemeralMessage.message) {
    return getMessageText(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage && message.viewOnceMessage.message) {
    return getMessageText(message.viewOnceMessage.message);
  }
  if (message.viewOnceMessageV2 && message.viewOnceMessageV2.message) {
    return getMessageText(message.viewOnceMessageV2.message);
  }

  // Media descriptions if captions are empty
  if (message.imageMessage) return '[Imagem 📷]';
  if (message.videoMessage) return '[Vídeo 🎥]';
  if (message.audioMessage) return '[Áudio/Mensagem de Voz 🎵]';
  if (message.stickerMessage) return '[Figurinha 🖼️]';
  if (message.documentMessage) {
    return `[Documento 📄: ${message.documentMessage.fileName || 'Sem nome'}]`;
  }

  return null;
}

// Fetch all joining WhatsApp groups
async function refreshGroups() {
  if (!sock || connectionStatus !== 'connected') {
    return;
  }
  try {
    const groupsMap = await sock.groupFetchAllParticipating();
    const groupsList = Object.values(groupsMap).map((g: any) => ({
      id: g.id,
      name: g.subject || g.id,
    }));
    availableGroups = groupsList;
    console.log(`Refreshed participating groups. Total: ${groupsList.length}`);
  } catch (err) {
    console.error('Error fetching participating groups:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Load initial settings
  loadConfig();

  // Sync from cloud firestore at starting if enabled in the background (non-blocking)
  if (config.cloudPersistenceEnabled && getFirestoreDb()) {
    syncWithFirestore(true).then(() => {
      console.log('Background cloud startup sync completed successfully.');
    }).catch((err) => {
      console.error('Error fetching initial cloud settings at startup in background:', err);
    });
  }

  // Connect to WhatsApp
  connectToWhatsApp();

  // API Endpoints
  app.get('/api/state', (req, res) => {
    // If the server was sleeping (e.g. Cloud Run scale to zero) and connection dropped,
    // trigger a reconnection when the frontend polls for state.
    if (connectionStatus === 'disconnected' && !currentQR) {
      console.log('State requested but connection is dead. Triggering reconnect...');
      connectToWhatsApp();
    }

    res.json({
      status: connectionStatus,
      qr: currentQR,
      pairingCode: currentPairingCode,
      userInfo,
      masterGroup: config.masterGroup,
      targetGroups: config.targetGroups,
      availableGroups,
      logs: config.logs,
      includeSenderPrefix: config.includeSenderPrefix,
      forwardDelayMs: config.forwardDelayMs,
      cloudPersistenceEnabled: config.cloudPersistenceEnabled,
    });
  });

  app.post('/api/config/master', (req, res) => {
    const { group } = req.body; // { id, name }
    config.masterGroup = group || null;
    saveConfig();
    res.json({ success: true, masterGroup: config.masterGroup });
  });

  app.post('/api/config/target/add', (req, res) => {
    const { group } = req.body; // { id, name }
    if (!group || !group.id) {
      return res.status(400).json({ success: false, error: 'Grupo inválido' });
    }

    // Check if JID is already added
    const holds = config.targetGroups.some((g) => g.id === group.id);
    if (!holds) {
      config.targetGroups.push(group);
      saveConfig();
    }
    res.json({ success: true, targetGroups: config.targetGroups });
  });

  app.post('/api/config/target/remove', (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID de grupo inválido' });
    }

    config.targetGroups = config.targetGroups.filter((g) => g.id !== id);
    saveConfig();
    res.json({ success: true, targetGroups: config.targetGroups });
  });

  app.post('/api/config/options', async (req, res) => {
    const { includeSenderPrefix, forwardDelayMs, cloudPersistenceEnabled } = req.body;
    if (includeSenderPrefix !== undefined) {
      config.includeSenderPrefix = !!includeSenderPrefix;
    }
    if (forwardDelayMs !== undefined) {
      config.forwardDelayMs = Math.max(5000, Number(forwardDelayMs));
    }
    if (cloudPersistenceEnabled !== undefined) {
      const prevVal = config.cloudPersistenceEnabled;
      config.cloudPersistenceEnabled = !!cloudPersistenceEnabled;
      
      // If we are enabling cloud persistence, try loading existing cloud setup
      if (config.cloudPersistenceEnabled && !prevVal && getFirestoreDb()) {
        try {
          await syncWithFirestore(true);
        } catch (err) {
          console.error('Error enabling cloud database sync:', err);
        }
      }
    }
    saveConfig();
    res.json({ 
      success: true, 
      includeSenderPrefix: config.includeSenderPrefix,
      forwardDelayMs: config.forwardDelayMs,
      cloudPersistenceEnabled: config.cloudPersistenceEnabled
    });
  });

  app.post('/api/request-pairing-code', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Número de telefone é obrigatório' });
    
    console.log(`WhatsApp: Requesting pairing code for ${phoneNumber}`);
    
    // If not connected and not connecting, start connection
    if (!sock && !isConnecting) {
      await connectToWhatsApp();
    }

    // Robust wait for socket initialization (up to 10 seconds)
    let attempts = 0;
    while (!sock && attempts < 20) {
      console.log(`WhatsApp: Waiting for socket initialization... (attempt ${attempts + 1}/20)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (!sock) {
      return res.status(500).json({ error: 'Servidor WhatsApp não inicializou a tempo. Tente novamente em instantes.' });
    }

    // If already registered, pairing code won't work
    if (sock.authState?.creds?.registered) {
      return res.status(400).json({ error: 'WhatsApp já está conectado. Desconecte primeiro para usar um novo número.' });
    }

    try {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      console.log(`WhatsApp: Calling requestPairingCode for ${cleanNumber}`);
      const code = await sock.requestPairingCode(cleanNumber);
      currentPairingCode = code;
      currentQR = null; 
      console.log(`WhatsApp: Pairing code generated: ${code}`);
      res.json({ success: true, code });
    } catch (err: any) {
      console.error('WhatsApp: Error requesting pairing code:', err);
      res.status(500).json({ error: 'Erro ao solicitar código: ' + err.message });
    }
  });

  app.post('/api/refresh-groups', async (req, res) => {
    if (connectionStatus !== 'connected') {
      return res.status(400).json({ success: false, error: 'Dispositivo WhatsApp não conectado' });
    }
    await refreshGroups();
    res.json({ success: true, availableGroups });
  });

  app.post('/api/disconnect', async (req, res) => {
    console.log('Initiating logout request...');
    connectionStatus = 'disconnected';
    currentQR = null;
    userInfo = null;
    availableGroups = [];

    if (sock) {
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(undefined);
      } catch (e) {}
      sock = null;
    }

    try {
      fs.rmSync(path.join(process.cwd(), 'auth_info_baileys'), { recursive: true, force: true });
    } catch (err) {
      console.error('Error deleting auth_info directory:', err);
    }

    // Create fresh connection
    setTimeout(() => {
      connectToWhatsApp();
    }, 1500);

    res.json({ success: true });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v4 syntax
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on http://0.0.0.0:${PORT}`);
  });
}

startServer();
