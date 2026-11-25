/**
 * ============================================================
 *  VIPACH for Business — kapcsolati űrlap backend
 *  business.vipach.at  →  office@vipach.at
 * ============================================================
 *
 *  TELEPÍTÉS (kb. 3 perc):
 *  1. Nyisd meg: https://script.google.com → "Új projekt"
 *     (azzal a Google-fiókkal, amelyikből az e-mail menjen)
 *  2. Töröld a Code.gs tartalmát, és illeszd be ezt a teljes fájlt.
 *  3. Mentés (Ctrl+S), projektnév: "VIPACH Business Form"
 *  4. Deploy → New deployment → ⚙️ típus: "Web app"
 *       - Description:  VIPACH form v1
 *       - Execute as:   Me (a saját fiókod)
 *       - Who has access:  Anyone   ← FONTOS, különben a weboldal nem éri el
 *  5. Deploy → engedélyezd a hozzáférést (Authorize access)
 *  6. Másold ki a kapott "Web app URL"-t
 *     (https://script.google.com/macros/s/XXXX/exec)
 *     és illeszd be az index.html-ben a GAS_URL változóba.
 *
 *  MÓDOSÍTÁS UTÁN: Deploy → Manage deployments → ✏️ →
 *  Version: "New version" → Deploy. (Az URL változatlan marad.)
 *
 *  OPCIONÁLIS NAPLÓZÁS GOOGLE SHEETBE:
 *  Hozz létre egy üres Google Sheetet, másold ki az ID-jét az URL-ből
 *  (a /d/ és /edit közötti rész), és írd be lent a SHEET_ID-be.
 */

var CONFIG = {
  RECIPIENT: 'office@vipach.at',
  FALLBACK_SUBJECT: 'VIPACH for Business — Új ajánlatkérés / kapcsolatfelvétel',
  SEND_AUTO_REPLY: true,   // automatikus visszaigazolás az érdeklődőnek
  SHEET_ID: ''             // opcionális: Google Sheet ID a naplózáshoz, üresen kihagyja
};

var COMMUNITY_CONTACT_CONTEXT = 'vipach-community-contact-v1';
var COMMUNITY_CONTACT_VERSION = 'v1';
var COMMUNITY_CONTACT_SEND_AUTO_REPLY = true;
var COMMUNITY_CONTACT_COPY = {
  hu: {
    pathPrefix: '',
    subject: '[VIPACH közösség] Új üzenet',
    acknowledgmentSubject: 'Megkaptuk az üzenetét | VIPACH',
    acknowledgment: 'Köszönjük, hogy írt a VIPACH-nak. Megkaptuk az üzenetét.',
    signoff: 'Üdvözlettel,'
  },
  en: {
    pathPrefix: '/en',
    subject: '[VIPACH community] New message',
    acknowledgmentSubject: 'We received your message | VIPACH',
    acknowledgment: 'Thank you for contacting VIPACH. We have received your message.',
    signoff: 'Best regards,'
  },
  de: {
    pathPrefix: '/de',
    subject: '[VIPACH-Community] Neue Nachricht',
    acknowledgmentSubject: 'Ihre Nachricht ist eingegangen | VIPACH',
    acknowledgment: 'Vielen Dank für Ihre Nachricht an VIPACH. Wir haben sie erhalten.',
    signoff: 'Mit freundlichen Grüßen'
  }
};

// Az űrlap value → olvasható magyar címke megfeleltetések
var SERVICE_LABELS = {
  'digital-entity': 'Digitális entitásépítés',
  'ai-entity':      'AI entitás / vállalati DNS programozás',
  'executive':      'Executive portré / LinkedIn',
  'brand':          'Brand fotózás',
  'event':          'C-level eseményfotózás',
  'team':           'Céges csapatépítés',
  'web':            'Professzionális weboldal készítés',
  'webapp':         'Webes alkalmazás készítés',
  'education':      'AI-alapú weboldalkészítő oktatás',
  'consult':        'Még nem tudja, konzultációt kér'
};

var LOCATION_LABELS = {
  'hu':    'Magyarország',
  'at':    'Ausztria',
  'hu-at': 'Magyarország és Ausztria',
  'other': 'Egyéb ország',
  'prep':  'Még előkészítés alatt áll'
};

var TIMELINE_LABELS = {
  'now':      'Azonnal',
  '1m':       '1 hónapon belül',
  '3m':       '3 hónapon belül',
  'later':    'Később',
  'research': 'Még csak tájékozódik'
};

/** Fő belépési pont — a weboldal POST kérése ide érkezik. */
function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    var multi = (e && e.parameters) || {};

    // Honeypot: ha a rejtett mező ki van töltve, gép küldte — csendben elnyeljük
    if (p.website_hp) {
      return jsonResponse_({ ok: true });
    }

    if (p.processing_context === COMMUNITY_CONTACT_CONTEXT) {
      return submitCommunityContact_(p);
    }

    // Minimális validáció: név, e-mail és GDPR elfogadás
    var name  = clean_(p.name);
    var email = clean_(p.email);
    if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return jsonResponse_({ ok: false, error: 'missing_or_invalid_fields' });
    }
    if (!p.gdpr) {
      return jsonResponse_({ ok: false, error: 'privacy_not_accepted' });
    }

    var data = {
      name:        name,
      company:     clean_(p.company),
      email:       email,
      phone:       clean_(p.phone),
      online:      clean_(p.online),
      location:    LOCATION_LABELS[p.location] || clean_(p.location),
      timeline:    TIMELINE_LABELS[p.timeline] || clean_(p.timeline),
      services:    (multi.service || []).map(function (v) {
                     return SERVICE_LABELS[v] || v;
                   }).join(', '),
      budget:      clean_(p.budget),
      description: clean_(p.description),
      gdpr:        p.gdpr ? 'Elfogadva' : 'NINCS elfogadva',
      gdprAcceptedAt: clean_(p.gdpr_accepted_at),
      gdprAcceptanceText: clean_(p.gdpr_acceptance_text),
      privacyVersion: clean_(p.privacy_version),
      formLanguage: clean_(p.form_language || inferLanguage_(p.privacy_version, p.page)),
      page:        clean_(p.page),
      userAgent:   clean_(p.userAgent),
      processingContext: clean_(p.processing_context),
      receivedAt:  Utilities.formatDate(new Date(), 'Europe/Vienna', 'yyyy.MM.dd. HH:mm:ss')
    };

    var subject = clean_(p._subject) || CONFIG.FALLBACK_SUBJECT;

    // 1) Értesítő e-mail az office@vipach.at címre
    MailApp.sendEmail({
      to:       CONFIG.RECIPIENT,
      replyTo:  data.email,
      subject:  subject + ' — ' + data.name + (data.company ? ' (' + data.company + ')' : ''),
      htmlBody: buildNotificationHtml_(data),
      body:     buildNotificationText_(data),
      name:     'VIPACH for Business'
    });

    // 2) Automatikus visszaigazolás az érdeklődőnek
    if (CONFIG.SEND_AUTO_REPLY) {
      try {
        MailApp.sendEmail({
          to:       data.email,
          replyTo:  CONFIG.RECIPIENT,
          subject:  buildAutoReplySubject_(data),
          htmlBody: buildAutoReplyHtml_(data),
          body:     buildAutoReplyText_(data),
          name:     'VIPACH for Business'
        });
      } catch (autoErr) {
        // a visszaigazolás hibája ne buktassa el a fő küldést
      }
    }

    // 3) Opcionális naplózás Google Sheetbe
    if (CONFIG.SHEET_ID) {
      try { logToSheet_(data); } catch (sheetErr) { /* nem kritikus */ }
    }

    return jsonResponse_({ ok: true });

  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/** Egyszerű állapotellenőrzés böngészőből (GET). */
function doGet() {
  return jsonResponse_({ ok: true, service: 'VIPACH for Business form endpoint', status: 'running', communityContact: COMMUNITY_CONTACT_VERSION });
}

// Community requests share the recipient, but never use the Business mail template, lead sheet,
// request-controlled subject, or 48-hour offer promise. Only the office notification determines ok.
function submitCommunityContact_(p) {
  function reject_(code) {
    return jsonResponse_({ ok: false, communityContact: COMMUNITY_CONTACT_VERSION, error: code });
  }

  var name = contactValue_(p.name, 120);
  var email = contactValue_(p.email, 254);
  var description = contactValue_(p.description, 5000);
  var phone = contactValue_(p.phone, 60);
  if (!name || /[\r\n]/.test(name) || !email || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(email) || !description || phone === null) {
    return reject_('missing_or_invalid_fields');
  }
  if (p.gdpr !== 'accepted') return reject_('privacy_not_accepted');

  var language = p.form_language;
  if (typeof language !== 'string' || !/^(hu|en|de)$/.test(language)) return reject_('invalid_form_context');
  var copy = COMMUNITY_CONTACT_COPY[language];
  var page = contactValue_(p.page, 250);
  var privacyVersion = contactValue_(p.privacy_version, 100);
  // Match only first-party localized contact pages. This metadata check is not authentication:
  // the public endpoint and all fields remain callable by an unauthenticated client.
  var origin = page && page.match(/^https:\/\/(?:www\.)?vipach\.at(?=\/)/);
  var route = origin ? page.slice(origin[0].length) : '';
  var contactPath = copy.pathPrefix + '/kapcsolat';
  if ((route !== contactPath + '.html' && route !== contactPath + '/') ||
      !privacyVersion || !/^[A-Za-z0-9._-]+$/.test(privacyVersion)) {
    return reject_('invalid_form_context');
  }

  try {
    var receivedAt = Utilities.formatDate(new Date(), 'Europe/Vienna', 'yyyy.MM.dd. HH:mm:ss');
    var consentText = contactValue_(p.gdpr_acceptance_text, 700);
    var lines = [
      'VIPACH — közösségi kapcsolatfelvétel / Community contact',
      '',
      'Név / Name: ' + name,
      'E-mail: ' + email
    ];
    if (phone) lines.push('Telefon / Phone: ' + phone);
    lines.push('', 'Üzenet / Message:', description, '',
      'Nyelv / Language: ' + language,
      'Forrásoldal / Source page: ' + page,
      'Adatvédelmi verzió / Privacy notice version: ' + privacyVersion,
      'Adatkezelési nyilatkozat / Privacy confirmation: accepted');
    if (consentText) lines.push('Nyilatkozat szövege / Confirmation text: ' + consentText);
    lines.push('Beérkezett / Received (Europe/Vienna): ' + receivedAt);
    MailApp.sendEmail({
      to: CONFIG.RECIPIENT,
      replyTo: email,
      subject: copy.subject,
      body: lines.join('\n'),
      name: 'VIPACH'
    });
  } catch (err) {
    // Do not expose upstream errors or submitted personal data in the public response.
    return reject_('submission_failed');
  }

  var acknowledgmentSent = false;
  if (COMMUNITY_CONTACT_SEND_AUTO_REPLY) {
    try {
      MailApp.sendEmail({
        to: email,
        replyTo: CONFIG.RECIPIENT,
        subject: copy.acknowledgmentSubject,
        body: copy.acknowledgment + '\n\n' + copy.signoff + '\nVIPACH\noffice@vipach.at · https://www.vipach.at/',
        name: 'VIPACH'
      });
      acknowledgmentSent = true;
    } catch (err) {
      // Office notification was accepted; do not prompt the visitor to resend the inquiry.
    }
  }
  return jsonResponse_({ ok: true, communityContact: COMMUNITY_CONTACT_VERSION, acknowledgmentSent: acknowledgmentSent });
}

function contactValue_(value, limit) {
  if (value == null) return '';
  if (typeof value !== 'string') return null;
  var clean = value.trim();
  return clean.length <= limit ? clean : null;
}

/* ───────────────────────── Segédfüggvények ───────────────────────── */

function clean_(v) {
  return (v || '').toString().trim().substring(0, 5000);
}

function inferLanguage_(privacyVersion, page) {
  var raw = ((privacyVersion || '') + ' ' + (page || '')).toString().toLowerCase();
  if (raw.indexOf('/de-at/') !== -1 || raw.indexOf('-de') !== -1) return 'de';
  if (raw.indexOf('/en/') !== -1 || raw.indexOf('-en') !== -1) return 'en';
  return 'hu';
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row_(label, value) {
  if (!value) return '';
  return '<tr>' +
    '<td style="padding:10px 16px;border-bottom:1px solid #E6EDF7;font-size:11px;' +
    'letter-spacing:0.14em;text-transform:uppercase;color:#94763E;white-space:nowrap;' +
    'vertical-align:top;font-family:Arial,sans-serif;">' + esc_(label) + '</td>' +
    '<td style="padding:10px 16px;border-bottom:1px solid #E6EDF7;font-size:14px;' +
    'color:#122A52;line-height:1.6;font-family:Arial,sans-serif;">' +
    esc_(value).replace(/\n/g, '<br>') + '</td></tr>';
}

function buildNotificationHtml_(d) {
  return '' +
  '<div style="background:#F2F6FC;padding:32px 16px;font-family:Arial,sans-serif;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" ' +
      'style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #DDE5F0;' +
      'border-radius:12px;overflow:hidden;width:100%;">' +
      '<tr><td style="padding:28px 32px;border-bottom:2px solid #B8935A;">' +
        '<div style="font-size:20px;color:#122A52;letter-spacing:0.04em;">VIPACH ' +
        '<span style="color:#B8935A;">·</span> for Business</div>' +
        '<div style="font-size:12px;color:#5C6A85;margin-top:6px;">Új ajánlatkérés / kapcsolatfelvétel — business.vipach.at</div>' +
      '</td></tr>' +
      '<tr><td style="padding:8px 16px 24px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">' +
          row_('Név', d.name) +
          row_('Cégnév', d.company) +
          row_('E-mail', d.email) +
          row_('Telefon', d.phone) +
          row_('Online jelenlét', d.online) +
          row_('Működési hely', d.location) +
          row_('Időzítés', d.timeline) +
          row_('Érdeklődés', d.services) +
          row_('Keret', d.budget) +
          row_('Projektleírás', d.description) +
          row_('GDPR', d.gdpr) +
          row_('GDPR elfogadás ideje', d.gdprAcceptedAt) +
          row_('Elfogadott szöveg', d.gdprAcceptanceText) +
          row_('Adatvédelmi verzió', d.privacyVersion) +
          row_('Űrlap nyelve', d.formLanguage) +
          row_('Adatkezelési kontextus', d.processingContext) +
          row_('Beérkezett', d.receivedAt) +
          row_('Forrásoldal', d.page) +
        '</table>' +
      '</td></tr>' +
      '<tr><td style="padding:16px 32px;background:#F2F6FC;font-size:11px;color:#5C6A85;">' +
        'Válaszhoz használja a „Válasz” funkciót — a levél közvetlenül ' + esc_(d.email) + ' címre megy.' +
      '</td></tr>' +
    '</table>' +
  '</div>';
}

function buildNotificationText_(d) {
  var lines = [
    'VIPACH for Business — új ajánlatkérés / kapcsolatfelvétel', '',
    'Név: ' + d.name,
    'Cégnév: ' + d.company,
    'E-mail: ' + d.email,
    'Telefon: ' + d.phone,
    'Online jelenlét: ' + d.online,
    'Működési hely: ' + d.location,
    'Időzítés: ' + d.timeline,
    'Érdeklődés: ' + d.services,
    'Keret: ' + d.budget,
    'Projektleírás: ' + d.description,
    'GDPR: ' + d.gdpr,
    'GDPR elfogadás ideje: ' + d.gdprAcceptedAt,
    'Elfogadott szöveg: ' + d.gdprAcceptanceText,
    'Adatvédelmi verzió: ' + d.privacyVersion,
    'Űrlap nyelve: ' + d.formLanguage,
    'Adatkezelési kontextus: ' + d.processingContext,
    'Beérkezett: ' + d.receivedAt,
    'Forrásoldal: ' + d.page
  ];
  return lines.join('\n');
}

function buildAutoReplySubject_(d) {
  var lang = (d.formLanguage || 'hu').toLowerCase();
  if (lang === 'en') return 'Thank you for your request — VIPACH for Business';
  if (lang === 'de') return 'Vielen Dank für Ihre Anfrage — VIPACH for Business';
  return 'Köszönjük megkeresését — VIPACH for Business';
}

function buildAutoReplyText_(d) {
  var lang = (d.formLanguage || 'hu').toLowerCase();
  if (lang === 'en') {
    return 'Dear ' + d.name + ',\n\nThank you for your request. We have received your message and will contact you with the next step within 48 hours. Please also check your spam or promotions folder.\n\nBest regards,\nVIPACH for Business\noffice@vipach.at · business.vipach.at';
  }
  if (lang === 'de') {
    return 'Sehr geehrte/r ' + d.name + ',\n\nvielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und melden uns innerhalb von 48 Stunden mit dem nächsten Schritt. Bitte prüfen Sie auch Ihren Spam- oder Promotions-Ordner.\n\nMit freundlichen Grüßen\nVIPACH for Business\noffice@vipach.at · business.vipach.at';
  }
  return 'Kedves ' + d.name + '!\n\nKöszönjük megkeresését. Üzenetét megkaptuk, és ajánlattal 48 órán belül megkeressük. Kérjük, ellenőrizze a spam vagy promóciók mappát is.\n\nÜdvözlettel,\nVIPACH for Business\noffice@vipach.at · business.vipach.at';
}

function buildAutoReplyHtml_(d) {
  var lang = (d.formLanguage || 'hu').toLowerCase();
  var greeting = 'Kedves ' + esc_(d.name) + '!';
  var message = 'Köszönjük megkeresését. Üzenetét megkaptuk, és a megadott információk alapján <strong>ajánlattal 48 órán belül megkeressük</strong>. Kérjük, ellenőrizze a spam vagy promóciók mappát is.';
  var closing = 'Üdvözlettel,<br><strong>VIPACH for Business</strong>';
  if (lang === 'en') {
    greeting = 'Dear ' + esc_(d.name) + ',';
    message = 'Thank you for your request. We have received your message and will contact you with the next step <strong>within 48 hours</strong>. Please also check your spam or promotions folder.';
    closing = 'Best regards,<br><strong>VIPACH for Business</strong>';
  } else if (lang === 'de') {
    greeting = 'Sehr geehrte/r ' + esc_(d.name) + ',';
    message = 'Vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und melden uns <strong>innerhalb von 48 Stunden</strong> mit dem nächsten Schritt. Bitte prüfen Sie auch Ihren Spam- oder Promotions-Ordner.';
    closing = 'Mit freundlichen Grüßen<br><strong>VIPACH for Business</strong>';
  }
  return '' +
  '<div style="background:#F2F6FC;padding:32px 16px;font-family:Arial,sans-serif;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" ' +
      'style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DDE5F0;' +
      'border-radius:12px;overflow:hidden;width:100%;">' +
      '<tr><td style="padding:28px 32px;border-bottom:2px solid #B8935A;">' +
        '<div style="font-size:20px;color:#122A52;letter-spacing:0.04em;">VIPACH ' +
        '<span style="color:#B8935A;">·</span> for Business</div>' +
      '</td></tr>' +
      '<tr><td style="padding:28px 32px;font-size:14.5px;color:#122A52;line-height:1.7;">' +
        greeting + '<br><br>' + message + '<br><br>' + closing +
      '</td></tr>' +
      '<tr><td style="padding:16px 32px;background:#F2F6FC;font-size:12px;color:#5C6A85;">' +
        'office@vipach.at · <a href="https://business.vipach.at" style="color:#94763E;">business.vipach.at</a> · Wien' +
      '</td></tr>' +
    '</table>' +
  '</div>';
}

function logToSheet_(d) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var sheet = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Beérkezett', 'Név', 'Cégnév', 'E-mail', 'Telefon', 'Online jelenlét',
                     'Működési hely', 'Időzítés', 'Érdeklődés', 'Keret', 'Projektleírás',
                     'GDPR', 'GDPR elfogadás ideje', 'Elfogadott szöveg', 'Adatvédelmi verzió', 'Űrlap nyelve', 'Forrásoldal']);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([d.receivedAt, d.name, d.company, d.email, d.phone, d.online,
                   d.location, d.timeline, d.services, d.budget, d.description,
                   d.gdpr, d.gdprAcceptedAt, d.gdprAcceptanceText, d.privacyVersion, d.formLanguage, d.page]);
}
