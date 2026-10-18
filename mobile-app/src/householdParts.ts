// ============================================================
// Version 2.1 — storing a household in PARTS instead of one item
// ============================================================
// Firebase allows at most 1 MB per stored item. Until now the whole household (every
// transaction, bill and photo) was locked into ONE item, so a busy household would
// eventually stop syncing. From 2.1 the data is split into parts:
//   core              everything except transactions and photos (settings, bills, ...)
//   txn-YYYY-MM       one part per month of transactions (by the transaction's date)
//   txn-undated       transactions without a usable date (should never happen)
//   rcpt-<txn id>     one part per receipt photo
//   avatars-<user>    one person's saved profile photos
// Each part is encrypted on its own and only the parts that changed are saved, so each
// save is small, and two people changing different months no longer touch each other.
//
// This file only splits and joins; it never talks to Firebase. It has no runtime
// imports so the automatic checks in tests/ can run it directly.

import type { HouseholdModel, ManualTransaction, SavedAvatarPhoto } from './types';

export const PARTS_LAYOUT_VERSION = 1;
export const CORE_PART = 'core';

export type HouseholdParts = Record<string, unknown>;

type ReceiptPart = { txnId: string; dataUri: string };
type AvatarsPart = { username: string; photos: SavedAvatarPhoto[] };

// Firestore ids can't contain "/" and shouldn't start with "__"; keep ids simple.
export function safePartKey(raw: string): string {
  const cleaned = String(raw).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 300);
  return cleaned.startsWith('__') ? `x${cleaned}` : cleaned || 'blank';
}

export function monthPartId(date: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(date || '');
  return m ? `txn-${m[1]}-${m[2]}` : 'txn-undated';
}

export function splitModel(model: HouseholdModel): HouseholdParts {
  const parts: HouseholdParts = {};
  const { manualTransactions, avatarPhotos, ...rest } = model;

  const byMonth: Record<string, ManualTransaction[]> = {};
  for (const t of manualTransactions || []) {
    let row: ManualTransaction = t;
    if (t.receiptPhoto) {
      const key = `rcpt-${safePartKey(t.id)}`;
      const receipt: ReceiptPart = { txnId: t.id, dataUri: t.receiptPhoto };
      parts[key] = receipt;
      // The transaction keeps a pointer instead of the photo itself.
      row = { ...t, receiptPhoto: `part:${key}` };
    }
    const id = monthPartId(t.date);
    (byMonth[id] = byMonth[id] || []).push(row);
  }
  Object.keys(byMonth).forEach((id) => {
    parts[id] = byMonth[id];
  });

  for (const username of Object.keys(avatarPhotos || {})) {
    const photos = (avatarPhotos || {})[username] || [];
    const value: AvatarsPart = { username, photos };
    parts[`avatars-${safePartKey(username)}`] = value;
  }

  // Remember which optional lists existed, so joining gives back exactly the same shape.
  parts[CORE_PART] = {
    ...rest,
    __hasTransactions: manualTransactions !== undefined,
    __hasAvatarPhotos: avatarPhotos !== undefined,
  };
  return parts;
}

export function joinParts(parts: HouseholdParts): HouseholdModel {
  const coreRaw = parts[CORE_PART] as (Record<string, unknown> & {
    __hasTransactions?: boolean;
    __hasAvatarPhotos?: boolean;
  }) | undefined;
  if (!coreRaw) throw new Error('The household data is missing its main part.');
  const { __hasTransactions, __hasAvatarPhotos, ...core } = coreRaw;

  const receipts: Record<string, string> = {};
  const transactions: ManualTransaction[] = [];
  let avatarPhotos: Record<string, SavedAvatarPhoto[]> | undefined;

  // Parts in a fixed order, so the same parts always join into the same model.
  const ids = Object.keys(parts).sort();
  for (const id of ids) {
    if (id.startsWith('rcpt-')) {
      const r = parts[id] as ReceiptPart;
      if (r && typeof r.dataUri === 'string') receipts[id] = r.dataUri;
    } else if (id.startsWith('avatars-')) {
      const a = parts[id] as AvatarsPart;
      if (a && typeof a.username === 'string') {
        avatarPhotos = avatarPhotos || {};
        avatarPhotos[a.username] = Array.isArray(a.photos) ? a.photos : [];
      }
    }
  }
  for (const id of ids) {
    if (!id.startsWith('txn-')) continue;
    for (const t of (parts[id] as ManualTransaction[]) || []) {
      const pointer = typeof t.receiptPhoto === 'string' && t.receiptPhoto.startsWith('part:') ? t.receiptPhoto.slice(5) : null;
      if (pointer) {
        const photo = receipts[pointer];
        const copy: ManualTransaction = { ...t };
        if (photo) copy.receiptPhoto = photo;
        else delete copy.receiptPhoto; // the photo part hasn't arrived (or was removed)
        transactions.push(copy);
      } else {
        transactions.push(t);
      }
    }
  }

  const model = { ...(core as unknown as HouseholdModel) };
  if (__hasTransactions !== false || transactions.length) model.manualTransactions = transactions;
  if (__hasAvatarPhotos || avatarPhotos) model.avatarPhotos = avatarPhotos || {};
  return model;
}

// Turns each part into the exact text that gets encrypted. Comparing this text with
// the text saved last time tells which parts changed.
export function partTexts(parts: HouseholdParts): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of Object.keys(parts)) out[id] = JSON.stringify(parts[id]);
  return out;
}

export type PartChanges = { write: string[]; remove: string[] };

export function changedParts(previous: Record<string, string>, next: Record<string, string>): PartChanges {
  const write = Object.keys(next).filter((id) => previous[id] !== next[id]);
  const remove = Object.keys(previous).filter((id) => !(id in next));
  // The core part last: by the time other phones see it, the parts it relies on exist.
  write.sort((a, b) => (a === CORE_PART ? 1 : b === CORE_PART ? -1 : a < b ? -1 : 1));
  return { write: write, remove: remove };
}
