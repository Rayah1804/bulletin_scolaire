import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

type StoredEnvelope = {
  v: 1;
  alg: 'AES';
  ct: string; // base64 ciphertext
};

const DEFAULT_DATA_KEY = 'db:students:v1';
const SECRET_KEY_NAME = 'db:secret:v1';

async function getOrCreateSecret(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(SECRET_KEY_NAME);
    if (existing) return existing;
  } catch {
    // Fallback if SecureStore is unavailable.
  }

  const created =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2);

  try {
    await SecureStore.setItemAsync(SECRET_KEY_NAME, created, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // If SecureStore fails, keep the generated secret in memory.
  }

  return created;
}

export async function hasStorageItem(dataKey = DEFAULT_DATA_KEY): Promise<boolean> {
  const raw = await AsyncStorage.getItem(dataKey);
  return raw !== null;
}

export async function readEncryptedJson<T>(fallback: T, dataKey = DEFAULT_DATA_KEY): Promise<T> {
  const raw = await AsyncStorage.getItem(dataKey);
  if (!raw) return fallback;

  let env: StoredEnvelope | null = null;
  try {
    env = JSON.parse(raw) as StoredEnvelope;
  } catch {
    // If raw is plain JSON, allow fallback below.
  }

  if (env && env.v === 1 && env.alg === 'AES' && typeof env.ct === 'string') {
    const secret = await getOrCreateSecret();
    try {
      const bytes = CryptoJS.AES.decrypt(env.ct, secret);
      const plaintext = bytes.toString(CryptoJS.enc.Utf8);
      if (plaintext) return JSON.parse(plaintext) as T;
    } catch {
      // Continue to fallback parsing below.
    }
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeEncryptedJson<T>(value: T, dataKey = DEFAULT_DATA_KEY): Promise<void> {
  const plaintext = JSON.stringify(value);
  try {
    const secret = await getOrCreateSecret();
    const ct = CryptoJS.AES.encrypt(plaintext, secret).toString();
    const env: StoredEnvelope = { v: 1, alg: 'AES', ct };
    await AsyncStorage.setItem(dataKey, JSON.stringify(env));
  } catch {
    await AsyncStorage.setItem(dataKey, plaintext);
  }
}

