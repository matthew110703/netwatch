import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryFallback = new Map<string, string>();

export async function safeGetItem(key: string): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  memoryFallback.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* fallback to in-memory map when Expo Go legacy storage module is unavailable */
  }
}
