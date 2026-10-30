# Security plan for 3.2: K3 (new household key on removal) and K5 (stronger encryption)

Written 2026-10-27 by a planning agent and checked by Claude against the real code. Nothing
here is built yet. Cath's answers decide the open questions (bottom).

## What the code showed
1. In a 2-person household K3 never runs: removing the only other member closes the household
   (it becomes personal again), as today. K3 matters for households of 3 to 5 people.
2. With a "key chain" (the new key locked with the old one, readable by members only), the
   removed person is kept out by the Firebase rules plus "nothing new is written with the old
   key". A cut-off that also holds if the database itself leaked needs per-person public keys
   (a new crypto library) and would make recovery keys made before a re-lock need renewing.
3. Today, a phone that can't read the online copy saves its own copy anyway; with a new key
   that would overwrite the re-locked data. That must change to "pick up the new key, retry",
   and the rules must refuse it too.
4. Old phones can't be stopped by reading the data, so after a re-lock every save must carry
   the key number (dataKv) and a matching stamp (dataAt); old apps never send them and are refused.
5. K5 changes the personal key; for an unlinked profile its Recovery Key is then lost (as with
   a password change today).
6. Only typed passwords gain from more rounds; recovery codes, help codes and link codes are
   already strong, and a 4-6 digit PIN is protected by the phone's vault and the 5-try limit.

## K3 (Option A, key chain)
- households/{id}: keyVersion, dataKv, dataAt, rekeyDue. households/{id}/keyChain/{n}: the
  new key locked with the previous one (members only, create-only, kept). Parts carry kv.
- Owner: removing someone sets rekeyDue; only when every remaining phone reports 3.2 the owner's
  phone makes key n+1 (chain doc), flips the household in one transaction (re-encrypted data,
  keyVersion+1), then any 3.2 phone re-encrypts the parts one by one. Every step can resume.
- Other phones: see keyVersion go up, walk the chain, keep their own copy of the new key.
- Recovery keys walk the chain; peer recovery sends the current key number.

## K5
- Envelope v2 "f2:<iv>:<ct>:<mac>" (encrypt-then-MAC, HMAC-SHA256, keys derived from the key),
  read always, written only where every reader is on 3.2 (household: memberVersions; the
  person's own cloud copies: all their devices on 3.2; on this phone: straight away).
- Passwords: 600,000 rounds (measure on Cath's phone; 310,000 if one sign-in takes over a
  second), only with the installed app's fast key step (Expo Go stays at 100,000). Done once,
  after typing the password; the round count is saved next to the salt.

## Order (each step tested on its own)
1. v2 reader + tests (nothing writes v2). 2. rounds passed everywhere (still 100k).
3. report 3.2; device appVersion (rules publish 1). 4. gated v2 writer; parts by kv.
5. save key check, no overwrite fallback. 6. K3 rules (publish 2), adopt the new key.
7. owner re-lock + parts job (device test: 3-member test household, airplane mode mid-way).
8. recovery carries the key number. 9. password upgrade.

## Open questions for Cath (2026-10-27)
- A (key chain) only, or A now and B (per-person public keys) later?
- Also re-lock when a member leaves by themselves / an owner hands over and leaves?
- Unlinked profiles with a Recovery Key: offer "Upgrade lock" that also makes a new code?
- 600,000 rounds after measuring on her phone?
