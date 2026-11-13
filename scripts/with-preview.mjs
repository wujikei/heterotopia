import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [script, ...args] = process.argv.slice(2);
if (!script) throw new Error('Usage: node [--import tsx] scripts/with-preview.mjs <test-script> [args]');
const base = process.env.VN_TEST_URL || 'http://127.0.0.1:4179';
let server, runner, stopping;
let serverOutput = '';
let startupError;

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise(resolve => {
      const kill = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      kill.once('exit', resolve); kill.once('error', resolve);
    });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
    await new Promise(resolve => {
      const timer = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
        resolve();
      }, 5000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}
const cleanup = () => stopping ??= (async () => { await stop(runner); await stop(server); })();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void cleanup().then(() => process.exit(signal === 'SIGINT' ? 130 : 143)); });

try {
  if (!process.env.VN_TEST_URL) {
    await access(new URL('../dist/index.html', import.meta.url)).catch(() => { throw new Error(`无法连接 ${base}：缺少构建产物，请先 npm run build。`); });
    server = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32',
    });
    server.stdout.on('data', data => { serverOutput += data; });
    server.stderr.on('data', data => { serverOutput += data; });
    server.on('error', error => { startupError = error; });
  }
  const deadline = Date.now() + 30000;
  while (true) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`预览服务启动失败：${serverOutput.trim()}`);
    if (startupError) throw startupError;
    try {
      // CI can insert an ANSI reset between "Local" and its colon.
      const plainOutput = serverOutput.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
      if (!server || /Local:/.test(plainOutput)) {
        const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
        if (response.ok) break;
      }
    } catch { /* allow Vite to start */ }
    if (Date.now() >= deadline) throw new Error(`无法连接 ${base}，请先 npm run build，或检查 VN_TEST_URL。\n${serverOutput.trim()}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  runner = spawn(process.execPath, [...process.execArgv, script, ...args], {
    cwd: root, env: { ...process.env, VN_TEST_URL: base }, stdio: 'inherit', windowsHide: true, detached: process.platform !== 'win32',
  });
  process.exitCode = await new Promise((resolve, reject) => {
    runner.once('exit', code => resolve(code ?? 1)); runner.once('error', reject);
  });
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { await cleanup(); }
