/**
 * Starts the disposable Laravel server used by Playwright.
 *
 * Uses PHP from PATH on CI/Linux/macOS and discovers Laragon on Windows.
 * Set PHP_BINARY when PHP is installed elsewhere.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.E2E_PORT || '8011';
const database = path.join(root, 'database', 'e2e.sqlite');

function acceptsPhp(binary) {
  const result = spawnSync(binary, ['-v'], { encoding: 'utf8', windowsHide: true });
  return !result.error && result.status === 0;
}

function phpBinary() {
  if (process.env.PHP_BINARY) {
    if (acceptsPhp(process.env.PHP_BINARY)) return process.env.PHP_BINARY;
    throw new Error(`PHP_BINARY não aponta para um PHP executável: ${process.env.PHP_BINARY}`);
  }
  if (acceptsPhp('php')) return 'php';

  if (process.platform === 'win32') {
    const laragonRoot = 'C:\\laragon\\bin\\php';
    const candidates = fs.existsSync(laragonRoot)
      ? fs.readdirSync(laragonRoot, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => path.join(laragonRoot, entry.name, 'php.exe'))
          .filter(candidate => fs.existsSync(candidate))
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      : [];
    candidates.push('C:\\xampp\\php\\php.exe', 'C:\\php\\php.exe');
    const discovered = candidates.find(acceptsPhp);
    if (discovered) return discovered;
  }

  throw new Error('PHP 8.2+ não foi encontrado. Instale o PHP, adicione-o ao PATH ou defina PHP_BINARY.');
}

function run(binary, args, environment) {
  const result = spawnSync(binary, args, {
    cwd: root,
    env: environment,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const php = phpBinary();
fs.rmSync(database, { force: true });
fs.closeSync(fs.openSync(database, 'w'));

const environment = {
  ...process.env,
  APP_ENV: 'testing',
  APP_DEBUG: 'false',
  APP_KEY: 'base64:7n9S6t2H7Hn23xH5H3YgNnLh6dI0vY7Hc7Jt6nD6m1M=',
  APP_URL: `http://127.0.0.1:${port}`,
  APP_TIMEZONE: 'America/Sao_Paulo',
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: database,
  SESSION_DRIVER: 'file',
  CACHE_STORE: 'array',
  QUEUE_CONNECTION: 'sync',
};

run(php, ['artisan', 'migrate', '--seed', '--force'], environment);
run(php, ['artisan', 'db:seed', '--class=E2ESeeder', '--force'], environment);

const router = path.join(root, 'vendor', 'laravel', 'framework', 'src', 'Illuminate', 'Foundation', 'resources', 'server.php');
const server = spawn(php, ['-d', 'opcache.enable_cli=0', '-S', `127.0.0.1:${port}`, router], {
  cwd: path.join(root, 'public'),
  env: environment,
  stdio: 'inherit',
  windowsHide: true,
});

function stop(signal) {
  if (server.exitCode === null) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      server.kill(signal);
    }
  }
  process.exit(0);
}

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));
server.once('error', error => {
  console.error(`Falha ao iniciar o servidor PHP dos E2E: ${error.message}`);
  process.exit(1);
});
server.once('exit', code => process.exit(code ?? 0));
