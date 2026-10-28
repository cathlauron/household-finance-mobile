// SEC-7 (Cath's OK, 2026-10-27): a join link names who sent it; it never joins by itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inviterFromUrl, joinCodeFromUrl } from '../src/joinLink.ts';

test('the inviter name comes from the link, cleaned and short', () => {
  const url = 'https://household-finance-mobile.web.app/join#c=ABC234&n=Cath&t=1';
  assert.equal(joinCodeFromUrl(url), 'ABC234');
  assert.equal(inviterFromUrl(url), 'Cath');
  assert.equal(inviterFromUrl('x#c=ABC234&n=%3Cb%3EEvil%3C%2Fb%3E'), 'bEvilb');
  assert.equal(inviterFromUrl('financeflow://join/ABC234'), null);
});

test('a pending link asks first; the code is not logged', () => {
  const profile = fs.readFileSync(new URL('../src/screens/ProfileScreen.tsx', import.meta.url), 'utf8');
  assert.match(profile, /Join \$\{link\.from\}'s household\?/);
  assert.doesNotMatch(profile, /takePendingJoinCode\(\)\.then\(\(code\) => \{\s*if \(!alive \|\| !code\) return;[\s\S]{0,300}handleScanned\(code\);/);
  const linking = fs.readFileSync(new URL('../src/linking.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(linking, /linkCodes\/\$\{code\}/);
});

// SEC-1: rules (published by Cath in the Firebase Console) only let members make codes.
test('rules: a code is made by a member of its household, with only the app\'s fields', () => {
  const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(rules, /request\.auth\.uid in get\(\/databases\/\$\(database\)\/documents\/households\/\$\(request\.resource\.data\.existingHouseholdId\)\)\.data\.members/);
  assert.match(rules, /keys\(\)\.hasOnly\(\['codeSalt', 'encryptedSecret', 'encryptedHostData', 'hostUsername', 'hostUid', 'createdAt', 'existingHouseholdId', 'isInvite'\]\)/);
  assert.match(rules, /lastJoinCode\)\)\.data\.hostUid in resource\.data\.members/);
  assert.match(rules, /get\('existingHouseholdId', null\) == resource\.data\.get\('existingHouseholdId', null\)/);
});
