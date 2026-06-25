import http from 'http';

function makeRequest(path: string, method: string = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (method === 'POST') req.write('{}');
    req.end();
  });
}

async function run() {
  console.log('Posting connect...');
  console.log(await makeRequest('/api/whatsapp/connect', 'POST'));
  console.log('Waiting...');
  await new Promise(r => setTimeout(r, 4000));
  console.log('Getting status...');
  console.log(await makeRequest('/api/whatsapp/status', 'GET'));
}
run();
