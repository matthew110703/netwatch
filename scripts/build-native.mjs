#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NETWATCH_ROOT = path.resolve(__dirname, '..');
const NATIVE_ROOT = path.join(NETWATCH_ROOT, 'apps', 'native');

const action = process.argv[2] || 'help';
const rawEnv = process.argv[3] || process.env.APP_ENV || 'production';
const platform = process.argv[4] || 'all';

function normalizeEnv(input) {
  const clean = String(input || 'production').trim().toLowerCase();
  if (clean === 'dev' || clean === 'development') return 'development';
  if (clean === 'stage' || clean === 'staging' || clean === 'preview') return 'staging';
  return 'production';
}

function log(msg) {
  console.log(`\x1b[35m[build-native]\x1b[0m ${msg}`);
}

function loadDotEnvFile(envName) {
  const envFile = path.join(NATIVE_ROOT, `.env.${envName}`);
  const vars = {};
  if (!fs.existsSync(envFile)) return vars;
  const content = fs.readFileSync(envFile, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

function runInNative(command, envName = 'production') {
  const dotEnvVars = loadDotEnvFile(envName);
  const env = {
    ...process.env,
    ...dotEnvVars,
    APP_ENV: envName,
    EXPO_PUBLIC_APP_ENV: envName,
  };
  delete env.CI;

  log(`Running (${envName}): ${command}`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: NATIVE_ROOT,
      env,
      stdio: 'inherit',
      shell: true,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

function printHelp() {
  console.log(`
Netwatch Native Build & Environment Manager
Usage:
  node scripts/build-native.mjs <action> [environment] [platform]

Actions:
  bundle    [development|staging|production] [android|ios|all]  Export production JS/assets bundle locally (npx expo export)
  config    [development|staging|production]                    Inspect resolved Expo app.config.ts for environment
  prebuild  [development|staging|production] [android|ios|all]  Generate native Android/iOS directories via CNG
  eas       [development|staging|production] [android|ios|all]  Trigger EAS Build for profile & platform
  submit    [production|staging]             [android|ios|all]  Submit build to Play Store / App Store via EAS
  typecheck                                                     Run TypeScript compiler check on @netwatch/native
  doctor                                                        Validate Expo SDK dependencies and config
`);
}

async function main() {
  const appEnv = normalizeEnv(rawEnv);

  switch (action) {
    case 'bundle':
    case 'export': {
      const platFlag =
        platform === 'android' || platform === 'ios' ? `--platform ${platform}` : '--platform all';
      const outDir = `dist-${appEnv}`;
      await runInNative(`pnpm exec expo export ${platFlag} --output-dir ${outDir}`, appEnv);
      log(`Exported ${appEnv} bundle to apps/native/${outDir}`);
      break;
    }

    case 'config': {
      await runInNative('pnpm exec expo config --type public', appEnv);
      break;
    }

    case 'prebuild': {
      const platFlag =
        platform === 'android' || platform === 'ios' ? `--platform ${platform}` : '';
      await runInNative(`pnpm exec expo prebuild ${platFlag}`.trim(), appEnv);
      break;
    }

    case 'eas': {
      const platFlag =
        platform === 'android' || platform === 'ios' ? `--platform ${platform}` : '--platform all';
      await runInNative(
        `npx eas-cli@latest build --profile ${appEnv} ${platFlag} --non-interactive`,
        appEnv
      );
      break;
    }

    case 'submit': {
      const platFlag =
        platform === 'android' || platform === 'ios' ? `--platform ${platform}` : '--platform all';
      await runInNative(`npx eas-cli@latest submit --profile ${appEnv} ${platFlag}`, appEnv);
      break;
    }

    case 'typecheck': {
      await runInNative('pnpm exec tsc --noEmit', appEnv);
      break;
    }

    case 'doctor': {
      execSync('npx expo-doctor', { cwd: NATIVE_ROOT, stdio: 'inherit' });
      break;
    }

    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error('\x1b[31m[build-native]\x1b[0m', err.message || err);
  process.exit(1);
});
