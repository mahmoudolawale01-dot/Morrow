const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
}

async function run() {
  const frontend = await get('http://127.0.0.1:3000');
  const backend = await get('http://127.0.0.1:3001/api/health');

  console.log('frontend status:', frontend.status);
  console.log('frontend title check:', /Morrow Objects/i.test(frontend.body) ? 'ok' : 'missing');
  console.log('backend status:', backend.status);
  console.log('backend payload check:', /"ok":true/i.test(backend.body) ? 'ok' : 'missing');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
