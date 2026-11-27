import { safeGetItem, safeSetItem } from './storage';

const KEY = 'netwatch_device_id';
const VALID = /^[a-zA-Z0-9_-]{4,128}$/;

function createId(): string {
  return `nw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

let cached: string | null = null;

export async function getNativeDeviceId(): Promise<string> {
  if (cached && VALID.test(cached)) return cached;
  const stored = await safeGetItem(KEY);
  if (stored && VALID.test(stored)) {
    cached = stored;
    return stored;
  }
  const id = createId();
  cached = id;
  await safeSetItem(KEY, id);
  return id;
}