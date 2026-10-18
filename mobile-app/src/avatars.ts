// ============================================================
// Avatars (PC.5a) - preset avatar list + photo shrinking helper
// ============================================================
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type AvatarPreset = {
  id: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  bg: string;
};

// Presets are just an icon on a coloured circle, so no image files are needed.
// Only the id is stored in the model.
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'leaf', icon: 'leaf', bg: '#2E5D3A' },
  { id: 'paw', icon: 'paw', bg: '#D97706' },
  { id: 'heart', icon: 'heart', bg: '#DB2777' },
  { id: 'star', icon: 'star', bg: '#2563EB' },
  { id: 'planet', icon: 'planet', bg: '#6D28D9' },
  { id: 'flame', icon: 'flame', bg: '#DC2626' },
  { id: 'rocket', icon: 'rocket', bg: '#0891B2' },
  { id: 'cafe', icon: 'cafe', bg: '#78716C' },
  { id: 'bicycle', icon: 'bicycle', bg: '#059669' },
  { id: 'flower', icon: 'flower', bg: '#9333EA' },
  { id: 'happy', icon: 'happy', bg: '#EA580C' },
  { id: 'sparkles', icon: 'sparkles', bg: '#264653' },
];

export function findAvatarPreset(id: string | undefined): AvatarPreset | undefined {
  if (!id) return undefined;
  return AVATAR_PRESETS.find((p) => p.id === id);
}

export const AVATAR_PX = 192;
export const AVATAR_JPEG_QUALITY = 0.6;
// About 60 KB of image data. A normal 192px photo should be far smaller;
// this is only a safety net to keep the encrypted household document small.
export const AVATAR_MAX_BASE64_CHARS = 80000;

export async function makeAvatarDataUri(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri);
  const imageRef = await context.resize({ width: AVATAR_PX }).renderAsync();
  const result = await imageRef.saveAsync({
    format: SaveFormat.JPEG,
    compress: AVATAR_JPEG_QUALITY,
    base64: true,
  });
  if (!result.base64) {
    throw new Error("Couldn't read that photo. Try a different one.");
  }
  if (__DEV__) {
    console.log('[avatar] base64 chars:', result.base64.length);
  }
  if (result.base64.length > AVATAR_MAX_BASE64_CHARS) {
    throw new Error('That photo is too large. Try a different one.');
  }
  return `data:image/jpeg;base64,${result.base64}`;
}

// ---- Receipt photos (version 2.1, data risk 1) ----
// Receipts are saved inside the shared household data, which Firebase caps at 1 MB in
// total. A phone photo straight from the gallery can be bigger than that on its own,
// so every receipt is shrunk first: up to 1000 px wide (still readable), then smaller
// and softer if it's still too big. About 150 KB of image data is the most we keep.
export const RECEIPT_MAX_BASE64_CHARS = 200000;
const RECEIPT_STEPS: { width: number; compress: number }[] = [
  { width: 1000, compress: 0.5 },
  { width: 800, compress: 0.4 },
  { width: 640, compress: 0.35 },
];

export async function makeReceiptDataUri(sourceUri: string, sourceWidth?: number): Promise<string> {
  for (const step of RECEIPT_STEPS) {
    const context = ImageManipulator.manipulate(sourceUri);
    // Never enlarge a photo that is already narrower than the step.
    const width = sourceWidth && sourceWidth < step.width ? sourceWidth : step.width;
    const imageRef = await context.resize({ width }).renderAsync();
    const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: step.compress, base64: true });
    if (!result.base64) throw new Error("Couldn't read that photo. Try a different one.");
    if (__DEV__) console.log('[receipt] width', width, 'base64 chars:', result.base64.length);
    if (result.base64.length <= RECEIPT_MAX_BASE64_CHARS) return `data:image/jpeg;base64,${result.base64}`;
  }
  throw new Error('That photo is too large to save, even after shrinking it. Try a closer, simpler shot of the receipt.');
}
