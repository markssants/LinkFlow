import fetch from 'node-fetch'; // tsx has fetch

const projectId = "linkflow-marks";
const databaseId = "ai-studio-575ed926-8ce2-4db0-b0bf-c80909c807ce";
const apiKey = "AIzaSyChVluNYVnXxLiqozy5gGbd6BdtPU5L4bs";
const collectionName = "whatsapp_auth";

async function run() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `projects/${projectId}/databases/${databaseId}/documents/${collectionName}/test_commit_doc`,
            fields: {
              data: { stringValue: 'test data' }
            }
          }
        }
      ]
    })
  });
  console.log(res.status, await res.text());
}
run();
