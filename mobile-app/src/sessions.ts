// src/sessions.ts
//
// Multi-device active session management.
// Tracks each device session under sessions/{uid}/devices/{deviceId}.
// Supports registering sessions, throttled heartbeat updates, real-time
// revocation listeners, and remote revocation from the Active Devices UI.

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { db } from './firebase';

export type DeviceSession = {
  deviceId: string;
  deviceName: string;
  platform: string;
  lastActiveAt: number;
  createdAt: number;
  revoked: boolean;
  revokedAt?: number;
};

const DEVICE_ID_KEY = '@household_device_id';
let cachedDeviceId: string | null = null;
let lastHeartbeatTime = 0;
const HEARTBEAT_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export function getDeviceName(): string {
  if (Platform.OS === 'android') {
    const brand = (Platform.constants as any)?.Brand || (Platform.constants as any)?.Manufacturer || '';
    const model = (Platform.constants as any)?.Model || '';
    const parts = [brand, model].filter(Boolean);
    return parts.length ? `${parts.join(' ')} (Android)` : 'Android Device';
  }
  if (Platform.OS === 'ios') {
    return 'iPhone / iPad (iOS)';
  }
  if (Platform.OS === 'web') {
    return 'Web Browser';
  }
  return `${Platform.OS} Device`;
}

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedDeviceId = stored;
      return stored;
    }
  } catch (e) {}

  let newId: string;
  if (typeof Crypto.randomUUID === 'function') {
    newId = Crypto.randomUUID();
  } else {
    const bytes = await Crypto.getRandomBytesAsync(16);
    newId = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  cachedDeviceId = newId;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  } catch (e) {}
  return newId;
}

// Correction 1: Always delete any existing document for this deviceId first,
// preventing update rule collision for previously revoked or signed-out devices.
export async function registerDeviceSession(uid: string): Promise<string> {
  const deviceId = await getDeviceId();
  const deviceRef = doc(db, 'sessions', uid, 'devices', deviceId);

  try {
    await deleteDoc(deviceRef);
  } catch (e) {
    // Ignore not-found or delete error
  }

  const now = Date.now();
  const sessionDoc: DeviceSession = {
    deviceId,
    deviceName: getDeviceName(),
    platform: Platform.OS,
    lastActiveAt: now,
    createdAt: now,
    revoked: false,
  };

  await setDoc(deviceRef, sessionDoc);
  lastHeartbeatTime = now;
  return deviceId;
}

// Normal sign out: cleanly deletes this device's own session document (Correction 2 & 4)
export async function deleteDeviceSession(uid: string, deviceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sessions', uid, 'devices', deviceId));
  } catch (e) {
    // Ignore delete errors
  }
}

// Watches this device's own document live for remote revocation
export function subscribeToDeviceSession(
  uid: string,
  deviceId: string,
  onRevoked: () => void
): () => void {
  const deviceRef = doc(db, 'sessions', uid, 'devices', deviceId);
  return onSnapshot(
    deviceRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DeviceSession;
        if (data.revoked === true) {
          onRevoked();
        }
      }
    },
    () => {
      // Silently ignore listener errors (e.g. offline)
    }
  );
}

// Subscribes to the list of active devices under this user's account for Settings
export function subscribeToUserDevices(
  uid: string,
  onUpdate: (devices: DeviceSession[]) => void
): () => void {
  const devicesCol = collection(db, 'sessions', uid, 'devices');
  return onSnapshot(
    devicesCol,
    (snap) => {
      const list: DeviceSession[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as DeviceSession;
        // Only display active (unrevoked) devices in the active sessions list
        if (!data.revoked) {
          list.push(data);
        }
      });
      list.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      onUpdate(list);
    },
    (err) => {
      console.warn('subscribeToUserDevices listener error:', err);
    }
  );
}

// Remotely revokes another device's session
export async function revokeDeviceSession(uid: string, targetDeviceId: string): Promise<void> {
  const deviceRef = doc(db, 'sessions', uid, 'devices', targetDeviceId);
  await updateDoc(deviceRef, {
    revoked: true,
    revokedAt: Date.now(),
  });
}

// Throttled heartbeat updater (Correction 5)
export async function updateDeviceHeartbeat(
  uid: string,
  deviceId: string,
  force = false
): Promise<void> {
  const now = Date.now();
  if (!force && now - lastHeartbeatTime < HEARTBEAT_THROTTLE_MS) {
    return;
  }
  lastHeartbeatTime = now;
  try {
    await updateDoc(doc(db, 'sessions', uid, 'devices', deviceId), {
      lastActiveAt: now,
    });
  } catch (e) {
    // Ignore heartbeat network/offline errors
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Active just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Active ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `Active ${diffDays}d ago`;
}
