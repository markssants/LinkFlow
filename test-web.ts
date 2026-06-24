import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "linkflow-marks",
  appId: "1:891094802456:web:23d74b8f65f19fa534e36d",
  apiKey: "AIzaSyChVluNYVnXxLiqozy5gGbd6BdtPU5L4bs"
};

async function run() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, "ai-studio-575ed926-8ce2-4db0-b0bf-c80909c807ce");
    await setDoc(doc(db, "test_baileys", "test_doc"), { hello: "world" });
    const snap = await getDoc(doc(db, "test_baileys", "test_doc"));
    console.log("Success! Data:", snap.data());
    process.exit(0);
  } catch (e) {
    console.error("Failed", e);
    process.exit(1);
  }
}
run();
