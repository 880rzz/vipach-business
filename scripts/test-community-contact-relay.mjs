import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../google-apps-script.gs', import.meta.url), 'utf8');
const mail = [];
const ctx = vm.createContext({
  MailApp: { sendEmail: message => mail.push(message) },
  ContentService: {
    MimeType: { JSON: 'JSON' },
    createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }),
  },
  Utilities: { formatDate: (_date, timezone) => {
    assert.equal(timezone, 'Europe/Vienna');
    return '2026.11.25. 16:15:00';
  } },
  SpreadsheetApp: { openById: () => assert.fail('no actual sheet operations') },
});
vm.runInContext(script, ctx);
assert.deepEqual(ctx.doGet(), {
  ok: true, service: 'VIPACH for Business form endpoint', status: 'running', communityContact: 'v1',
});

const base = {
  processing_context: 'vipach-community-contact-v1', name: 'Mock Person',
  email: 'mock@example.invalid', phone: '+43 000', description: 'Mock-only message; not actually sent.',
  gdpr: 'accepted', privacy_version: 'vipach-contact-v1', form_language: 'hu',
  page: 'https://www.vipach.at/kapcsolat.html', _subject: 'Not shown in community mail',
};
const post = overrides => ctx.doPost({ parameter: { ...base, ...overrides }, parameters: {} });
const reset = () => { mail.length = 0; };

for (const row of [
  ['hu', 'https://www.vipach.at/kapcsolat.html', 'Megkaptuk az üzenetét'],
  ['en', 'https://vipach.at/en/kapcsolat.html', 'We received your message'],
  ['de', 'https://www.vipach.at/de/kapcsolat.html', 'Ihre Nachricht ist eingegangen'],
]) {
  const [language, page, subject] = row;
  reset();
  assert.deepEqual(post({ form_language: language, page, gdpr_acceptance_text: 'Localized test copy' }),
    { ok: true, communityContact: 'v1', acknowledgmentSent: true });
  assert.equal(mail.length, 2);
  assert.equal(mail[0].to, 'office@vipach.at');
  assert.equal(mail[0].replyTo, base.email);
  assert.equal(mail[0].name, 'VIPACH');
  assert.match(mail[0].subject, /^\[VIPACH/);
  assert.match(mail[0].body, /Localized test copy/);
  assert.ok(mail[0].body.includes(page));
  assert.equal(mail[1].to, base.email);
  assert.equal(mail[1].replyTo, 'office@vipach.at');
  assert.equal(mail[1].name, 'VIPACH');
  assert.equal(mail[1].subject, subject + ' | VIPACH');
  assert.doesNotMatch(mail.map(m => [m.subject, m.body].join('\n')).join('\n'), /Not shown in community mail|48 (?:hours|Stunden|órán)|VIPACH for Business|business\.vipach\.at/);
}
reset();
assert.equal(post({ website_hp: 'filled' }).ok, true);
assert.equal(post({ website_hp: 'filled' }).communityContact, undefined);
for (const [overrides, error] of [
  [{ name: '' }, 'missing_or_invalid_fields'],
  [{ email: 'not-an-email' }, 'missing_or_invalid_fields'],
  [{ email: 'mock@example.invalid,recipient' }, 'missing_or_invalid_fields'],
  [{ description: '   ' }, 'missing_or_invalid_fields'],
  [{ description: 'x'.repeat(5001) }, 'missing_or_invalid_fields'],
  [{ gdpr: 'no' }, 'privacy_not_accepted'],
  [{ privacy_version: '' }, 'invalid_form_context'],
  [{ page: 'https://www.vipach.at.example.invalid/kapcsolat.html' }, 'invalid_form_context'],
  [{ page: 'https://www.vipach.at/kapcsolat.html?value=private' }, 'invalid_form_context'],
  [{ form_language: 'de' }, 'invalid_form_context'],
]) {
  assert.deepEqual(post(overrides), { ok: false, communityContact: 'v1', error });
}
assert.equal(mail.length, 0);

ctx.MailApp.sendEmail = () => { throw new Error('Internal mock failure'); };
assert.deepEqual(post({}), { ok: false, communityContact: 'v1', error: 'submission_failed' });
ctx.MailApp.sendEmail = message => {
  if (message.to === base.email) throw new Error('Internal mock acknowledgment failure');
  mail.push(message);
};
assert.deepEqual(post({}), { ok: true, communityContact: 'v1', acknowledgmentSent: false });
assert.equal(mail.length, 1);
assert.equal(mail[0].to, 'office@vipach.at');

reset();
ctx.MailApp.sendEmail = message => mail.push(message);
const business = post({
  processing_context: 'GitHub Pages static hosting; Google Apps Script',
  page: 'https://business.vipach.at/en/',
  form_language: 'en',
  _subject: 'Existing Business subject',
});
assert.deepEqual(business, { ok: true });
assert.equal(mail.length, 2);
assert.equal(mail[0].to, 'office@vipach.at');
assert.equal(mail[0].subject, 'Existing Business subject — ' + base.name);
assert.equal(mail[0].name, 'VIPACH for Business');
assert.match(mail[1].body, /within 48 hours/);
assert.match(mail[1].body, /business\.vipach\.at/);
console.log('PASS: community HU/EN/DE, receipt capability, failures and unchanged Business; no live mail or POST.');
