require('dotenv').config();

const { spawn } = require('child_process');
const net = require('net');

const root = __dirname;
const requiredPorts = [3000, 3001];

function isPortTaken(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(true));
    tester.once('listening', () => {
      tester.close(() => resolve(false));
    });
    tester.listen(port, '127.0.0.1');
  });
}

async function main() {
  const statuses = await Promise.all(requiredPorts.map(async (port) => ({ port, inUse: await isPortTaken(port) })));
  const taken = statuses.filter((item) => item.inUse).map((item) => item.port);

  if (taken.length) {
    console.log(`The app is already running on port(s): ${taken.join(', ')}.`);
    console.log('Use the existing server, or stop the stale process before starting a new one.');
    return;
  }

  const defaultEnv = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '3000',
    API_HOST: '127.0.0.1',
    API_PORT: '3001',
    NODE_ENV: 'development',
    ALLOWED_ORIGINS: 'http://127.0.0.1:3000,http://localhost:3000',
    ADMIN_EMAIL: 'admin@morrow.local',
    ADMIN_PASSWORD: 'morrow-admin',
    ADMIN_NAME: 'Morrow Admin',
    DATABASE_URL: '',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  };

  const frontend = spawn(process.execPath, ['server.js'], {
    cwd: root,
    stdio: 'inherit',
    env: defaultEnv,
  });

  const backend = spawn(process.execPath, ['backend-server.js'], {
    cwd: root,
    stdio: 'inherit',
    env: defaultEnv,
  });

  let shuttingDown = false;

  function shutdown(code) {
    if (shuttingDown) return;
    shuttingDown = true;

    frontend.kill('SIGTERM');
    backend.kill('SIGTERM');

    setTimeout(() => {
      frontend.kill('SIGKILL');
      backend.kill('SIGKILL');
      process.exit(code ?? 0);
    }, 250);
  }

  frontend.on('exit', (code) => {
    console.log(`Frontend exited with code ${code}`);
    shutdown(code ?? 0);
  });

  backend.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    shutdown(code ?? 0);
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main();
