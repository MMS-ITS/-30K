/**
 * Verification for index.html — no dependencies, no network.
 *
 * Extracts the calculation script from the single-file app, runs it against a
 * minimal DOM stub seeded with the *real* defaults parsed from the HTML, then
 * asserts the rendered output against the prior documents' published figures.
 *
 *   node test/verify.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];

const store = {};
for (const m of html.matchAll(/<input[^>]*id="(\w+)"[^>]*>/g)) {
  const v = m[0].match(/value="([-\d.]+)"/);
  store[m[1]] = { value: v ? v[1] : '0' };
}
for (const m of html.matchAll(/<select[^>]*id="(\w+)"[^>]*>([\s\S]*?)<\/select>/g)) {
  const s = m[2].match(/value="(\d+)"\s+selected/);
  store[m[1]] = { value: s ? s[1] : '1' };
}
const el = k => {
  if (!store[k]) store[k] = { value: '' };
  const o = store[k];
  return {
    get value()       { return o.value },        set value(v)       { o.value = String(v) },
    get textContent() { return o.text ?? '' },   set textContent(v) { o.text  = String(v) },
    get innerHTML()   { return o.html ?? '' },   set innerHTML(v)   { o.html  = String(v) },
    get className()   { return o.cls  ?? '' },   set className(v)   { o.cls   = String(v) },
    addEventListener() {},
  };
};
globalThis.document = { getElementById: el, querySelectorAll: () => [] };

const ctx = {};
new Function('document', 'ctx', script + '\nctx.calc=calc;ctx.preset=preset;')(globalThis.document, ctx);
const { calc, preset } = ctx;

const T = i => document.getElementById(i).textContent;
const H = i => document.getElementById(i).innerHTML;
const set = o => { for (const [k, v] of Object.entries(o)) document.getElementById(k).value = v; calc(); };
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const optRow = i => H('opt_body').split('<tr').slice(1)[i];
const cells = r => [...r.matchAll(/<td[^>]*>(?:<b>)?([^<]*)/g)].map(x => x[1].trim());

let fail = 0, n = 0;
const ok = (label, cond, extra = '') => {
  n++; if (!cond) fail++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label.padEnd(54)}${extra}`);
};
const head = t => console.log(`\n${t}`);

/* ===== 1. every published figure reproduces ===== */
head('1. All 14 published figures from the prior PDF reproduce');
preset('report');
const verRows = H('ver_body').split('<tr').slice(1);
ok('14 figures audited', verRows.length === 14, `${verRows.length}`);
const differs = verRows.filter(r => /badge b-no/.test(r));
ok('every figure matches', differs.length === 0,
   differs.length ? differs.map(r => strip(r).slice(0, 40)).join(' | ') : 'zero mismatches');
for (const [label, want] of [['k_pi','$1,369'],['k_i12','$14,212'],['k_loan','$210,000'],['k_atc','5.30%']]) {
  ok(`${label} = ${want}`, T(label) === want, T(label));
}

/* ===== 2. escrow reconciliation — the headline finding ===== */
head('2. Escrow reconciliation detects the contradiction');
set({ ptax: 2800, ins: 0 });
ok('implied annual escrow = $7,571', T('e_esc') === '$7,571', T('e_esc'));
ok('gap flagged as unaccounted', /unaccounted for/.test(H('e_note')));
ok('$4,771 implausible-premium row shown', /implausible premium/.test(H('e_body')));
const plausible = (H('e_body').match(/normal TX range/g) || []).length;
ok('plausible-tax resolutions surfaced', plausible >= 3, `${plausible} rows`);
set({ ptax: 5772, ins: 1800 });
ok('reconciles once escrow-implied tax used', /Reconciled/.test(H('e_note')), T('e_gap'));

/* ===== 3. the conclusion actually reverses ===== */
head('3. Resolving the contradiction reverses the report headline');
preset('report');
const profit = cells(H('se_foot'))[2];
ok('report-as-written reproduces +$3,233 profit', profit === '$3,233', profit);
ok('profit path reports the +$711 tax figure', /\+\$711/.test(H('se_notes')) || /\$711/.test(H('se_notes')));
preset('escrow');
const loss = cells(H('se_foot'))[2];
ok('escrow-implied tax yields a loss', /^-\$/.test(loss), loss);
ok('loss is -$1,539 as cross-checked', loss === '-$1,539', loss);
ok('reversal is stated explicitly', /reverses the report's headline/.test(strip(H('se_notes'))));

/* ===== 4. recast-then-overpay (C1) ===== */
head('4. C1 — the option neither document modelled');
preset('report');
const B = cells(optRow(1)), C1 = cells(optRow(2)), C2 = cells(optRow(3));
ok('B lifetime interest = $151,117',  B[3]  === '$151,117', B[3]);
ok('C2 lifetime interest = $242,448', C2[3] === '$242,448', C2[3]);
ok('C1 lifetime interest equals B',   C1[3] === B[3], `C1=${C1[3]} B=${B[3]}`);
ok('C1 required payment = $1,173',    C1[1] === '$1,173', C1[1]);
ok('C1 payoff equals B payoff',       C1[2] === B[2], `${C1[2]} vs ${B[2]}`);
ok('understatement of $91,331 explained', /\$91,331/.test(H('opt_notes')));
ok('6 options present', H('opt_body').split('<tr').slice(1).length === 6);
ok('pre-tax retirement option present', /Pre-tax retirement/.test(H('opt_body')));

/* ===== 5. NPV exactness ===== */
head('5. Prepayment is exactly NPV-neutral at the loan rate');
ok('PV of B is exactly $0', /^-?\$0$/.test(B[4]), `PV_B=${B[4]}`);
ok('PV of C1 is exactly the recast fee', C1[4] === '-$350', `PV_C1=${C1[4]}`);
ok('exactness explained, not hidden', /exact, not rounding/.test(H('opt_notes')));
set({ disc: 4.0 });
ok('PV_B > 0 when discount < loan rate', /^\$[1-9]/.test(cells(optRow(1))[4]), cells(optRow(1))[4]);
set({ disc: 6.8 });

/* ===== 6. depreciation ===== */
head('6. Depreciation follows Table A-6, both years shown');
ok('A-6 month 8 = 1.364% cited', /A-6 month 8 = 1\.364%/.test(H('se_body')));
ok('partial-year note fires for August', /2026 is 5 months/.test(strip(H('se_notes'))));
set({ pism: 1 });
ok('January -> 3.485%', /A-6 month 1 = 3\.485%/.test(H('se_body')));
ok('January -> no partial-year note', !/2026 is/.test(strip(H('se_notes'))));
set({ pism: 8 });
const A6 = [0,3.485,3.182,2.879,2.576,2.273,1.970,1.667,1.364,1.061,0.758,0.455,0.152];
let worst = 0;
for (let m = 1; m <= 12; m++) worst = Math.max(worst, Math.abs(((12-m)+0.5)/12/27.5*100 - A6[m]));
ok('prior app mid-month formula equals A-6', worst < 0.001, `max dev ${worst.toFixed(4)}pp`);

/* ===== 7. §469 ===== */
head('7. Section 469 allowance, phaseout and suspension');
preset('escrow');
for (const [salary, expect] of [[95000, 25000], [120000, 15000], [145000, 2500], [160000, 0]]) {
  set({ salary });
  const m = strip(H('se_notes')).match(/allowance (\$[\d,]+)/);
  ok(`MAGI $${salary.toLocaleString()} -> allowance $${expect.toLocaleString()}`,
     m && m[1] === '$' + expect.toLocaleString(), m ? m[1] : '(none)');
}
set({ salary: 160000 });
ok('full suspension pushes cost of debt to 6.80%', T('k_atc') === '6.80%', T('k_atc'));
ok('suspension consequence spelled out', /more<\/em> attractive/.test(H('se_notes')));
set({ salary: 95000, active: 0 });
ok('failed active participation also suspends', /no active participation/.test(strip(H('se_notes'))));
ok('  and raises cost of debt to 6.80%', T('k_atc') === '6.80%', T('k_atc'));
set({ active: 1 });

/* ===== 8. withdrawn criticisms are recorded ===== */
head('8. Intellectual honesty — withdrawn criticisms are shown, not dropped');
ok('withdrawn section exists', /Criticisms I withdraw/.test(html));
ok('3 withdrawn items', (html.match(/<li class="wd">/g) || []).length === 3,
   `${(html.match(/<li class="wd">/g) || []).length}`);
ok('credits the report on standard deduction', /does not need to itemize/.test(html));
ok('credits the report on stabilized labelling', /stabilized 12-month planning view/.test(html));
ok('credits the report on dual depreciation figures', /\$8,727.*\$3,274|\$3,274/.test(html));

/* ===== 9. document comparison ===== */
head('9. Document-versus-document comparison');
const cmp = H('cmp_body').split('<tr').slice(1);
ok('12 capabilities compared', cmp.length === 12, `${cmp.length}`);
ok('prior app missing insurance input is called out', /no input field/.test(H('cmp_body')));
ok('month-0 vs month-1 divergence noted', /month 0/.test(H('cmp_body')) && /month 1/.test(H('cmp_body')));

/* ===== 10. liquidity + verdict ===== */
head('10. Liquidity gates the verdict');
const verdict = () => (strip(H('v_body')).split('7. Where it lands: ')[1] || '').split(/(?<=\w)\s(?=[A-Z][a-z])/)[0].slice(0, 56);
const seen = new Set();
for (const [label, s] of [
  ['reserves 60k',       { reserves: 60000, retroom: 30000 }],
  ['reserves 150k',      { reserves: 150000 }],
  ['escrow reconciled',  { ptax: 5772, ins: 1800, draft: 2000 }],
  ['no retirement room', { retroom: 0 }],
]) { set(s); seen.add(verdict()); console.log(`  ${label.padEnd(20)} runway=${T('l_runway').padEnd(9)} -> ${verdict()}`); }
ok('at least 3 distinct recommendations reachable', seen.size >= 3, `${seen.size} distinct`);
set({ reserves: 60000 });
ok('thin reserves block the payment', /Do not send the money yet/.test(strip(H('v_body'))));
set({ reserves: 15000 });
ok('payment exceeding reserves caught', /Not feasible as entered/.test(H('l_note')));
set({ reserves: 150000 });
ok('7 verdict sections', (H('v_body').match(/class="box"/g) || []).length === 7);
ok('recapture is priced, not just mentioned', /unrecaptured .1250 exposure/.test(strip(H('v_body'))));

/* ===== 11. structure & print ===== */
head('11. Structure and A4 print fidelity');
ok('11 surviving findings listed',
   (html.match(/<li(?! class="wd")[^>]*>\s*<div class="t">/g) || []).length === 11,
   `${(html.match(/<li(?! class="wd")[^>]*>\s*<div class="t">/g) || []).length}`);
ok('@page A4 portrait',        /@page\{size:A4 portrait/.test(html));
ok('print colour preserved',   /print-color-adjust:exact/.test(html));
ok('break-inside guards',      /break-inside:avoid/.test(html));
ok('explicit page breaks',     /\.pgbreak/.test(html));
ok('controls hidden in print', /\.noprint\{display:none/.test(html));
ok('disclaimer present',       /Not tax, legal or investment advice/.test(html));
ok('sources named',            /one_property_rental_mortgage_tax_verdict\.pdf/.test(html));
ok('single file, no external refs', !/<(script|link)[^>]+(src|href)="http/.test(html));
ok('no placeholder text',      !/TODO|FIXME|Lorem ipsum/.test(html));

console.log(`\n${fail ? `*** ${fail} of ${n} FAILED ***` : `*** ALL ${n} CHECKS PASSED ***`}`);
process.exit(fail ? 1 : 0);
