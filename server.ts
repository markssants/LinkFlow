import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin for token verification
if (getAdminApps().length === 0) {
  initializeAdminApp({
    projectId: process.env.FIREBASE_PROJECT_ID || '(default)'
  });
}

// Initialize Firebase App and Firestore securely from config file
let firebaseApp: any = null;
let firestoreDb: any = null;
let currentDbId: string = '';

function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    const adminApp = getAdminApps().length > 0 ? getAdminApp() : initializeAdminApp({
      projectId: process.env.FIREBASE_PROJECT_ID || '(default)'
    });
    
    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    firestoreDb = getAdminFirestore(adminApp, dbId === '(default)' ? undefined : dbId);
    console.log('Firebase Admin Firestore initialized successfully for database:', dbId);
  } catch (error) {
    console.error('Failed to initialize Firebase Admin Firestore in server.ts:', error);
  }
  return firestoreDb;
}

// Safely import Baileys to handle potential export style differences
import BaileysDefault, { useMultiFileAuthState as useMultiFileAuthStateNamed, DisconnectReason as DisconnectReasonNamed } from '@whiskeysockets/baileys';
const makeWASocket = (BaileysDefault as any).default || BaileysDefault;
const useMultiFileAuthState = useMultiFileAuthStateNamed;
const DisconnectReason = DisconnectReasonNamed;

async function useFirestoreAuthState(uid: string) {
  try {
    const authPath = path.join(process.cwd(), `auth_info_baileys_${uid}`);
    console.log(`WhatsApp Auth [${uid}]: Initializing local state at ${authPath}`);
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
      console.log(`WhatsApp Auth [${uid}]: Created auth directory`);
    }
    return await useMultiFileAuthState(authPath);
  } catch (err) {
    console.error(`WhatsApp Auth [${uid}]: Failed to initialize multi-file auth state:`, err);
    throw err;
  }
}

// Initialize logger
const logger = pino({ level: 'warn' });

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

interface UserConfig {
  masterGroup: Group | null;
  targetGroups: Group[];
  includeSenderPrefix: boolean;
  forwardDelayMs: number;
  cloudPersistenceEnabled: boolean;
  affiliateConfig: {
    mercadoLivre: string;
    shopee: string;
    amazon: string;
    magazineLuiza: string;
    aliexpress: string;
    manualLinks: {
      mercadoLivre: string;
      shopee: string;
      amazon: string;
      magazineLuiza: string;
      aliexpress: string;
    };
    useManualLinks: {
      mercadoLivre: boolean;
      shopee: boolean;
      amazon: boolean;
      magazineLuiza: boolean;
      aliexpress: boolean;
    };
  };
  logs: ForwardLog[];
}

interface UserContext {
  uid: string;
  sock: any;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  currentQR: string | null;
  userInfo: { jid: string; name?: string } | null;
  availableGroups: Group[];
  config: UserConfig;
}

const userSessions = new Map<string, UserContext>();

function getDefaultConfig(): UserConfig {
  return {
    masterGroup: null,
    targetGroups: [],
    includeSenderPrefix: false,
    forwardDelayMs: 5000,
    cloudPersistenceEnabled: true,
    affiliateConfig: {
      mercadoLivre: '',
      shopee: '',
      amazon: '',
      magazineLuiza: '',
      aliexpress: '',
      manualLinks: {
        mercadoLivre: '',
        shopee: '',
        amazon: '',
        magazineLuiza: '',
        aliexpress: ''
      },
      useManualLinks: {
        mercadoLivre: false,
        shopee: false,
        amazon: false,
        magazineLuiza: false,
        aliexpress: false
      }
    },
    logs: [],
  };
}

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
async function syncWithFirestore(uid: string, isInitialLoad: boolean) {
  const db = getFirestoreDb();
  const context = userSessions.get(uid);
  if (!context || !context.config.cloudPersistenceEnabled || !db) return;

  const performSync = async (databaseInstance: any) => {
    const docRef = databaseInstance.doc(`users/${uid}/configs/main`);
    if (isInitialLoad) {
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const cloudData = docSnap.data();
        context.config.masterGroup = cloudData.masterGroup || null;
        context.config.targetGroups = cloudData.targetGroups || [];
        context.config.includeSenderPrefix = cloudData.includeSenderPrefix !== undefined ? cloudData.includeSenderPrefix : false;
        context.config.forwardDelayMs = cloudData.forwardDelayMs !== undefined ? Math.max(5000, Number(cloudData.forwardDelayMs)) : 5000;
        if (cloudData.affiliateConfig) {
          context.config.affiliateConfig = { ...context.config.affiliateConfig, ...cloudData.affiliateConfig };
        }
        // Load logs from dedicated Firestore collection if possible
        try {
          const logsSnap = await databaseInstance.collection(`users/${uid}/logs`)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
            
          const cloudLogs: ForwardLog[] = [];
          logsSnap.forEach((doc: any) => {
            const data = doc.data();
            cloudLogs.push({
              id: doc.id,
              timestamp: data.timestamp || '',
              senderName: data.senderName || '',
              masterGroupName: data.masterGroupName,
              originalText: data.originalText,
              text: data.text || '',
              targets: data.targets || []
            });
          });
          if (cloudLogs.length > 0) {
            context.config.logs = cloudLogs;
            console.log(`Synced ${cloudLogs.length} logs FROM dedicated Firestore collection for ${uid}.`);
          } else {
            context.config.logs = cloudData.logs || [];
          }
        } catch (logErr) {
          console.error(`Error fetching logs from Firestore subcollection for ${uid}:`, logErr);
          context.config.logs = cloudData.logs || [];
        }
        console.log(`Successfully synced settings FROM Cloud Database for ${uid}.`);
      } else {
        // Doc doesn't exist, create it in cloud
        await docRef.set(stripUndefined({
          masterGroup: context.config.masterGroup,
          targetGroups: context.config.targetGroups,
          includeSenderPrefix: context.config.includeSenderPrefix,
          forwardDelayMs: context.config.forwardDelayMs,
          cloudPersistenceEnabled: true,
          affiliateConfig: context.config.affiliateConfig,
          logs: context.config.logs
        }));
        console.log(`Created initial document in Cloud Database for ${uid}.`);
      }
    } else {
      // Manual/automatic save TO cloud
      await docRef.set(stripUndefined({
        masterGroup: context.config.masterGroup,
        targetGroups: context.config.targetGroups,
        includeSenderPrefix: context.config.includeSenderPrefix,
        forwardDelayMs: context.config.forwardDelayMs,
        cloudPersistenceEnabled: true,
        affiliateConfig: context.config.affiliateConfig,
        logs: context.config.logs
      }));
      console.log(`Successfully updated settings TO Cloud Database for ${uid}.`);
    }
  };

  try {
    await performSync(db);
  } catch (error: any) {
    console.error(`Error syncing with Firestore for ${uid}:`, error);
    
    const errStr = String(error);
    if (errStr.includes('resource-exhausted') || errStr.includes('Quota limit exceeded')) {
      console.warn(`Firestore quota exceeded for ${uid}. Disabling cloud persistence.`);
      context.config.cloudPersistenceEnabled = false;
    }
  }
}

function loadConfig(uid: string) {
  const context = userSessions.get(uid);
  if (!context) return;
  const userConfigFile = path.join(process.cwd(), `whatsapp-config-${uid}.json`);
  try {
    if (fs.existsSync(userConfigFile)) {
      const data = fs.readFileSync(userConfigFile, 'utf-8');
      const parsed = JSON.parse(data);
      context.config.masterGroup = parsed.masterGroup || null;
      context.config.targetGroups = parsed.targetGroups || [];
      context.config.includeSenderPrefix = parsed.includeSenderPrefix !== undefined ? parsed.includeSenderPrefix : false;
      context.config.forwardDelayMs = parsed.forwardDelayMs !== undefined ? Math.max(5000, Number(parsed.forwardDelayMs)) : 5000;
      context.config.cloudPersistenceEnabled = parsed.cloudPersistenceEnabled !== undefined ? !!parsed.cloudPersistenceEnabled : true;
      if (parsed.affiliateConfig) {
        context.config.affiliateConfig = { ...context.config.affiliateConfig, ...parsed.affiliateConfig };
      }
      context.config.logs = parsed.logs || [];
      console.log(`Configuration and logs successfully loaded from file for ${uid}.`);
    }
  } catch (error) {
    console.error(`Failed to load config for ${uid}:`, error);
  }
}

function saveConfig(uid: string) {
  const context = userSessions.get(uid);
  if (!context) return;
  const userConfigFile = path.join(process.cwd(), `whatsapp-config-${uid}.json`);
  try {
    fs.writeFileSync(userConfigFile, JSON.stringify(context.config, null, 2), 'utf-8');
    
    // Save to Cloud Firestore as well asynchronously if enabled
    if (context.config.cloudPersistenceEnabled && getFirestoreDb()) {
      syncWithFirestore(uid, false).catch(err => {
        console.error(`Async firestore sync failed for ${uid}:`, err);
      });
    }
  } catch (error) {
    console.error(`Failed to save config for ${uid}:`, error);
  }
}

// Helper to inject affiliate links
function injectAffiliateLinks(text: string, affiliateConfig: any): { newText: string; isModified: boolean } {
  if (!affiliateConfig) return { newText: text, isModified: false };
  let isModified = false;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const newText = text.replace(urlRegex, (url) => {
    try {
      const u = new URL(url);
      let changed = false;

      // Check if the URL is just a homepage/platform link
      const isHomepage = u.pathname === '/' || u.pathname === '';

      // Amazon
      if ((u.hostname.includes('amazon.com') || u.hostname.includes('amzn.to'))) {
        if (isHomepage && affiliateConfig.manualLinks?.amazon) {
          isModified = true;
          return affiliateConfig.manualLinks.amazon;
        } else if (affiliateConfig.amazon) {
          u.searchParams.set('tag', affiliateConfig.amazon);
          changed = true;
        }
      }
      
      // Shopee
      if ((u.hostname.includes('shopee.com.br') || u.hostname.includes('shp.ee'))) {
        if (isHomepage && affiliateConfig.manualLinks?.shopee) {
          isModified = true;
          return affiliateConfig.manualLinks.shopee;
        } else if (affiliateConfig.shopee) {
          u.searchParams.set('af_id', affiliateConfig.shopee);
          changed = true;
        }
      }
      
      // Mercado Livre
      if ((u.hostname.includes('mercadolivre.com.br') || u.hostname.includes('mercadopago.com.br') || u.hostname.includes('meli.la'))) {
        // Special case for meli.la which might be used as a shortlink for products
        const isMeliHomepage = isHomepage || (u.hostname.includes('meli.la') && (u.pathname === '/' || u.pathname === ''));
        
        if (isMeliHomepage && affiliateConfig.manualLinks?.mercadoLivre) {
          isModified = true;
          return affiliateConfig.manualLinks.mercadoLivre;
        } else if (affiliateConfig.mercadoLivre) {
          if (u.hostname.includes('meli.la')) {
            isModified = true;
            return `https://meli.la/${affiliateConfig.mercadoLivre}`;
          }
          u.searchParams.set('affiliate_id', affiliateConfig.mercadoLivre);
          changed = true;
        }
      }
      
      // Magazine Luiza
      if ((u.hostname.includes('magazineluiza.com.br') || u.hostname.includes('magalu.com'))) {
        if (isHomepage && affiliateConfig.manualLinks?.magazineLuiza) {
          isModified = true;
          return affiliateConfig.manualLinks.magazineLuiza;
        } else if (affiliateConfig.magazineLuiza) {
          u.searchParams.set('parceiro', affiliateConfig.magazineLuiza);
          changed = true;
        }
      }

      // AliExpress
      if ((u.hostname.includes('aliexpress.com') || u.hostname.includes('a.aliexpress.com'))) {
        if (isHomepage && affiliateConfig.manualLinks?.aliexpress) {
          isModified = true;
          return affiliateConfig.manualLinks.aliexpress;
        } else if (affiliateConfig.aliexpress) {
          u.searchParams.set('trackingId', affiliateConfig.aliexpress);
          changed = true;
        }
      }

      if (changed) {
        isModified = true;
        return u.toString();
      }
      return url;
    } catch (e) {
      return url;
    }
  });

  return { newText, isModified };
}

// Global reference of WhatsApp connection
let sock: any = null;

async function connectToWhatsApp(uid: string) {
  const context = userSessions.get(uid);
  if (!context) return;

  if (context.connectionStatus === 'connecting' && context.currentQR === null) {
    console.log(`WhatsApp [${uid}]: Connection already in progress.`);
    return;
  }
  
  if (context.connectionStatus === 'connected') {
    console.log(`WhatsApp [${uid}]: Already connected.`);
    return;
  }

  console.log(`WhatsApp [${uid}]: Initializing connection sequence...`);
  context.connectionStatus = 'connecting';
  context.currentQR = null;

  const safetyTimeout = setTimeout(() => {
    if (context.connectionStatus === 'connecting' && !context.currentQR) {
      console.warn(`WhatsApp [${uid}]: Connection sequence timed out (1m).`);
      context.connectionStatus = 'disconnected';
    }
  }, 60000);

  try {
    const { state, saveCreds } = await useFirestoreAuthState(uid);
    console.log(`WhatsApp [${uid}]: Auth state loaded.`);

    context.sock = makeWASocket({
      auth: state,
      logger: logger,
      printQRInTerminal: true,
      browser: ['LinkFlow', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
    });
    
    console.log(`WhatsApp [${uid}]: Socket instance created.`);

    context.sock.ev.on('creds.update', saveCreds);

    context.sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(`WhatsApp [${uid}]: QR Code received.`);
        try {
          context.currentQR = await QRCode.toDataURL(qr);
          context.connectionStatus = 'disconnected';
          clearTimeout(safetyTimeout);
        } catch (err) {
          console.error(`WhatsApp [${uid}]: Failed to process QR string:`, err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`WhatsApp [${uid}]: Connection closed (${statusCode}). Reconnect: ${shouldReconnect}`);
        
        context.connectionStatus = 'disconnected';
        context.currentQR = null;
        clearTimeout(safetyTimeout);

        if (shouldReconnect) {
          setTimeout(() => connectToWhatsApp(uid), 5000);
        } else {
          try {
            fs.rmSync(path.join(process.cwd(), `auth_info_baileys_${uid}`), { recursive: true, force: true });
          } catch (e) {}
          console.log(`WhatsApp [${uid}]: Logged out, state cleared.`);
        }
      } else if (connection === 'open') {
        console.log(`WhatsApp [${uid}]: Connection opened successfully!`);
        context.connectionStatus = 'connected';
        context.currentQR = null;
        clearTimeout(safetyTimeout);

        context.userInfo = { 
          jid: context.sock.user?.id || context.sock.user?.jid || '', 
          name: context.sock.user?.name || 'WhatsApp Admin' 
        };

        setTimeout(() => refreshGroups(uid), 2000);
      }
    });

    // Listen to messages
    context.sock.ev.on('messages.upsert', async (upsert: any) => {
      if (upsert.type !== 'notify') return;

      for (const msg of upsert.messages) {
        if (!msg.message) continue;

        const from = msg.key.remoteJid;
        if (!from) continue;

        const config = context.config;

        // Verify if message was received in the configured Master Group
        if (config.masterGroup && from === config.masterGroup.id) {
          const originalText = getMessageText(msg.message);
          if (!originalText) continue;

          const senderName = msg.pushName || 'Participante';
          
          // Inject affiliate links
          const { newText: processedText, isModified } = injectAffiliateLinks(originalText, config.affiliateConfig);

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
              await new Promise(resolve => setTimeout(resolve, currentDelay));
            }
            isFirst = false;

            try {
              await context.sock.sendMessage(target.id, { text: messageToSend });
              targetsStatus.push({
                targetId: target.id,
                targetName: target.name,
                status: 'success',
              });
            } catch (err: any) {
              console.error(`Failed to forward message for ${uid} to group ${target.name} (${target.id}):`, err);
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
              originalText: isModified ? originalText : undefined,
              text: processedText,
              targets: targetsStatus,
            };
            config.logs.unshift(newLog);

            // Cap logs at 100 entries to prevent memory bloating
            if (config.logs.length > 100) {
              config.logs = config.logs.slice(0, 100);
            }

            // Save this specific log directly to Firestore if enabled
            if (context.config.cloudPersistenceEnabled) {
              const firebaseDb = getFirestoreDb();
              if (firebaseDb) {
                firebaseDb.doc(`users/${uid}/logs/${newLog.id}`).set(stripUndefined(newLog)).catch((err: any) => {
                  console.error(`Error storing log for ${uid}:`, err);
                });
              }
            }

            saveConfig(uid);
          }
        }
      }
    });
  } catch (error) {
    console.error(`Error starting WhatsApp connection for ${uid}:`, error);
    context.connectionStatus = 'disconnected';
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
async function refreshGroups(uid: string) {
  const context = userSessions.get(uid);
  if (!context || !context.sock || context.connectionStatus !== 'connected') {
    return;
  }
  try {
    const groupsMap = await context.sock.groupFetchAllParticipating();
    const groupsList = Object.values(groupsMap).map((g: any) => ({
      id: g.id,
      name: g.subject || g.id,
    }));
    context.availableGroups = groupsList;
    console.log(`Refreshed groups for ${uid}. Total: ${groupsList.length}`);
  } catch (err) {
    console.error(`Error fetching groups for ${uid}:`, err);
  }
}

// Authentication Middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    (req as any).uid = decodedToken.uid;
    
    // Initialize user session if not exists
    if (!userSessions.has(decodedToken.uid)) {
      const context: UserContext = {
        uid: decodedToken.uid,
        sock: null,
        connectionStatus: 'disconnected',
        currentQR: null,
        userInfo: null,
        availableGroups: [],
        config: getDefaultConfig(),
      };
      userSessions.set(decodedToken.uid, context);
      
      // Load config
      loadConfig(decodedToken.uid);
      
      // Try cloud sync
      const db = getFirestoreDb();
      if (context.config.cloudPersistenceEnabled && db) {
        syncWithFirestore(decodedToken.uid, true).catch(e => console.error('Initial cloud sync failed:', e));
      }

      // Trigger connection
      connectToWhatsApp(decodedToken.uid);
    }
    
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

async function startServer() {
  console.log('--- SERVER STARTING ---');
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Endpoints
  app.get('/api/test-qr', async (req, res) => {
    try {
      const testQR = await QRCode.toDataURL('https://google.com');
      res.json({ success: true, qr: testQR });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Protect all API routes below
  app.use('/api', authMiddleware);

  app.get('/api/state', (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    
    if (!context) return res.status(500).json({ error: 'No context' });

    // If connection dropped, trigger reconnect
    if (context.connectionStatus === 'disconnected' && !context.currentQR) {
      connectToWhatsApp(uid);
    }

    res.json({
      status: context.connectionStatus,
      qr: context.currentQR,
      userInfo: context.userInfo,
      masterGroup: context.config.masterGroup,
      targetGroups: context.config.targetGroups,
      availableGroups: context.availableGroups,
      logs: context.config.logs,
      includeSenderPrefix: context.config.includeSenderPrefix,
      forwardDelayMs: context.config.forwardDelayMs,
      cloudPersistenceEnabled: context.config.cloudPersistenceEnabled,
      affiliateConfig: context.config.affiliateConfig,
    });
  });

  app.post('/api/config/master', (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    const { group } = req.body; 
    context.config.masterGroup = group || null;
    saveConfig(uid);
    res.json({ success: true, masterGroup: context.config.masterGroup });
  });

  app.post('/api/config/target/add', (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    const { group } = req.body;
    if (!group || !group.id) {
      return res.status(400).json({ success: false, error: 'Grupo inválido' });
    }

    const holds = context.config.targetGroups.some((g) => g.id === group.id);
    if (!holds) {
      context.config.targetGroups.push(group);
      saveConfig(uid);
    }
    res.json({ success: true, targetGroups: context.config.targetGroups });
  });

  app.post('/api/config/target/remove', (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID de grupo inválido' });
    }

    context.config.targetGroups = context.config.targetGroups.filter((g) => g.id !== id);
    saveConfig(uid);
    res.json({ success: true, targetGroups: context.config.targetGroups });
  });

  app.post('/api/config/options', async (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    const { includeSenderPrefix, forwardDelayMs, cloudPersistenceEnabled } = req.body;
    if (includeSenderPrefix !== undefined) {
      context.config.includeSenderPrefix = !!includeSenderPrefix;
    }
    if (forwardDelayMs !== undefined) {
      context.config.forwardDelayMs = Math.max(5000, Number(forwardDelayMs));
    }
    if (cloudPersistenceEnabled !== undefined) {
      const prevVal = context.config.cloudPersistenceEnabled;
      context.config.cloudPersistenceEnabled = !!cloudPersistenceEnabled;
      
      if (context.config.cloudPersistenceEnabled && !prevVal && getFirestoreDb()) {
        try {
          await syncWithFirestore(uid, true);
        } catch (err) {
          console.error(`Error enabling cloud sync for ${uid}:`, err);
        }
      }
    }
    saveConfig(uid);
    res.json({ 
      success: true, 
      includeSenderPrefix: context.config.includeSenderPrefix,
      forwardDelayMs: context.config.forwardDelayMs,
      cloudPersistenceEnabled: context.config.cloudPersistenceEnabled
    });
  });

  app.post('/api/config/affiliate', (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    const { mercadoLivre, shopee, amazon, magazineLuiza, aliexpress, manualLinks, useManualLinks } = req.body;
    
    if (mercadoLivre !== undefined) context.config.affiliateConfig.mercadoLivre = String(mercadoLivre);
    if (shopee !== undefined) context.config.affiliateConfig.shopee = String(shopee);
    if (amazon !== undefined) context.config.affiliateConfig.amazon = String(amazon);
    if (magazineLuiza !== undefined) context.config.affiliateConfig.magazineLuiza = String(magazineLuiza);
    if (aliexpress !== undefined) context.config.affiliateConfig.aliexpress = String(aliexpress);
    
    if (manualLinks !== undefined) context.config.affiliateConfig.manualLinks = manualLinks;
    if (useManualLinks !== undefined) context.config.affiliateConfig.useManualLinks = useManualLinks;
    
    saveConfig(uid);
    res.json({ success: true, affiliateConfig: context.config.affiliateConfig });
  });

  app.post('/api/refresh-groups', async (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    if (context.connectionStatus !== 'connected') {
      return res.status(400).json({ success: false, error: 'Dispositivo WhatsApp não conectado' });
    }
    await refreshGroups(uid);
    res.json({ success: true, availableGroups: context.availableGroups });
  });

  app.post('/api/disconnect', async (req, res) => {
    const uid = (req as any).uid;
    const context = userSessions.get(uid);
    if (!context) return res.status(500).json({ error: 'No context' });

    console.log(`Logout request for ${uid}`);
    context.connectionStatus = 'disconnected';
    context.currentQR = null;
    context.userInfo = null;
    context.availableGroups = [];

    if (context.sock) {
      try {
        await context.sock.logout();
      } catch (e) {}
      try {
        context.sock.end(undefined);
      } catch (e) {}
      context.sock = null;
    }

    try {
      fs.rmSync(path.join(process.cwd(), `auth_info_baileys_${uid}`), { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting auth directory for ${uid}:`, err);
    }
    const db = getFirestoreDb();
    if (db) {
      try {
        await db.doc(`users/${uid}/baileys_auth/creds.json`).delete();
      } catch (e) {}
    }

    setTimeout(() => {
      connectToWhatsApp(uid);
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
