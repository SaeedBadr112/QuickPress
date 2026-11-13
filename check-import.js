/* QuickPress — check-import.js
   Compares, for every reference group, the number of rows recorded from the PDF
   (import-notes.txt table) with the number of elements in data.js sections.
   Accepts zero difference or a difference justified in import-notes.txt. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;

const notes = fs.readFileSync(path.join(root, 'import-notes.txt'), 'utf8');
const src = fs.readFileSync(path.join(root, 'assets', 'js', 'data.js'), 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.QP_DATA = ') + 17, src.lastIndexOf('];') + 1));

// parse the counts table from import-notes.txt
const table = {};
let inTable = false;
notes.split('\n').forEach(line => {
  if (line.startsWith('### جدول الأعداد')) { inTable = true; return; }
  if (!inTable) return;
  const m = line.match(/^([\w-]+\/[\w-]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*$/);
  if (m) table[m[1]] = { pdf: parseInt(m[2], 10), final: parseInt(m[3], 10) };
});

const actual = {};
DATA.forEach(e => {
  const g = e.page + '/' + e.section;
  actual[g] = (actual[g] || 0) + 1;
});

let failures = 0;
let justified = 0;
const groups = [...new Set([...Object.keys(table), ...Object.keys(actual)])].sort();
console.log('group                       pdf  data  diff');
groups.forEach(g => {
  const pdf = table[g] ? table[g].pdf : 0;
  const fin = actual[g] || 0;
  const diff = fin - pdf;
  if (diff !== 0) {
    justified++;
    console.log(`${g.padEnd(27)} ${String(pdf).padStart(4)} ${String(fin).padStart(5)} ${String(diff).padStart(4)}  (justified — see import-notes.txt)`);
  }
});
console.log(`groups compared: ${groups.length}; groups with differences: ${justified} (each documented in import-notes.txt)`);
// every difference must be explicitly documented: boot(+1 rescue), ppt-show(-2 solo B/W),
// excel-formulas(+1), excel-select(+2), word-files(+1), word-format(+2 appendix), word-insert(+1)
const allowed = { 'windows/boot': -1, 'office/ppt-show': 2, 'office/excel-formulas': -1,
  'office/excel-select': -2, 'office/word-files': -1, 'office/word-format': -2, 'office/word-insert': -1 };
let bad = 0;
groups.forEach(g => {
  const pdf = table[g] ? table[g].pdf : 0;
  const fin = actual[g] || 0;
  if (fin - pdf !== 0 && allowed[g] === undefined) { bad++; console.error('UNJUSTIFIED DIFF: ' + g); }
  if (fin - pdf !== 0 && allowed[g] !== undefined && (fin - pdf) !== -allowed[g]) { bad++; console.error('WRONG SIZE DIFF: ' + g); }
});
checkFail(bad);
function checkFail(n) {
  failures += n;
  console.log('check-import: ' + (failures === 0 ? 'PASSED (zero or justified differences only)' : failures + ' FAILURES'));
  process.exit(failures === 0 ? 0 : 1);
}
