import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function run() {
  try {
    initializeApp();
    const db = getFirestore();
    const docRef = db.collection('test_baileys_collection').doc('test');
    await docRef.set({ test: 'data' });
    console.log("Write success!");
  } catch (e) {
    console.error("Failed", e);
  }
}
run();
