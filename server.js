const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDirectory = path.resolve(__dirname);
const port = Number(process.env.PORT) || 3000;
const host = '127.0.0.1';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

function resolveRequestedFile(requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  } catch {
    return null;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(rootDirectory, `.${requestedPath}`);

  if (filePath !== rootDirectory && !filePath.startsWith(`${rootDirectory}${path.sep}`)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendText(response, 405, 'Method Not Allowed');
    return;
  }

  const filePath = resolveRequestedFile(request.url);

  if (!filePath) {
    sendText(response, 404, 'Not Found');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(response, 404, 'Not Found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    fs.createReadStream(filePath).on('error', () => {
      if (!response.headersSent) {
        sendText(response, 500, 'Internal Server Error');
      } else {
        response.destroy();
      }
    }).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Local server running at http://${host}:${port}`);
});