import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4317;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logs = '';
server.stdout.on('data', chunk => {
  logs += chunk;
});
server.stderr.on('data', chunk => {
  logs += chunk;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${origin}/openings`);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Server did not start.\n${logs}`);
}

async function expectStatus(path, expectedStatus = 200) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  }
  console.log(`OK ${response.status} ${path}`);
}

try {
  await waitForServer();
  await expectStatus('/', 307);
  await expectStatus('/openings');
  await expectStatus('/opening/vienna-game');
  await expectStatus('/profile');
  await expectStatus('/onboarding');
  await expectStatus('/plans');
  await expectStatus('/checkout');
  await expectStatus('/data/openings-catalog.json');
  await expectStatus('/puzzles/vienna-game.json');
  await expectStatus('/sounds/move-self.mp3');
  await expectStatus('/lib/cm-chessboard-assets/pieces/staunty.svg');
} finally {
  server.kill();
}
