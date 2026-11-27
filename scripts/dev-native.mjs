#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NETWATCH_ROOT = path.resolve(__dirname, '..');
const AFTERLIFE_ROOT = path.resolve(NETWATCH_ROOT, '..');
const BRAINDANCE_ROOT = path.join(AFTERLIFE_ROOT, 'braindance');
const NATIVE_ROOT = path.join(NETWATCH_ROOT, 'apps', 'native');

const mode = process.argv[2] || 'start';
const clearCache = process.argv.includes('--clear');
const METRO_PORTS = [8081, 8082, 8083];
const NEXT_PORTS = [3000, 3001, 3002];
const BRAINDANCE_PORT = 8001;

function log(msg) {
  console.log(`\x1b[36m[dev-native]\x1b[0m ${msg}`);
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(600);
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, '127.0.0.1');
  });
}

async function findMetroPort() {
  for (const port of METRO_PORTS) {
    if (await isPortOpen(port)) return port;
  }
  return null;
}

function spawnShellDetached(command, cwd, extraEnv = {}, bin = null, args = []) {
  const env = { ...process.env, ...extraEnv };
  if (bin) {
    const child = spawn(bin, args, {
      cwd,
      env,
      stdio: 'ignore',
      detached: true,
      windowsHide: false,
    });
    child.unref();
    return child;
  }
  const child = spawn(command, {
    cwd,
    env,
    stdio: 'ignore',
    detached: true,
    shell: true,
    windowsHide: true,
  });
  child.unref();
  return child;
}

function metroEnv() {
  const env = { ...process.env };
  delete env.CI;
  return env;
}

function spawnShellForeground(command, cwd, extraEnv = {}) {
  const env = { ...metroEnv(), ...extraEnv };
  return spawn(command, {
    cwd,
    env,
    stdio: 'inherit',
    shell: true,
  });
}

async function isBraindanceRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${BRAINDANCE_PORT}/api/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function ensureBraindance() {
  if (await isBraindanceRunning()) {
    log(`Braindance backend already running on http://127.0.0.1:${BRAINDANCE_PORT}`);
    return;
  }

  if (!fs.existsSync(path.join(BRAINDANCE_ROOT, 'package.json'))) {
    log('Braindance sibling folder not found; skipping auto-start.');
    return;
  }

  log(`Starting Braindance backend on :${BRAINDANCE_PORT}…`);
  spawnShellDetached('pnpm run dev:server', BRAINDANCE_ROOT, {
    PORT: String(BRAINDANCE_PORT),
    RATE_LIMIT_MAX: '2000',
  });

  const start = Date.now();
  while (Date.now() - start < 35_000) {
    if (await isBraindanceRunning()) {
      log(`Braindance backend is ready on :${BRAINDANCE_PORT}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  log('Warning: Braindance did not respond within 35s; Next.js will use fallback/direct mode if needed.');
}

async function isNetwatchOnPort(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(2200),
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    const json = JSON.parse(text);
    return json?.service === 'netwatch';
  } catch {
    return false;
  }
}

async function waitForNetwatchOnPort(port, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isNetwatchOnPort(port)) return true;
    await new Promise((r) => setTimeout(r, 700));
  }
  return false;
}

async function ensureNext() {
  // 1. Check if Netwatch is already listening on 3000, 3001, or 3002
  for (const port of NEXT_PORTS) {
    if (await isNetwatchOnPort(port)) {
      log(`Netwatch Next.js already running on http://127.0.0.1:${port}`);
      return port;
    }
  }

  // 2. Find the first free port so we never collide with other local projects on :3000
  let targetPort = 3000;
  for (const port of NEXT_PORTS) {
    const occupied = await isPortOpen(port);
    if (!occupied) {
      targetPort = port;
      break;
    }
    log(`Port :${port} is occupied by another service; trying next port…`);
  }

  log(`Starting Netwatch Next.js on http://127.0.0.1:${targetPort} (CI=true)…`);
  spawnShellDetached(`pnpm exec next dev -p ${targetPort}`, NETWATCH_ROOT, {
    CI: 'true',
    PORT: String(targetPort),
  });

  const ready = await waitForNetwatchOnPort(targetPort);
  if (!ready) {
    console.error(`[dev-native] Netwatch Next.js did not become ready on :${targetPort}`);
    process.exit(1);
  }
  log(`Netwatch Next.js is ready on http://127.0.0.1:${targetPort}`);
  return targetPort;
}

function adb(cmd) {
  try {
    execSync(`adb ${cmd}`, { stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function listAdbDevices() {
  try {
    const out = execSync('adb devices', { encoding: 'utf8' });
    return out
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.endsWith('\tdevice'))
      .map((line) => line.split('\t')[0]);
  } catch {
    return [];
  }
}

function resolveEmulatorBinary() {
  const sdkRoot =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    (process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
      : null);

  if (sdkRoot) {
    const bin = path.join(
      sdkRoot,
      'emulator',
      process.platform === 'win32' ? 'emulator.exe' : 'emulator'
    );
    if (fs.existsSync(bin)) return bin;
  }
  return 'emulator';
}

async function ensureAndroidEmulator() {
  let devices = listAdbDevices();
  if (devices.length > 0) return devices;

  const emulatorBin = resolveEmulatorBinary();
  let avds = [];
  try {
    const out = execSync(`"${emulatorBin}" -list-avds`, { encoding: 'utf8' });
    avds = out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }

  if (avds.length === 0) {
    log('No Android AVDs found. Create an AVD in Android Studio Device Manager.');
    return [];
  }

  const avd = process.env.ANDROID_AVD || avds[0];
  log(`Booting Android Emulator (${avd})…`);
  spawnShellDetached(
    `"${emulatorBin}" -avd ${avd} -no-snapshot-load`,
    NATIVE_ROOT,
    {},
    emulatorBin,
    ['-avd', avd, '-no-snapshot-load']
  );

  const start = Date.now();
  while (Date.now() - start < 120_000) {
    devices = listAdbDevices();
    if (devices.length > 0) {
      try {
        const boot = execSync(`adb -s ${devices[0]} shell getprop sys.boot_completed`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (boot === '1') {
          log(`Android Emulator (${devices[0]}) booted and ready.`);
          return devices;
        }
      } catch {
        /* still booting */
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  return listAdbDevices();
}

function setupAdbReverse(metroPort, nextPort) {
  const devices = listAdbDevices();
  if (devices.length === 0) {
    return devices;
  }

  const reverseFor = (target) => {
    for (const p of NEXT_PORTS) {
      adb(`${target} reverse tcp:${p} tcp:${p}`);
    }
    if (!NEXT_PORTS.includes(nextPort)) {
      adb(`${target} reverse tcp:${nextPort} tcp:${nextPort}`);
    }
    adb(`${target} reverse tcp:${metroPort} tcp:${metroPort}`);
  };

  for (const serial of devices) {
    reverseFor(`-s ${serial}`);
  }

  log(
    `adb reverse: :${nextPort} (Next.js) and :${metroPort} (Metro) → host (${devices.join(', ')})`
  );
  return devices;
}

function reloadAndroidApp(metroPort) {
  adb('shell am broadcast -a com.facebook.react.RELOAD');
  const expUrl = `exp://127.0.0.1:${metroPort}`;
  adb(`shell am start -a android.intent.action.VIEW -d "${expUrl}"`);
  log(`Opened/reloaded app (${expUrl})`);
}

function printProbeHints(nextPort) {
  log(`Netwatch BFF active on http://127.0.0.1:${nextPort} (verified /api/health)`);
  log(`Android emulator probes: http://127.0.0.1:${nextPort} → http://10.0.2.2:${nextPort}`);
  log(`iOS simulator uses http://localhost:${nextPort}`);
}

function startExpo(nextPort) {
  const flags = ['exec', 'expo', 'start'];
  if (clearCache) flags.push('--clear');
  if (mode === 'android') flags.push('--android');
  if (mode === 'ios') flags.push('--ios');
  const command = `pnpm ${flags.join(' ')}`;
  log(`Starting Metro (${command})…`);

  const child = spawnShellForeground(command, NATIVE_ROOT, {
    EXPO_PUBLIC_NETWATCH_PORT: String(nextPort),
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
  if (!['start', 'android', 'ios'].includes(mode)) {
    console.error('Usage: node scripts/dev-native.mjs <start|android|ios> [--clear]');
    process.exit(1);
  }

  await ensureBraindance();
  const nextPort = await ensureNext();
  printProbeHints(nextPort);

  if (mode === 'android') {
    await ensureAndroidEmulator();
  }

  const metroPort = await findMetroPort();

  if (metroPort != null) {
    log(`Metro already listening on :${metroPort}`);
    const devices = setupAdbReverse(metroPort, nextPort);
    if (mode === 'android' && devices.length > 0) {
      reloadAndroidApp(metroPort);
    } else if (mode === 'android') {
      log('Attach an emulator or device, then press a in Metro or re-run pnpm android');
    } else if (mode === 'ios' && process.platform !== 'darwin') {
      log(
        'iOS simulator needs macOS. Open Expo Go on a phone and use the QR code in the Metro terminal.'
      );
    } else {
      log('Use the running Metro terminal — press r to reload.');
    }
    return;
  }

  if (mode === 'android' || mode === 'start') {
    setupAdbReverse(8081, nextPort);
  }

  if (mode === 'ios' && process.platform !== 'darwin') {
    log('iOS simulator needs macOS. Starting Metro only — use a physical device with Expo Go.');
  }

  startExpo(nextPort);
}

main().catch((err) => {
  console.error('[dev-native]', err);
  process.exit(1);
});
