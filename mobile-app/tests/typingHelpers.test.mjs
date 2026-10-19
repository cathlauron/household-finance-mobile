// Version 3: recovery key dashes and the email "Did you mean ...?" check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatRecoveryKeyInput, isEmailFormat, emailTypoSuggestion } from '../src/typingHelpers.ts';

test('recovery key: dashes every 4, capitals, paste with or without dashes, max 16', () => {
  assert.equal(formatRecoveryKeyInput('abcd'), 'ABCD');
  assert.equal(formatRecoveryKeyInput('abcde'), 'ABCD-E');
  assert.equal(formatRecoveryKeyInput('ABCD-EFGH-JKMN-PQRS'), 'ABCD-EFGH-JKMN-PQRS');
  assert.equal(formatRecoveryKeyInput('abcd efgh jkmn pqrs'), 'ABCD-EFGH-JKMN-PQRS');
  assert.equal(formatRecoveryKeyInput('ABCDEFGHJKMNPQRSXYZ'), 'ABCD-EFGH-JKMN-PQRS');
  assert.equal(formatRecoveryKeyInput('ABCD-'), 'ABCD'); // deleting back over a dash works
  assert.equal(formatRecoveryKeyInput(''), '');
});

test('email format', () => {
  assert.equal(isEmailFormat('cath@gmail.com'), true);
  assert.equal(isEmailFormat(' cath@work.com.ph '), true);
  assert.equal(isEmailFormat('cath@gmail'), false);
  assert.equal(isEmailFormat('cath@'), false);
  assert.equal(isEmailFormat('cath gmail.com'), false);
  assert.equal(isEmailFormat('ca th@gmail.com'), false);
});

test('email typos get a suggestion; real addresses are left alone', () => {
  assert.equal(emailTypoSuggestion('cath@gmial.com'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@gmail.con'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@gmai.com'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@gmal.com'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@gmail.co'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@Gmail.cm'), 'cath@gmail.com');
  assert.equal(emailTypoSuggestion('cath@yaho.com'), 'cath@yahoo.com');
  assert.equal(emailTypoSuggestion('cath@hotmial.com'), 'cath@hotmail.com');
  assert.equal(emailTypoSuggestion('cath@outlok.com'), 'cath@outlook.com');
  assert.equal(emailTypoSuggestion('cath@gmail.com'), null);
  assert.equal(emailTypoSuggestion('cath@mail.com'), null);
  assert.equal(emailTypoSuggestion('cath@gmx.com'), null);
  assert.equal(emailTypoSuggestion('cath@yahoo.com.ph'), null);
  assert.equal(emailTypoSuggestion('cath@company.ph'), null);
  assert.equal(emailTypoSuggestion('cath@deped.gov.ph'), null);
});
