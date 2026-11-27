import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type AppEnv = 'development' | 'staging' | 'production';

export interface RuntimeAppConfig {
  env: AppEnv;
  explicitApiUrl: string;
  preferredPort: number;
  version: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

function parseEnv(raw: unknown): AppEnv {
  const str = String(raw || process.env.EXPO_PUBLIC_APP_ENV || 'development')
    .trim()
    .toLowerCase();
  if (str === 'production' || str === 'prod') return 'production';
  if (str === 'staging' || str === 'preview') return 'staging';
  return 'development';
}

export const AppConfig: RuntimeAppConfig = {
  env: parseEnv(extra.appEnv),
  explicitApiUrl: String(
    process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || ''
  )
    .trim()
    .replace(/\/+$/, ''),
  preferredPort:
    Number(
      process.env.EXPO_PUBLIC_NETWATCH_PORT || extra.netwatchPort || 3000
    ) || 3000,
  version: Constants.expoConfig?.version || '1.0.0',
};

const PROBE_TIMEOUT_MS = 2200;
const CANDIDATE_PORTS = Array.from(
  new Set([AppConfig.preferredPort, 3000, 3001, 3002])
);

let sessionBaseUrl: string | null = null;
let resolvePromise: Promise<string> | null = null;

function metroHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0]?.trim();
  return host || null;
}

function buildProbeCandidates(): string[] {
  const candidates: string[] = [];

  if (AppConfig.explicitApiUrl) {
    candidates.push(AppConfig.explicitApiUrl);
  }

  const addHostPorts = (host: string) => {
    for (const port of CANDIDATE_PORTS) {
      candidates.push(`http://${host}:${port}`);
    }
  };

  if (Platform.OS === 'ios' && !Device.isDevice) {
    addHostPorts('localhost');
    addHostPorts('127.0.0.1');
  } else if (Platform.OS === 'android' && !Device.isDevice) {
    addHostPorts('127.0.0.1');
    addHostPorts('10.0.2.2');
  }

  const host = metroHost();
  if (host) {
    addHostPorts(host);
  }

  // Fallback local aliases
  addHostPorts('10.0.2.2');
  addHostPorts('127.0.0.1');

  return Array.from(new Set(candidates));
}

async function isNetwatchApi(base: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/api/health`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    if (!text) return false;
    try {
      const json = JSON.parse(text) as { service?: string; status?: string };
      return json?.service === 'netwatch';
    } catch {
      return false;
    }
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function resetNetwatchBaseUrlCache(): void {
  sessionBaseUrl = null;
  resolvePromise = null;
}

/**
 * Resolves the Netwatch web BFF base URL once per app session.
 * Verifies `/api/health` returns `{ service: "netwatch" }` so unrelated
 * processes on port 3000 are automatically skipped in favor of 3001/3002.
 */
export async function resolveNetwatchBaseUrl(): Promise<string> {
  if (sessionBaseUrl) return sessionBaseUrl;
  if (resolvePromise) return resolvePromise;

  resolvePromise = (async () => {
    // Production/staging with an explicit remote HTTPS API URL can still validate or fall back directly
    if (
      AppConfig.explicitApiUrl &&
      AppConfig.explicitApiUrl.startsWith('https://') &&
      AppConfig.env !== 'development'
    ) {
      sessionBaseUrl = AppConfig.explicitApiUrl;
      return sessionBaseUrl;
    }

    const candidates = buildProbeCandidates();
    if (candidates.length === 0) {
      throw new Error(
        'Cannot resolve Netwatch API: no probe candidates (is Metro connected?)'
      );
    }

    for (const candidate of candidates) {
      const base = candidate.replace(/\/+$/, '');
      if (await isNetwatchApi(base)) {
        sessionBaseUrl = base;
        return base;
      }
    }

    throw new Error(
      `Cannot reach Netwatch API (/api/health). Tried: ${candidates.slice(0, 6).join(', ')}`
    );
  })();

  try {
    return await resolvePromise;
  } catch (err) {
    resolvePromise = null;
    throw err;
  }
}
