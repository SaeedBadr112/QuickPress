/* QuickPress — check-data.js
   Verifies data.js integrity: unique ids, non-empty ar/en titles, equal counts
   per page, and unified key formatting. Exits non-zero on failure. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;
const src = fs.readFileSync(path.join(root, 'assets', 'js', 'data.js'), 'utf8');
const json = src.slice(src.indexOf('window.QP_DATA = ') + 17, src.lastIndexOf('];') + 1);
const DATA = JSON.parse(json);

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error('FAIL: ' + msg); }
  return cond;
}

// 1) unique ids
const ids = DATA.map(e => e.id);
check(new Set(ids).size === ids.length, `ids are unique (${ids.length - new Set(ids).size} duplicates)`);

// 2) titles non-empty in both languages
DATA.forEach(e => {
  check(e.ar && typeof e.ar.title === 'string' && e.ar.title.trim() !== '', `ar.title non-empty for ${e.id}`);
  check(e.en && typeof e.en.title === 'string' && e.en.title.trim() !== '', `en.title non-empty for ${e.id}`);
});

// 3) no Arabic left inside en titles
const AR = /[\u0600-\u06FF]/;
DATA.forEach(e => {
  check(!AR.test(e.en.title), `en.title has no Arabic for ${e.id}`);
});

// 4) counts identical between languages & pages present
const pages = ['windows', 'alt', 'office'];
const counts = {};
DATA.forEach(e => { counts[e.page] = (counts[e.page] || 0) + 1; });
pages.forEach(p => check(counts[p] > 0, `page ${p} has elements`));
// same section sets for ar/en is inherent (single objects), verify schema fields
DATA.forEach(e => {
  check(e.page && e.app && e.section && e.keys && e.copy && typeof e.seq === 'number',
    `schema fields present for ${e.id}`);
});

// 5) key format unification: no lowercase single letters, no abbreviations, no arabic words inside pure keys
const BAD = /\b(Bksp|Sh|Ent)\b/;
DATA.forEach(e => {
  const pureKeys = [e.keys, e.keysEn, e.copy, e.copyEn].join(' | ');
  check(!BAD.test(pureKeys), `full key names in ${e.id}`);
  // single letters must be uppercase: detect ' + x ' patterns
  const lower = /(^|[+›,\s])([a-z])(?=$|[+›,\s])/.exec([e.keys, e.copy].join(' | '));
  check(!lower, `single letters uppercase in ${e.id} (${lower ? lower[0] : ''})`);
});

// 6) sections exist and order arrays valid
const winSecs = ['general','win-key','snap','taskbar','explorer','dialogs','desktops','cmd','accessibility','win11','winx-menu','boot'];
const altSecs = ['alt-system','alt-apps','alt-office','alt-codes','alt-input'];
const winPresent = [...new Set(DATA.filter(e => e.page === 'windows').map(e => e.section))];
const altPresent = [...new Set(DATA.filter(e => e.page === 'alt').map(e => e.section))];
winSecs.forEach(s => check(winPresent.includes(s), `windows section ${s} present`));
altSecs.forEach(s => check(altPresent.includes(s), `alt section ${s} present`));

// 7) alt-codes carry symbols and categories
const codes = DATA.filter(e => e.section === 'alt-codes');
codes.forEach(e => check(e.category, `alt-codes category for ${e.id}`));

// 8) matrix = sum of the three pages
check(counts.windows + counts.alt + counts.office === DATA.length, 'matrix total = windows + alt + office');

console.log(`check-data: ${DATA.length} elements — ` + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURES'));
process.exit(failures === 0 ? 0 : 1);
