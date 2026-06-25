import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

async function test() {
  const { state } = await useMultiFileAuthState('./baileys_auth_info_test');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'debug' }) as any
  });
  sock.ev.on('connection.update', (update) => {
    console.log('Update:', update);
    if(update.qr) {
       console.log("QR GENERATED");
       process.exit(0);
    }
    if (update.connection === 'close') {
      console.log('Connection closed');
      process.exit(1);
    }
  });
}
test();
