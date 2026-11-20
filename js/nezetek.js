/* Fonal prototípus – a felület. Egy oldal (betegut.html), a nézetek a cím # utáni részéből jönnek.
   A D irány: két hasáb, oszlopos sorok sorvégi gombokkal, lépéssáv, egy mozdulat 10 másodperces visszavonással. */
(function () {
'use strict';
const BT = window.BT, T = BT.tar, D = BT.d, cfg = BT.cfg;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = id => `<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
const nw = s => `<span class="nw">${esc(s)}</span>`;
const sr = s => `<span class="sr-only">${esc(s)}</span>`;
const attr = (k, v) => v === undefined || v === null || v === false ? '' : ` ${k}="${esc(v === true ? '' : v)}"`;

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.01"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-bed" viewBox="0 0 24 24"><path d="M3 18V6"/><path d="M3 14h18v4"/><path d="M21 14v-1.5A3.5 3.5 0 0 0 17.5 9H11v5"/><circle cx="7" cy="11" r="1.6"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></symbol>
<symbol id="i-sort" viewBox="0 0 24 24"><path d="M7 4v16M3 16l4 4 4-4"/><path d="M14 6h7M14 12h5M14 18h3"/></symbol>
<symbol id="i-inbox" viewBox="0 0 24 24"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M6 4h12l2 9v6H4v-6z"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
<symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></symbol>
<symbol id="i-tag" viewBox="0 0 24 24"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></symbol>
<symbol id="i-out" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></symbol>
<symbol id="i-sub" viewBox="0 0 24 24"><path d="M6 4v7a4 4 0 0 0 4 4h9"/><path d="M15 11l4 4-4 4"/></symbol>
</svg>`;

/* ---------------- A felület állapota (csak ebben a fülben) ---------------- */
const ui = { r: { name: '', args: [], q: {} }, panel: null, f: {}, undo: {}, prompt: null, focus: null, decide: null, conflict: null, edit: null, hist: false, title: 'Fonal', arch: {}, entered: '', cb: null, cbSpec: {}, kids: {}, kidSeq: 0 };
const today = () => T.today();
function parseHash() {
  const h = (location.hash || '#/').replace(/^#\/?/, ''), qi = h.indexOf('?'), path = qi > -1 ? h.slice(0, qi) : h, qs = qi > -1 ? h.slice(qi + 1) : '';
  const q = {}; qs.split('&').filter(Boolean).forEach(kv => { const p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || '', args: parts.slice(1), q };
}
const go = h => { if (location.hash === h) renderAll(); else location.hash = h; };
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('is-on'), 3500); }
function keep() { const k = {}; Object.keys(ui.undo).forEach(key => { k[key] = ui.undo[key]; }); return k; }
/* A visszavonás sora; az „open” (ha van) a most létrejött tétel megnyitása, például a teendőből indult kapcsolt ügyé */
function withUndo(key, label, r, group, open) { if (!r || !r.tx) return; ui.undo[key] = { tx: r.tx, label, until: Date.now() + 10000, group: group || 'working', open: open || null }; ui.focus = 'undo:' + key; }
function undoHtml(key) {
  const u = ui.undo[key]; if (!u) return '';
  const n = Math.max(1, Math.ceil((u.until - Date.now()) / 1000));
  return `<div class="undo"><span>${esc(u.label)}</span>${u.open ? `<a href="${esc(u.open.href)}" data-k="undo-open:${esc(key)}">Megnyitás${sr(': ' + u.open.name)}</a>` : ''}<button type="button" data-act="undo" data-key="${esc(key)}" data-k="undo:${esc(key)}">Visszavonás</button><span aria-hidden="true" class="undo-n" data-undo-n="${esc(key)}">${n}</span></div>`;
}
setInterval(() => {
  const t = Date.now(); let changed = false;
  Object.keys(ui.undo).forEach(k => {
    const n = Math.ceil((ui.undo[k].until - t) / 1000);
    if (n <= 0) { const hadFocus = document.activeElement && document.activeElement.getAttribute('data-k') === 'undo:' + k; delete ui.undo[k]; changed = true; if (hadFocus) ui.focus = 'h1'; }
    else document.querySelectorAll('[data-undo-n="' + CSS.escape(k) + '"]').forEach(e => { e.textContent = n; });
  });
  if (changed) renderMain();
}, 500);

/* ---------------- Közös darabok ---------------- */
const userName = id => T.uname(id);
function ptName(p) { return p ? (p.name || T.patientId(p)) : ''; }
function ptLink(p, cls) {
  if (!p) return '<span class="none">beteg nélkül</span>';
  const acc = T.patientAccess(p.id);
  const label = esc(ptName(p));
  return acc === 'none' ? `<span class="pt">${label}</span>` : `<a class="${cls || 'pt'}" href="#/beteg/${p.id}" data-k="pt:${p.id}">${label}</a>`;
}
function ptIdLine(p) { if (!p) return ''; const adm = T.openAdmission(p.id); return `<span class="taj">${esc(T.patientId(p))}</span>${adm ? ' <span class="tag">' + ico('bed') + 'Fekvő</span>' : ''}`; }
function stateLine(p) {
  const adm = T.openAdmission(p.id);
  if (adm) { const n = D.diff(today(), adm.start); return `Fekvő · ${esc(adm.place)} · ${esc(D.fmt(adm.start, today()))} óta (${n === 0 ? 'ma' : n === 1 ? 'tegnap' : n + ' napja'})`; }
  const g = T.caresOf(p.id).filter(x => !x.ended)[0];
  return 'Járó' + (g ? ' · ' + esc(T.profileName(g.profileId)) : '');
}
function startHref() { return T.startRoute(T.me(), T.mode()); }
/* A legutóbbi fő nézet (ebben a fülben): ide visz vissza a morzsa, és ebből tudjuk, hogy az ügyeletes az ügyeleti listáról jött */
function lastMain() { if (ui.lastMain) return ui.lastMain; const pr = T.state().prefs[T.me()], l = pr && pr.lastBy ? pr.lastBy[T.mode()] : null; return l ? l.replace(/^#\/?/, '').split(/[/?]/)[0] : 'sajat'; }
const dutyCtx = () => !!T.U(T.me()).duty && lastMain() === 'ugyelet';
function crumbBack() {
  const nurse = !T.U(T.me()).doctor, lm = lastMain();
  if (lm === 'ugyelet' && T.U(T.me()).duty) return ['#/ugyelet', 'Ügyeleti lista'];
  if (lm === 'munkalistak') return ['#/munkalistak', 'Munkalisták'];
  if (lm === 'archivum') return ['#/archivum', 'Archívum'];
  return ['#/sajat', nurse ? 'Teendőim' : 'Saját ügyeim'];
}
/* Az ügytípus neve a profil változatából (K4.2); az „MR-…” nevű vizsgálati változat más vizsgálatnál a közös nevet mutatja */
function typeName(c) {
  const t = T.typeOf(c), v = T.variant(c.profileId, c.type), vn = v && v.name;
  if (!vn) return t.name;
  if (c.type === 'vizsgalat' && /^MR/.test(vn) && (c.data.exam || 'MR') !== 'MR') return t.general;
  return vn;
}
/* A megbeszélés rövid neve a sorokban */
const meetWord = c => c.type === 'radio' ? 'konzílium' : c.type === 'd2t' ? 'D2T' : 'megbeszélés';
/* A változat plusz adatai (K4.2): igen/nem, rövid szöveg vagy lista; az ügy adatai között, a fő adatok mellett */
const plusOf = (profileId, type) => ((T.variant(profileId, type) || {}).extra || []);
function fmtDate(iso) { return iso ? D.fmt(iso, today()) : ''; }
/* A saját ügytípus (K4.17) ügyének címe maga az ügytípus neve; a sor és a kártya nem ismétli meg */
const ownTitled = c => !!T.typeOf(c).custom && T.caseTitle(c) === typeName(c);
function kindLine(c) { const t = typeName(c), a = T.areaName(c.areaId); if (ownTitled(c)) return 'Saját ügytípus · ' + a; return t === a ? t : t + ' · ' + a; }

/* ---------------- Kapcsolt ügyek (K4.11; CT, 2026-11-19) ----------------
   Egy fogalom: a teendő az ügyben marad, a kapcsolt ügy a saját áreájában áll. A gyerek sorában (kapcsolt ügy és teendő) a cím fölött,
   kis szürke betűvel, kattinthatóan a kiinduló ügy neve; a kiinduló ügy sorában lenyitható lista („↳ 1 teendő · 2 kapcsolt ügy”).
   Csak az látszik, és csak az számol, amit a néző láthat: a saját profilét és a bent fekvő beteg nyitott ügyét részletesen, a többiből
   orvosként a fejlécet (nem link), nővérként és asszisztensként semmit (K9). */
/* A rövid név: megbeszélésnél a megbeszélés neve és az alkalom, más ügynél a címe */
const shortName = c => T.isMeet(c.type) ? typeName(c) + (c.meeting ? ', ' + fmtDate(c.meeting) : '') : T.caseTitle(c);
/* Csak fejléc (K9.4): közös ügytípus, státusz, dátum, felelős profil */
const hdrParts = c => [T.commonType(c), c.closed ? 'lezárt' : T.catWord[T.cat(c)], fmtDate(c.created.at.slice(0, 10)), T.profileName(c.profileId), 'csak fejléc'];
const hdrText = c => hdrParts(c).join(' · ');
const stateWord = c => c.closed ? 'lezárva: ' + c.closed.reason : T.stepLabel(c);
const lateText = c => T.permitExpired(c) ? D.diff(today(), c.data.expiresOn) + ' napja lejárt' : T.relDue(T.caseDate(c));
const detailAcc = acc => acc === 'write' || acc === 'read';
/* A cím fölötti sor: a kapcsolt ügy sorában a kiinduló ügy, a teendő sorában a teendő ügye. A képernyőolvasó elé: „Kiinduló ügy:” */
function kinHtml(x, acc) {
  if (!x || !acc || acc === 'none') return '';
  return `<span class="kin">${ico('sub')}${detailAcc(acc) ? `<a href="#/ugy/${x.id}">${sr('Kiinduló ügy: ')}${esc(shortName(x))}</a>` : `<span>${sr('Kiinduló ügy: ')}${esc(hdrText(x))}</span>`}</span>`;
}
const originKin = c => { const o = T.originOf(c); return o ? kinHtml(o.c, o.acc) : ''; };
/* Egy kapcsolt ügy alsora: viszony · ügytípus és área · lépés vagy lezárás · felelős */
function linkedSub(o) {
  const x = o.c, parts = [o.word, kindLine(x) + (T.isMember(T.me(), x.profileId) ? '' : ' · ' + T.profileName(x.profileId)), stateWord(x)];
  if (!x.closed) parts.push(x.owners.length ? x.owners.map(userName).join(', ') : 'felelős nélkül');
  return parts.map(esc).join(' · ') + (T.caseLate(x) ? ` · <span class="late">${ico('alert')}${esc(lateText(x))}</span>` : '');
}
/* A lenyitható lista a kiinduló ügy sorában: alapból csukva a munkalistán, nyitva a betegkártyán (a terv 3.3, 3.8). A teendőknél
   a nyitottakat számolja, a kapcsolt ügyeknél mindet, amit a néző láthat; a listában nincs gomb, minden tétel megnyitható.
   A sorokban a lenyitó az alsor végén áll, ha elfér, különben az alsor alatt (a koordinátor kérése: a jelölés egy sorban, amíg elfér);
   a lista a DOM-ban közvetlenül a gomb után jön. A betegkártyán a lenyitó saját sorban áll. */
function kidsHtml(c, key, def) { const k = kidsParts(c, key, def); return k ? k.btn + k.list : ''; }
/* Az alsor a lenyitóval: egy sorban, amíg elfér; utána a lista */
function subWithKids(sub, k) { return k ? `<div class="sub-row"><span class="sub">${sub}</span>${k.btn}</div>` : `<span class="sub">${sub}</span>`; }
function kidsParts(c, key, def) {
  const ts = T.openTasksOf(c), ls = T.linkedOf(c);
  if (!ts.length && !ls.length) return null;
  const open = ui.kids[key] === undefined ? !!def : ui.kids[key], id = 'kids-' + (++ui.kidSeq), p = c.patientId ? T.P(c.patientId) : null;
  const n = []; if (ts.length) n.push(ts.length + ' teendő'); if (ls.length) n.push(ls.length + ' kapcsolt ügy');
  const task = t => `<li><a href="#/ugy/${c.id}?teendo=${t.id}">${esc(t.text)}</a><span class="kid-sub">${t.owner ? esc(userName(t.owner)) : '<strong>felelős nélkül</strong>'}${t.due ? ' · ' + (T.taskLate(t) ? `<span class="late">${ico('alert')}${esc(T.relDue(t.due))}</span>` : esc(fmtDate(t.due))) : ''}</span></li>`;
  const kase = o => o.acc === 'header' ? `<li class="is-hdr"><span class="kid-title">${esc(T.commonType(o.c))}</span><span class="kid-sub">${esc([o.word].concat(hdrParts(o.c).slice(1)).join(' · '))}</span></li>`
    : `<li${o.c.closed ? ' class="is-closed"' : ''}><a href="#/ugy/${o.c.id}">${esc(T.caseTitle(o.c))}</a><span class="kid-sub">${linkedSub(o)}</span></li>`;
  return { btn: `<button class="kids-btn" type="button" aria-expanded="${open}" aria-controls="${id}" data-act="kids" data-key="${esc(key)}" data-def="${def ? 1 : 0}" data-k="kids:${esc(key)}">${ico('sub')}<span class="kids-n">${n.map(esc).join('<span aria-hidden="true"> · </span>' + sr(' és '))}</span>${sr(': ' + T.caseTitle(c) + (p ? ', ' + ptName(p) : ''))}${ico('chev')}</button>`,
    list: `<div class="kids" id="${id}"${open ? '' : ' hidden'}>${ts.length ? `<p class="kids-h" id="${id}-t">Teendők</p><ul class="kids-list" aria-labelledby="${id}-t">${ts.map(task).join('')}</ul>` : ''}${ls.length ? `<p class="kids-h" id="${id}-k">Kapcsolt ügyek</p><ul class="kids-list" aria-labelledby="${id}-k">${ls.map(kase).join('')}</ul>` : ''}</div>` };
}

/* ---------------- Lépések: a szokásos következő lépés közvetlen gomb (K11.9) ---------------- */
const NEXT = {
  engedely: { elok: { label: 'Beküldésre kész', to: 'kesz' }, kesz: { label: 'Beküldve…', prompt: 'sent' }, ogyei: { label: 'OGYÉI-engedély megjött…', prompt: 'ogyei' },
    neakk: { label: 'Beküldve a NEAK-hoz…', prompt: 'sentNeak' }, neak: { label: 'Határozat megjött…', prompt: 'decision' }, erv: { label: 'Hosszabbítás', act: 'renew' } },
  vizsgalat: { eloj: { label: 'Időpontot kértünk', to: 'idop' }, idop: { label: 'Időpont megvan…', prompt: 'appt' }, ert: { label: 'Szülő értesítve…', prompt: 'parent' },
    vizs: { label: 'Elkészült…', prompt: 'examDone' }, lem: { label: 'Lemondva', close: 'lemondva' } },
  radio: { bej: { label: 'Napirendre', to: 'nap' }, nap: { label: 'Megbeszéltük', to: 'dok' }, dok: { label: 'Döntés rögzítése…', act: 'decide' }, ten: { label: 'A teendők', act: 'open' } },
  epi: { bej: { label: 'Napirendre', to: 'nap' }, nap: { label: 'Megbeszéltük', to: 'dok' }, dok: { label: 'Döntés rögzítése…', act: 'decide' }, ten: { label: 'A teendők', act: 'open' } },
  d2t: { atg: { label: 'Napirendre', to: 'nap' }, nap: { label: 'Döntés rögzítése…', act: 'decide' }, eld: { label: 'Lezárás: teljesült', close: 'teljesült' } },
  labor: { ker: { label: 'Kérés elküldve', to: 'var' }, var: { label: 'Az eredmény megjött', to: 'atn' }, atn: { label: 'Lezárás: teljesült', close: 'teljesült' } },
  atadas: { atd: { label: 'Átadó dokumentum készül', to: 'dok' }, dok: { label: 'Elküldve', to: 'elk' }, elk: { label: 'Átadva', to: 'ata' }, ata: { label: 'Utólagos kapcsolatfelvétel…', prompt: 'afterContact' } },
  altalanos: { nyit: { label: 'Kész', close: 'teljesült' }, foly: { label: 'Kész', close: 'teljesült' } }
};
function nextOf(c) {
  if (T.typeOf(c).custom) return customNext(c);
  const nx = NEXT[c.type] || (T.flowOf(c.type) === 'd2t' ? NEXT.d2t : T.flowOf(c.type) === 'konz' ? NEXT.radio : null);
  const n = (nx || {})[c.step]; if (!n) return null;
  if (c.type === 'engedely' && c.step === 'erv' && T.renewalOf(c.id)) return null;
  return n;
}
/* A saját ügytípusnál a szokásos következő lépés a sorrend szerinti következő; az utolsó után a lezárás (okkal, K4.6) */
function customNext(c) {
  const t = T.typeOf(c), i = t.steps.findIndex(s => s.id === c.step);
  if (i > -1 && i < t.steps.length - 1) { const s = t.steps[i + 1]; return { label: cap(T.stepLabel(c, s.id)), to: s.id }; }
  if (t.closeSteps.length) { const s = t.closeSteps[0]; return { label: cap(T.stepLabel(c, s.id)) + '…', prompt: 'closeStep', step: s.id }; }
  return { label: 'Lezárás: teljesült', close: 'teljesült' };
}
function menuSteps(c) {
  return T.typeOf(c).steps.filter(s => !(s.offLabelOnly && c.data.offLabel === false));
}
/* A sor vagy az ügy műveletei; size: 'sm' a sorokban, 'lg' a kártyán és az ügy nézetében */
function caseActions(c, key, size) {
  if (ui.undo[key]) return undoHtml(key);
  if (c.closed) return '';
  const sm = size === 'sm', b = sm ? 'btn-sm' : 'btn btn-secondary', q = sm ? 'btn-sm btn-icon' : 'btn btn-quiet';
  const n = nextOf(c), nm = sr(': ' + T.caseTitle(c) + (c.patientId ? ', ' + ptName(T.P(c.patientId)) : ''));
  let h = '';
  if (n) h += `<button class="${b}" type="button" data-act="next" data-id="${c.id}" data-key="${esc(key)}" data-k="act:${esc(key)}">${esc(n.label)}${nm}</button>`;
  const steps = menuSteps(c).map(s => s.id === c.step
    ? `<li><button type="button" aria-current="step" disabled>${esc(T.stepLabel(c, s.id))} (most)</button></li>`
    : `<li><button type="button" data-act="step" data-id="${c.id}" data-to="${s.id}" data-key="${esc(key)}">${esc(T.stepLabel(c, s.id))}</button></li>`).join('')
    /* A saját ügytípus „lezárt” kategóriájú lépése a lezárás okát kéri */
    + (T.typeOf(c).closeSteps || []).map(s => `<li><button type="button" data-act="close-step" data-id="${c.id}" data-step="${s.id}" data-key="${esc(key)}">${esc(T.stepLabel(c, s.id))}…</button></li>`).join('');
  const reasons = T.typeOf(c).reasons.map(r => `<li><button type="button" data-act="close" data-id="${c.id}" data-reason="${esc(r)}" data-key="${esc(key)}">${esc(r)}</button></li>`).join('');
  h += `<details class="menu"><summary class="${q}"${n ? '' : ` data-k="act:${esc(key)}"`}>${sm ? ico('chev') + sr('Más lépés' + (': ' + T.caseTitle(c))) : 'Más lépés' + ico('chev')}</summary>
    <ul class="menu-list${sm ? '' : ' left'}"><li class="mhead" aria-hidden="true">Lépés</li>${steps}<li class="sep" aria-hidden="true"></li><li class="mhead" aria-hidden="true">Lezárás okkal</li>${reasons}</ul></details>`;
  return sm ? `<div class="act-pair">${h}</div>` : h;
}
/* A dátumot vagy kapcsolatfelvételt kérő lépés kis űrlapja, a sor alatt */
function promptHtml(c, key) {
  const p = ui.prompt; if (!p || p.key !== key) return '';
  const f = ui.f, k = p.kind;
  const date = (name, label, def) => { if (f[name] === undefined) f[name] = def || today(); return `<div class="field"><label class="field-label" for="pr-${name}">${label}</label><input class="text-input date" type="date" id="pr-${name}" data-f="${name}" data-k="pr-${name}"></div>`; };
  const text = (name, label, hint) => `<div class="field"><label class="field-label" for="pr-${name}">${label}${hint ? ' <span class="opt">' + hint + '</span>' : ''}</label><input class="text-input" type="text" id="pr-${name}" data-f="${name}" data-k="pr-${name}" autocomplete="off"></div>`;
  const chips = (name, legend, opts, def) => { if (f[name] === undefined) f[name] = def; return `<fieldset class="field"><legend>${legend}</legend><div class="chips">${opts.map(o => `<label class="chip"><input type="radio" name="pr-${name}" value="${esc(o)}" data-f="${name}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`; };
  let body = '';
  if (k === 'sent' || k === 'sentNeak') body = date('d1', k === 'sent' ? (c.data.offLabel === false ? 'A NEAK-hoz beküldés napja' : 'Az OGYÉI-hez beküldés napja') : 'A NEAK-hoz beküldés napja');
  else if (k === 'ogyei') body = date('d1', 'Az OGYÉI-engedély napja');
  else if (k === 'decision') body = date('d1', 'A határozat napja') + date('d2', 'Érvényes eddig', '') + `<label class="check"><input type="checkbox" data-f="attachDecision"${f.attachDecision === undefined ? (f.attachDecision = true, '') : ''}><span>A határozatot csatolom (kitalált fájl)</span></label>`;
  else if (k === 'appt') body = date('d1', 'A vizsgálat napja', '');
  else if (k === 'examDone') body = text('his', 'HIS-hivatkozás a leletre', '(nem kötelező)');
  else if (k === 'parent' || k === 'afterContact' || k === 'contact') {
    body = chips('whom', 'Kit?', cfg.whom, k === 'parent' ? 'szülő' : 'fogadó csapat') + chips('how', 'Hogyan?', cfg.how, k === 'afterContact' ? 'levél' : 'telefon') + text('cnote', 'Megjegyzés', '(nem kötelező)');
    if (k === 'contact' && c.type === 'atadas') body += `<label class="check"><input type="checkbox" data-f="after"><span>Az átadás utáni kapcsolatfelvétel</span></label>`;
  }
  else if (k === 'closeStep') {
    /* A lezárás oka kötelező, és nincs előre kiválasztva (K4.6) */
    const e = f._eReason;
    body = `<fieldset class="field"${e ? ' aria-describedby="pr-reason-err"' : ''}><legend>Miért zárul le?</legend><div class="chips">${T.typeOf(c).reasons.map((o, i) => `<label class="chip"><input type="radio" name="pr-reason" value="${esc(o)}" data-f="reason"${i === 0 ? ' data-k="pr-reason-first"' : ''}><span>${esc(o)}</span></label>`).join('')}</div>${e ? `<p class="err" id="pr-reason-err" role="alert">${ico('alert')}<span>${esc(e)}</span></p>` : ''}</fieldset>`;
  }
  const title = { sent: 'Beküldve', sentNeak: 'Beküldve a NEAK-hoz', ogyei: 'Megjött az OGYÉI-engedély', decision: 'Megjött a NEAK-határozat', appt: 'Megvan az időpont', examDone: 'A vizsgálat elkészült',
    parent: 'A szülő értesítése', afterContact: 'Utólagos kapcsolatfelvétel', contact: 'Kapcsolatfelvétel rögzítése', closeStep: 'Lezárás: ' + (p.step ? T.stepLabel(c, p.step) : '') }[k];
  return `<form class="inline-form prompt" data-form="prompt" data-id="${c.id}" data-key="${esc(key)}" aria-label="${esc(title)}">
    ${body}<div class="form-actions" style="margin-top:0"><button class="btn-sm btn-fill" type="submit" data-k="pr-save">${k === 'closeStep' ? 'Lezárom' : 'Mentés'}</button><button class="btn-sm" type="button" data-act="prompt-cancel">Mégse</button></div></form>`;
}

/* ---------------- Sorok (a D oszlopos sorai) ---------------- */
function dueCell(it) {
  const c = it.c;
  if (it.kind === 'task') {
    const t = it.t;
    if (!t.due) return `${sr('Határidő: ')}<span class="main">nincs határidő</span>`;
    return `${sr('Határidő: ')}<span class="main">${it.late ? ico('alert') : ''}${esc(T.relDue(t.due))}</span>${T.relDue(t.due) === fmtDate(t.due) ? '' : `<span class="sub">${esc(fmtDate(t.due))}</span>`}`;
  }
  if (T.permitExpired(c)) { const n = D.diff(today(), c.data.expiresOn); return `${sr('Lejárt: ')}<span class="main">${ico('alert')}${n} napja lejárt</span><span class="sub">${esc(fmtDate(c.data.expiresOn))}</span>`; }
  if (T.cat(c) === 'V' && !c.closed) {
    const w = (T.stepDef(c) || {}).wait;
    const kire = c.type === 'atadas' ? (c.data.institution || 'fogadó intézmény').split(',')[0] : c.step === 'vizs' && c.data.appointment ? 'vizsgálat: ' + fmtDate(c.data.appointment) : w;
    return `${sr('Várakozik: ')}<span class="main">${ico('clock')}${esc(T.waitLen(c.waitSince || today()))}</span><span class="sub">${esc(kire)} · ${esc(fmtDate(c.waitSince || today()))} óta</span>`;
  }
  const dt = T.caseDate(c);
  if (c.meeting && dt === c.meeting && c.meeting === today()) return `${sr('Határidő: ')}<span class="main">ma, ${meetWord(c)}</span><span class="sub">${c.due ? 'határidő: ' + esc(fmtDate(c.due)) : esc(fmtDate(c.meeting))}</span>`;
  if (c.meeting && !c.due && dt === c.meeting) return `${sr('Alkalom: ')}<span class="main">${it.late ? ico('alert') : ''}${esc(T.relDue(c.meeting))}</span><span class="sub">${meetWord(c)}: ${esc(fmtDate(c.meeting))}</span>`;
  /* A megbeszélés után (dokumentálandó, teendők) az elmúlt alkalom nem határidő, és nem késés */
  if (c.meeting && !c.due) return `${sr('Határidő: ')}<span class="main">nincs határidő</span><span class="sub">${meetWord(c)}: ${esc(fmtDate(c.meeting))}</span>`;
  if (!dt) return `${sr('Határidő: ')}<span class="main">nincs határidő</span>`;
  const lbl = c.type === 'vizsgalat' && !c.data.appointment ? 'időablak vége' : c.type === 'vizsgalat' ? 'időpont' : c.type === 'labor' ? 'várható eredmény' : c.type === 'engedely' && c.step === 'erv' ? 'lejár' : '';
  const rel = T.relDue(dt), abs = fmtDate(dt), same = rel === abs;
  return `${sr('Határidő: ')}<span class="main">${it.late ? ico('alert') : ''}${esc(rel)}</span><span class="sub">${esc(lbl)}${lbl && !same ? ': ' : ''}${same ? '' : esc(abs)}</span>`;
}
function whatSub(it) {
  const c = it.c;
  if (it.kind === 'task') {
    /* A teendő ügye a cím fölött áll (kinHtml); az alsorban a teendő maga: ki viszi, ki adta (K4.11) */
    const t = it.t, parts = ['Teendő'], hdr = c && T.caseAccess(c) === 'header';
    if (t.note) parts.push('„' + esc(t.note) + '”');
    if (c && !hdr && !T.isMember(T.me(), c.profileId)) parts.push(esc(T.profileName(c.profileId)));
    if (t.owner && t.owner !== T.me() && !it.deputyOf) parts.push('felelős: ' + nw(userName(t.owner)));
    if (t.created && t.created.by !== T.me() && t.created.by !== t.owner) parts.push('adta: ' + nw(userName(t.created.by)));
    if (!t.owner) parts.push('<strong>felelős nélkül</strong>');
    /* A jelölés a teendőn; a visszavonás 10 másodpercében a visszavonás sora mondja ki, ezért ott nem ismétlődik */
    const sp = t.spawned && !ui.undo[it.key] ? T.Cs(t.spawned) : null;
    if (sp && detailAcc(T.caseAccess(sp))) parts.push((t.done ? 'kapcsolt ügy lett belőle: ' : 'kapcsolt ügy indult belőle: ') + `<a href="#/ugy/${sp.id}">${esc(T.caseTitle(sp))}</a>`);
    return parts.join(' · ');
  }
  const parts = [esc(typeName(c)), c.closed ? 'lezárva: ' + esc(c.closed.reason) : esc(T.stepLabel(c))];
  if (ownTitled(c)) parts.shift();
  if (!T.isMember(T.me(), c.profileId)) parts.push(esc(T.profileName(c.profileId)));
  if (c.owners.length > 1) parts.push('felelős: ' + c.owners.map(o => nw(userName(o))).join(', '));
  else if (c.owners.length === 1 && c.owners[0] !== T.me() && !it.deputyOf) parts.push('felelős: ' + nw(userName(c.owners[0])));
  if (!c.owners.length) parts.push('<strong>felelős nélkül</strong>');
  const miss = T.missingFields(c); if (miss.length && !c.closed && T.flowOf(c.type) === 'konz') parts.push('hiányzik: ' + esc(miss.join(', ')));
  const h = c.history[c.history.length - 1];
  if (h && h.by !== T.me() && h.by !== 'rendszer' && /^Lépés/.test(h.text) && D.diff(today(), h.at.slice(0, 10)) <= 1) parts.push('léptette: ' + nw(userName(h.by)) + ', ' + esc(T.relAt(h.at)));
  return parts.join(' · ');
}
function rowHtml(it, opts) {
  opts = opts || {};
  const c = it.c, p = c && c.patientId ? T.P(c.patientId) : null, key = it.key;
  const closed = it.kind === 'task' ? !!it.t.done : !!(c && c.closed);
  const title = it.kind === 'task' ? it.t.text : T.caseTitle(c);
  const href = c ? '#/ugy/' + c.id : '#';
  let act;
  if (ui.undo[key]) act = undoHtml(key);
  else if (it.kind === 'task' && T.taskAccess(it.t) !== 'write') act = `<span class="muted">csak olvasható</span>`;
  else if (it.kind !== 'task' && T.caseAccess(c) !== 'write') act = `<span class="muted">csak olvasható</span>`;
  else if (it.kind === 'task') act = taskActions(it.t, key, title, p);
  else act = caseActions(c, key, 'sm');
  const dep = it.deputyOf ? `<span class="deputy">helyettesként, ${esc(userName(it.deputyOf))} helyett</span>` : '';
  /* A cím fölött a teendő ügye, illetve a kapcsolt ügy kiinduló ügye; a kiinduló ügy sorában a lenyitható lista, alapból csukva */
  const kin = it.kind === 'task' ? (c ? kinHtml(c, T.caseAccess(c)) : '') : originKin(c), k = it.kind === 'case' ? kidsParts(c, key, false) : null;
  return `<li class="row${it.late && !closed ? ' is-late' : ''}${closed ? ' is-done' : ''}">
    <div class="cell-due">${dueCell(it)}</div>
    <div class="cell-pt">${sr('Beteg: ')}${ptLink(p)}${p ? `<span class="pt-id">${ptIdLine(p)}</span>` : ''}</div>
    <div class="cell-what">${kin}<a class="what-title" href="${href}">${esc(title)}</a>${subWithKids(whatSub(it), k)}${k ? k.list : ''}${dep}</div>
    <div class="cell-act">${act}</div>
    ${c && !opts.noPrompt ? promptHtml(c, key) : ''}${it.kind === 'task' ? spawnPanel(it.t, key) : ''}
  </li>`;
}
/* A teendő sorában a „Kész” az egyetlen látható gomb; mellette a menüben a „Kapcsolt ügy indítása ebből a teendőből…” (a terv 3.4) */
function taskActions(t, key, title, p) {
  const done = `<button class="btn-sm" type="button" data-act="task-done" data-id="${t.id}" data-key="${esc(key)}" data-k="act:${esc(key)}">${ico('check')}Kész${sr(': ' + title + (p ? ', ' + ptName(p) : ''))}</button>`;
  if (t.spawned) return `<div class="act-pair">${done}</div>`;
  return `<div class="act-pair">${done}<details class="menu"><summary class="btn-sm btn-icon" data-k="tmenu:${esc(key)}">${ico('chev')}${sr('A teendő menüje: ' + title)}</summary>
    <ul class="menu-list"><li><button type="button" data-act="spawn-open" data-id="${t.id}" data-key="${esc(key)}">Kapcsolt ügy indítása ebből a teendőből…</button></li></ul></details></div>`;
}
function rowsBlock(id, title, items, opts) {
  opts = opts || {};
  const head = `<div class="group-head"><h2 class="group-title" id="${id}">${esc(title)} <span class="count">${items.length}</span></h2>${opts.sort ? `<span class="sort">${ico('sort')}${esc(opts.sort)}</span>` : ''}</div>`;
  if (!items.length) return `<section class="group" aria-labelledby="${id}">${head}<p class="empty">${opts.empty || 'Most nincs ilyen tétel.'}</p></section>`;
  const cols = opts.cols || ['Határidő', 'Beteg', 'Teendő vagy ügy', ''];
  return `<section class="group" aria-labelledby="${id}">${head}${opts.note ? `<p class="group-note">${opts.note}</p>` : ''}
    <div class="cols" aria-hidden="true">${cols.map(x => '<span>' + esc(x) + '</span>').join('')}</div>
    <ul class="rows">${items.map(it => rowHtml(it, opts)).join('')}</ul></section>`;
}

/* ---------------- Ügyeleti tételek (K8) ---------------- */
function whereLine(y) {
  const p = y.patientId ? T.P(y.patientId) : null, adm = p ? T.openAdmission(p.id) : null;
  if (adm) { const n = D.diff(today(), adm.start); return `${esc(adm.place)} · fekvő, ${n === 0 ? 'ma óta' : n === 1 ? 'tegnap óta' : n + ' napja'} (${esc(fmtDate(adm.start))} óta)`; }
  return `${esc(T.profileName(y.profileId))}, ${esc(cfg.departments[cfg.profiles[y.profileId].dept].name)}${p ? ' · járó' : ''}`;
}
function dutyItemHtml(y, ctx) {
  const key = 'duty:' + y.id, p = y.patientId ? T.P(y.patientId) : null, late = T.dutyLate(y);
  const fromDuty = y.dir === 'from';
  const when = !y.due ? `${ico('clock')}Mikorra: nincs határidő` : late ? `${ico('alert')}${esc(T.lateBy(y.due))} · mikorra: ${esc(T.relAt(y.due))}` : `${ico('clock')}Mikorra: ${esc(T.relAt(y.due))}`;
  const mark = fromDuty ? `<p class="mark">${ico('inbox')}Az ügyelet hagyta · ${esc(userName(y.by))}, ${esc(T.relAt(y.at))}</p>` : '';
  let acts = '';
  if (ui.undo[key]) acts = undoHtml(key);
  else if (!y.closed) {
    acts = y.accepted
      ? `<button class="btn-sm btn-fill" type="button" data-act="duty-close" data-id="${y.id}" data-k="act:${key}">${ico('check')}Lezárás${sr(': ' + y.text)}</button>`
      : `<button class="btn-sm btn-fill" type="button" data-act="duty-accept" data-id="${y.id}" data-k="act:${key}">Átveszem${sr(': ' + y.text)}</button>`;
  }
  if (p && T.patientAccess(p.id) !== 'none') acts += `<a class="btn-sm" href="#/beteg/${p.id}" data-k="card:${key}">Betegkártya${sr(': ' + ptName(p))}</a>`;
  const status = y.accepted ? `<p class="ditem-status">Átvette: <strong>${esc(userName(y.accepted.by))}</strong>, ${esc(T.relAt(y.accepted.at))}${y.closed ? ' · lezárta: <strong>' + esc(userName(y.closed.by)) + '</strong>, ' + esc(T.relAt(y.closed.at)) : ''}</p>` : '';
  const noteField = y.accepted && !y.closed && !ui.undo[key]
    ? `<div class="ditem-note"><label class="sr-only" for="dn-${y.id}">Rövid megjegyzés a tételhez</label><input class="text-input" id="dn-${y.id}" type="text" maxlength="160" placeholder="Rövid megjegyzés (nem kötelező)" data-f="dn-${y.id}" data-k="dn-${y.id}" autocomplete="off"></div>` : '';
  const note = y.note ? `<p class="quote">„${esc(y.note)}”</p>` : '';
  return `<li class="ditem${late ? ' is-late' : ''}${y.closed ? ' is-done' : ''}">
    <div>
      ${mark}<p class="ditem-when">${when}</p>
      <p class="ditem-what">„${esc(y.text)}”</p>
      <dl class="dl">
        <dt>Kiről</dt><dd>${p ? ptLink(p) + ', <span class="taj">' + esc(T.patientId(p)) + '</span>' : '<span class="empty-val">beteg nélkül</span>'}</dd>
        <dt>Hol</dt><dd>${whereLine(y)}</dd>
        ${fromDuty ? `<dt>Kinek</dt><dd>${esc(T.profileName(y.profileId))} (az osztály, nem egy név)</dd>` : `<dt>Kitől</dt><dd>${esc(userName(y.by))}, ${esc(T.relAt(y.at))}</dd>`}
      </dl>
      ${status}${note}${noteField}
    </div>
    <div class="ditem-acts">${acts}</div>
  </li>`;
}
/* Kis alak: a kiutaló látja, mi lett vele (K8.6, K8.10) */
function dutyFlow(y) {
  const t = x => `<time>${esc(D.hm(x))}</time>`;
  const day = x => D.diff(today(), x.slice(0, 10)) === 0 ? '' : ' (' + T.relDay(x.slice(0, 10)) + ')';
  const li = [`<li>${ico(y.dir === 'from' ? 'inbox' : 'send')}${t(y.at)}<span>${y.dir === 'from' ? 'hagyta: ' + nw(userName(y.by)) : 'kiutalva'}${day(y.at)}${y.due ? ', mikorra: ' + esc(T.relAt(y.due)) : ''}</span></li>`];
  if (y.accepted) li.push(`<li>${ico('check')}${t(y.accepted.at)}<span>átvette: ${nw(userName(y.accepted.by))}${day(y.accepted.at)}</span></li>`);
  if (y.closed) li.push(`<li>${ico('check')}${t(y.closed.at)}<span class="done">lezárva${day(y.closed.at)}</span></li>`);
  else if (!y.accepted) li.push(`<li>${ico('clock')}<span></span><span>${T.dutyLate(y) ? '<strong class="late">lejárt, még senki nem vette át</strong>' : 'átvételre vár'}</span></li>`);
  return `<ol class="flow" aria-label="Mi lett vele">${li.join('')}</ol>${y.note ? `<p class="quote">„${esc(y.note)}”</p>` : ''}`;
}

/* ---------------- Fejléc ---------------- */
function navItems() {
  const md = T.mode(), uid = T.me(), u = T.U(uid), cur = ui.r.name, out = [];
  /* A Beállítások a profil adminjának (az osztályvezető és a vezetőség alapból admin, K9.12) és a fő adminnak */
  const admin = T.adminProfiles(uid).length > 0, pend = admin || u.mainAdmin ? T.pendingFor(uid).n : 0;
  if (u.mainAdmin) out.push(['#/beallitasok', 'Beállítások', 'beallitasok']);
  else if (!T.isActive(uid)) { /* jóváhagyásig nincs menü (K9.13) */ }
  else if (md === 'leader') { out.push(['#/osszesito', 'Összesítő', 'osszesito']); if (admin) out.push(['#/beallitasok', 'Beállítások', 'beallitasok']); }
  else {
    out.push(['#/sajat', u.doctor ? 'Saját ügyeim' : 'Teendőim', 'sajat']);
    if (u.duty) out.push(['#/ugyelet', 'Ügyeleti lista', 'ugyelet']);
    out.push(['#/munkalistak', 'Munkalisták', 'munkalistak'], ['#/archivum', 'Archívum', 'archivum']);
    if (T.seesSummary(uid)) out.push(['#/osszesito', 'Összesítő', 'osszesito']);
    if (admin) out.push(['#/beallitasok', 'Beállítások', 'beallitasok']);
  }
  /* A függő regisztrációk száma a „Beállítások” mellett; addig látszik, amíg van függő kérés */
  return out.map(n => `<a href="${n[0]}"${n[2] === cur ? ' aria-current="page"' : ''}>${esc(n[1])}${n[2] === 'beallitasok' && pend ? `<span class="nav-n" aria-hidden="true">${pend}</span>${sr(', ' + pend + ' regisztráció vár jóváhagyásra')}` : ''}</a>`).join('');
}
/* A kezdőképernyőn egyetlen összevont sor a függő regisztrációkról; nem tüntethető el, mert teendő, és nem a csengős emlékeztetősáv (a felület 1. részének bírálata, 1. pont) */
function pendingLine() {
  const uid = T.me(), P = T.pendingFor(uid); if (!P.n) return '';
  const href = '#/beallitasok' + (P.prof && T.adminProfiles(uid).length > 1 ? '?profil=' + P.prof : '');
  return `<p class="note-line pending-line">${ico('user')}<a href="${href}" data-k="pending-link">${P.n} regisztráció vár jóváhagyásra</a></p>`;
}
function roleText(uid, md) {
  const u = T.U(uid);
  if (u.mainAdmin) return 'Fő admin · a klinika';
  if (!T.isActive(uid)) return u.removed ? 'Nem tartozik profilhoz' : u.status === 'rejected' ? 'Regisztráció: nem hagyták jóvá' : 'Regisztráció: jóváhagyásra vár';
  if (md === 'leader') return cap(u.leader.role) + (u.leader.scope === 'klinika' ? ' · a klinika' : ' · ' + cfg.departments[u.leader.scope].name);
  return T.profileName(u.profile) + ' · ' + u.role + (u.duty ? ' · a klinikai ügyelet tagja' : '');
}
function roleSwitch(uid, md) {
  const modes = T.modesOf(uid); if (modes.length < 2) return `<span class="role">${esc(roleText(uid, md))}</span>`;
  const u = T.U(uid), lbl = { work: cap(u.role), leader: cap(u.leader ? u.leader.role : 'Vezető') };
  return `<div class="roleswitch" role="group" aria-label="Szerepváltás; most: ${esc(lbl[md])}">${modes.map(m => `<button type="button" aria-pressed="${m === md}" data-act="mode" data-mode="${m}" title="${esc(roleText(uid, m))}">${esc(lbl[m])}</button>`).join('')}</div>`;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
/* Kijelentkezve csak a regisztráció nyílik meg (K9.13). A belépőlapon és itt a klinika logója jobbra áll; bent a fejlécben a jele a Fonal név mellett (CT kérése, 2026-11-19) */
function anonHeader() {
  return `<a class="skip" href="#tartalom" data-act="skip">Ugrás a tartalomra</a>
  <header class="top"><div class="top-in"><a class="brand" href="index.html">Fonal</a><img class="clinic-logo" src="kep/semmelweis-gyermekklinika-logo.png" width="121" height="40" alt="Semmelweis Gyermekklinika"></div></header>`;
}
const headerSig = () => { const uid = T.me(); return uid ? [uid, T.mode(), T.U(uid).status || '', T.isActive(uid), T.adminProfiles(uid).join(','), T.pendingFor(uid).n].join('|') : ''; };
function header() {
  const uid = T.me(), md = T.mode(), u = T.U(uid);
  ui.hdrSig = headerSig();
  const nav = navItems();
  /* A kereső a profilban dolgozóé; a jóváhagyásra váró fiók, a vezetői szerep és a fő admin nem keres beteget */
  const search = md === 'leader' || !u.profile ? '' : `<div class="search" role="search">
      <label class="sr-only" for="kereso">Beteg keresése név vagy TAJ szerint</label>${ico('search')}
      <input id="kereso" type="search" placeholder="Beteg keresése: név vagy TAJ" autocomplete="off" spellcheck="false" aria-controls="talalatok" aria-describedby="kereso-allapot">
      <ul id="talalatok" class="hits" hidden></ul><p id="kereso-allapot" class="sr-only" aria-live="polite"></p></div>`;
  return `<a class="skip" href="#tartalom" data-act="skip">Ugrás a tartalomra</a>
  <header class="top"><div class="top-in">
    <a class="brand" href="${esc(startHref())}"><img class="brand-mark" src="kep/semmelweis-gyermekklinika-jel.png" width="18" height="28" alt="Semmelweis Gyermekklinika">Fonal</a>
    ${nav ? `<nav class="nav" aria-label="Nézetek">${nav}</nav>` : ''}
    ${search}
    <div class="who"><div class="who-line"><span class="user">${esc(u.name)}</span> <button class="link-btn" type="button" data-act="switch-user">Felhasználóváltás</button></div>
      ${roleSwitch(uid, md)}</div>
  </div></header>`;
}
function renderSearch() {
  const input = document.getElementById('kereso'); if (!input) return;
  const box = document.getElementById('talalatok'), live = document.getElementById('kereso-allapot'), q = input.value.trim();
  if (!q) { box.hidden = true; box.innerHTML = ''; live.textContent = ''; return; }
  const hits = T.searchPatients(q).slice(0, 8);
  const canAdd = T.mode() !== 'leader' && T.U(T.me()).profile;
  box.innerHTML = hits.length ? hits.map(p => {
    const acc = T.patientAccess(p.id), g = T.caresOf(p.id).filter(x => !x.ended).map(x => T.profileName(x.profileId)).join(', ');
    return `<li><a class="hit" href="#/beteg/${p.id}"><span class="hit-name">${esc(p.name || 'név nélkül')}</span><span class="hit-id">${esc(T.patientId(p))}</span><span class="hit-meta">${T.openAdmission(p.id) ? 'Fekvő' : 'Járó'} · ${esc(g)}${acc === 'other' ? ' · más profil betege' : ''}${p.temp && !p.taj ? ' · TAJ még nincs' : ''}</span></a></li>`;
  }).join('') : `<li class="hits-empty">Nincs ilyen beteg${T.U(T.me()).doctor ? '' : ' a profilodban'}.${canAdd ? ` <a href="#/uj-beteg?q=${encodeURIComponent(q)}">Új beteg felvétele</a>` : ''}</li>`;
  box.hidden = false; live.textContent = hits.length ? hits.length + ' találat' : 'Nincs találat';
}

/* ---------------- Nézet: Saját ügyeim / Teendőim (K6.2, K11.7) ---------------- */
function lede(L) {
  const late = L.working.filter(i => i.late && !(ui.undo[i.key])).length, due = L.working.filter(i => !i.late && i.date === today()).length;
  const parts = [];
  if (late) parts.push(late + ' tétel késik'); if (due) parts.push(due + ' mára esedékes');
  if (!parts.length) parts.push(L.working.length ? 'nincs késés' : 'Mára nincs teendőd');
  return esc(D.long(today())) + ' · ' + parts.join(', ');
}
function reminderHtml(r) {
  const c = T.Cs(r.caseId), p = c && c.patientId ? T.P(c.patientId) : null, kind = r.key.split(':')[0], d = c.data;
  let text = '';
  if (kind === 'engedely') { const n = D.diff(d.expiresOn, today()), w = Math.round(n / 7); text = `${ptLink(p)} <span class="taj">${esc(T.patientId(p))}</span> ${esc(d.drug || '')}-engedélye ${esc(fmtDate(d.expiresOn))} ${n < 0 ? 'lejárt, és nem indult hosszabbítás' : 'lejár (' + (n === 0 ? 'ma' : w >= 1 ? w + ' hét múlva' : n + ' nap múlva') + ')'}.`; }
  else if (kind === 'vizsgalat') text = `${ptLink(p)} <span class="taj">${esc(T.patientId(p))}</span> vizsgálatának (${esc(T.caseTitle(c))}) időablaka ${esc(fmtDate(d.to))} lezárul, és még nincs időpont.`;
  else if (kind === 'radio') { const dl = T.meetingDeadline(c.type, c.meeting), past = D.mins(T.now()) > D.mins(dl); text = `${ptLink(p)} <span class="taj">${esc(T.patientId(p))}</span> ${c.type === 'radio' ? 'konzíliumi bejelentése' : 'bejelentése (' + esc(typeName(c)) + ')'} hiányos: hiányzik ${esc(T.missingFields(c).join(', '))}. A bejelentési határidő ${past ? 'lejárt (' + esc(T.relAt(dl)) + '); a hiány a napirenden is látszik' : ': ' + esc(T.relAt(dl))}.`; }
  else if (kind === 'labor') text = `${ptLink(p)} <span class="taj">${esc(T.patientId(p))}</span> vizsgálatának (${esc(T.caseTitle(c))}) várható napja (${esc(fmtDate(d.expectedOn))}) elmúlt, és még nincs eredmény.`;
  else if (kind === 'atadas') text = `${ptLink(p)} <span class="taj">${esc(T.patientId(p))}</span> átadása (${esc((d.institution || '').split(',')[0])}) ${esc(fmtDate(d.plannedOn))} napra tervezett; ${T.remindOf(c.profileId, 'atadas')} hónap van hátra.`;
  return `<aside class="notice" aria-label="Emlékeztető">${ico('bell')}<div><p><strong>Emlékeztető${r.asDeputy ? ' (helyettesként)' : ''}:</strong> ${text}</p>
    <p class="meta">${esc(typeName(c))} · ${esc(T.stepLabel(c))} · ${esc(T.relAt(r.at))} · <a href="#/ugy/${c.id}">Az ügy megnyitása</a> · <button class="link-btn lg" type="button" data-act="dismiss" data-id="${r.id}">Rendben${sr(', elrejtem az emlékeztetőt')}</button></p></div></aside>`;
}
function vSajat() {
  const uid = T.me(), u = T.U(uid), nurseLike = !u.doctor;
  ui.title = nurseLike ? 'Teendőim' : 'Saját ügyeim';
  const L = T.myLists(uid, keep());
  const abs = T.absenceOf(uid) || T.state().absences.find(a => a.user === uid && a.to >= today());
  const deps = L.deps.length ? `<p class="note-line">${ico('inbox')} Helyettesítesz: ${L.deps.map(d => esc(userName(d))).join(', ')} nyitott tételei is itt állnak.</p>` : '';
  let h = `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">${esc(ui.title)}</h1><p class="lede">${lede(L)}</p>${pendingLine()}
    ${abs ? `<p class="note-line">Távollét: ${esc(fmtDate(abs.from))} – ${esc(fmtDate(abs.to))} · helyettes: ${esc(userName(abs.deputy))} · <button class="link-btn lg" type="button" data-act="absence-clear">Törlés</button></p>` : ''}${deps}</div>
    <div class="head-actions">${newCaseMenu(null)}${u.profile && !abs ? `<button class="btn btn-quiet" type="button" data-act="panel" data-panel="absence" data-k="absence">Távollét és helyettes</button>` : ''}</div></div>`;
  h += panelHtml();
  h += T.remindersFor(uid).map(reminderHtml).join('');
  if (L.fromDuty.length) h += `<section class="group from-duty" aria-labelledby="h-ugyelettol"><div class="group-head"><h2 class="group-title" id="h-ugyelettol">${ico('inbox')} Az ügyelet hagyta <span class="count">${L.fromDuty.length}</span></h2><span class="sort">az osztálynak; aki átveszi, a neve rögzül</span></div>
    <div class="cols" aria-hidden="true"><span>Mikorra</span><span>Beteg</span><span>Mit kér az ügyelet</span><span></span></div>
    <ul class="rows">${L.fromDuty.map(fromDutyRow).join('')}</ul></section>`;
  const sideHtml = (nurseLike && !L.watched.length ? '' : watchedHtml(L.watched)) + (nurseLike && !L.assigned.length ? '' : assignedHtml(L.assigned));
  h += `<div class="layout${sideHtml ? '' : ' no-side'}"><div class="primary">
    ${rowsBlock('h-dolgozz', 'Ezen dolgozz!', L.working, { sort: 'határidő szerint, a lejártak elöl', empty: '<strong>Mára nincs teendőd.</strong> Ami új, itt jelenik meg.' })}
    ${rowsBlock('h-varunk', 'Kire várunk?', L.waiting, { sort: 'a várakozás hossza szerint', cols: ['Várakozik', 'Beteg', 'Ügy', ''], empty: 'Most senkire nem várunk.' })}
    ${nurseLike ? areaBlocks(uid, L) : ''}
  </div>${sideHtml ? `<div class="side">${sideHtml}</div>` : ''}</div>`;
  return h;
}
/* Az ügyelettől jött tétel a profil listáján: tömör sor, jelölve, ki és mikor hagyta (K8.9, K8.10) */
function fromDutyRow(y) {
  const key = 'duty:' + y.id, p = y.patientId ? T.P(y.patientId) : null, late = T.dutyLate(y), adm = p ? T.openAdmission(p.id) : null;
  let act;
  if (ui.undo[key]) act = undoHtml(key);
  else if (!y.accepted) act = `<button class="btn-sm btn-fill" type="button" data-act="duty-accept" data-id="${y.id}" data-k="act:${key}">Átveszem${sr(': ' + y.text)}</button>`;
  else act = `<button class="btn-sm btn-fill" type="button" data-act="duty-close" data-id="${y.id}" data-k="act:${key}">${ico('check')}Lezárás${sr(': ' + y.text)}</button>`;
  const due = !y.due ? '<span class="main">nincs határidő</span>' : late ? `<span class="main">${ico('alert')}${esc(T.lateBy(y.due))}</span><span class="sub">${esc(T.relAt(y.due))}</span>` : `<span class="main">${esc(T.relAt(y.due))}</span>`;
  return `<li class="row${late ? ' is-late' : ''}${y.closed ? ' is-done' : ''}">
    <div class="cell-due">${sr('Mikorra: ')}${due}</div>
    <div class="cell-pt">${sr('Beteg: ')}${ptLink(p)}${p ? `<span class="pt-id">${ptIdLine(p)}</span>` : ''}</div>
    <div class="cell-what"><span class="what-title">„${esc(y.text)}”</span><span class="sub"><span class="mark">${ico('inbox')}Az ügyelet hagyta</span> · ${nw(userName(y.by))}, ${esc(T.relAt(y.at))}${adm ? ' · ' + esc(adm.place) : ''}</span>
      ${y.accepted ? `<span class="sub">Átvette: ${nw(userName(y.accepted.by))}, ${esc(T.relAt(y.accepted.at))}${y.note ? ' · „' + esc(y.note) + '”' : ''}</span>` : ''}</div>
    <div class="cell-act">${act}</div>
    ${y.accepted && !y.closed && !ui.undo[key] ? `<div class="duty-note"><label class="sr-only" for="dn-${y.id}">Rövid megjegyzés a tételhez</label><input class="text-input" id="dn-${y.id}" type="text" maxlength="160" placeholder="Rövid megjegyzés az ügyeletnek (nem kötelező)" data-f="dn-${y.id}" data-k="dn-${y.id}" autocomplete="off"></div>` : ''}
  </li>`;
}
function areaBlocks(uid, L) {
  const excl = {}; L.working.concat(L.waiting).forEach(i => { excl[i.key] = 1; });
  return cfg.areaOrder[T.U(uid).profile].filter(a => cfg.areas[a].members.indexOf(uid) > -1).map(aid => {
    const A = T.areaList(aid, { keep: keep(), exclude: excl }), id = 'h-area-' + aid;
    const n = A.working.length + A.waiting.length + A.unassigned.length;
    return `<section class="area-block" aria-labelledby="${id}"><div class="group-head"><h2 class="group-title lg" id="${id}">${esc(cfg.areas[aid].name)} <span class="count">${n}</span></h2>
      <a class="link-btn lg" href="#/munkalistak/${aid}">A munkalista nézetei</a></div><p class="group-note">Az área munkalistája; ami fent már szerepel, itt nem ismétlődik.</p>
      ${A.unassigned.length ? rowsBlock(id + '-f', 'Felelős nélkül', A.unassigned, {}) : ''}
      ${A.working.length ? rowsBlock(id + '-d', 'Ezen dolgozz!', A.working, {}) : ''}
      ${A.waiting.length ? rowsBlock(id + '-v', 'Kire várunk?', A.waiting, { cols: ['Várakozik', 'Beteg', 'Ügy', ''] }) : ''}
      ${n ? '' : '<p class="empty">Az áreában most nincs más tétel.</p>'}</section>`;
  }).join('');
}
function watchedHtml(list) {
  const items = list.map(c => {
    const p = c.patientId ? T.P(c.patientId) : null;
    const meta = c.closed ? `${ico('check')}lezárva: ${esc(c.closed.reason)} · ${esc(T.relAt(c.closed.at))}` : T.cat(c) === 'V' ? `${ico('clock')}${esc(T.stepLabel(c))} · ${esc(T.waitLen(c.waitSince || today()))}`
      : esc(T.stepLabel(c)) + (c.type === 'vizsgalat' && c.data.from ? ' · ' + esc(fmtDate(c.data.from)) + ' – ' + esc(fmtDate(c.data.to)) : '');
    const who = c.owners.length ? c.owners.map(userName).join(', ') + ' viszi' : 'még senki nem viszi';
    return `<li class="side-item"><p class="side-pt">${ptLink(p) || '<span class="muted">beteg nélkül</span>'}${p ? `<span class="taj">${esc(T.patientId(p))}</span>` : ''}</p><a class="side-title" href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a><p class="side-meta"><strong>${esc(who)}</strong></p><p class="side-meta">${meta}</p></li>`;
  }).join('');
  return `<section class="group" aria-labelledby="h-figyelt"><h2 class="group-title" id="h-figyelt">Figyelt ügyeim <span class="count">${list.length}</span></h2>
    <p class="group-note">Más viszi őket; a változást itt látod, külön értesítés nélkül.</p>${list.length ? `<ul class="side-list">${items}</ul>` : '<p class="empty">Most nem figyelsz ügyet.</p>'}</section>`;
}
function assignedHtml(list) {
  const items = list.map(y => { const p = y.patientId ? T.P(y.patientId) : null; const key = 'duty:' + y.id;
    return `<li class="side-item"><p class="side-pt">${p ? ptLink(p) + `<span class="taj">${esc(T.patientId(p))}</span>` : '<span class="muted">beteg nélkül</span>'}</p><p class="side-title">„${esc(y.text)}”</p>${dutyFlow(y)}${ui.undo[key] ? undoHtml(key) : ''}</li>`; }).join('');
  return `<section class="group" aria-labelledby="h-kiutalt"><h2 class="group-title" id="h-kiutalt">Kiutalva az ügyeletnek <span class="count">${list.length}</span></h2>
    ${list.length ? `<ul class="side-list">${items}</ul>` : '<p class="empty">Most nincs kiutalt tételed.</p>'}</section>`;
}
/* Az „Új ügy” menü: a megbeszélések az „Esetmegbeszélés” csoportban, mindegyik a sorozata napjával (CT, 2026-11-19: a radiológiai konzílium
   és a D2T-megbeszélés is esetmegbeszélés, csak más-más megbeszélésre) */
function newCaseMenu(pid) {
  const u = T.U(T.me()), menu = cfg.newMenu[u.profile] || [];
  if (!menu.length) return '';
  const li = (m, sub) => `<li><button type="button" data-act="new-case" data-type="${m[0]}"${pid ? ` data-pid="${pid}"` : ''}>${esc(m[1])}${sub ? `<span class="msub">${esc(sub)}</span>` : ''}</button></li>`;
  const isM = m => T.isMeet(m[0]) && cfg.series[m[0]], first = menu.findIndex(isM), meets = menu.filter(isM), gid = 'nm-meet-' + (pid || 'x');
  const sched = m => { const S = cfg.series[m[0]]; return everyWord(S.every) + ', ' + DAY_ON[S.dow]; };
  const group = meets.length ? `${first > 0 ? '<li class="sep" aria-hidden="true"></li>' : ''}<li class="mgroup"><p class="mhead" id="${gid}">Esetmegbeszélés</p><ul aria-labelledby="${gid}">${meets.map(m => li(m, sched(m))).join('')}</ul></li>` : '';
  const rest = menu.filter(m => !isM(m)), before = first > -1 ? rest.filter(m => menu.indexOf(m) < first) : rest, after = first > -1 ? rest.filter(m => menu.indexOf(m) > first) : [];
  const items = before.map(m => li(m, m[2])).join('') + group + (meets.length && after.length ? '<li class="sep" aria-hidden="true"></li>' : '') + after.map(m => li(m, m[2])).join('');
  return `<details class="menu"><summary class="btn ${pid ? 'btn-primary' : 'btn-quiet'}" data-k="new-case">${ico('plus')}Új ügy${ico('chev')}</summary><ul class="menu-list${pid ? ' left' : ''}">${items}</ul></details>`;
}

/* ---------------- Lenyíló sávok: új ügy, kiutalás, tétel az osztálynak, távollét ---------------- */
function field(name, label, input, opt) { return `<div class="field"><label class="field-label" for="f-${name}">${esc(label)}${opt ? ' <span class="opt">(nem kötelező)</span>' : ''}</label>${input}</div>`; }
const inText = (name, extra) => `<input class="text-input" type="text" id="f-${name}" data-f="${name}" data-k="f-${name}" autocomplete="off"${extra || ''}>`;
const inDate = name => `<input class="text-input date" type="date" id="f-${name}" data-f="${name}" data-k="f-${name}">`;
const inArea = name => `<textarea class="textarea" id="f-${name}" data-f="${name}" data-k="f-${name}"></textarea>`;
function inSelect(name, opts, blank) { return `<select class="select" id="f-${name}" data-f="${name}" data-k="f-${name}">${blank ? `<option value="">${esc(blank)}</option>` : ''}${opts.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`; }
function chipsF(name, legend, opts, opt) { return `<fieldset class="field"><legend>${esc(legend)}${opt ? ' <span class="opt" style="font-weight:400">(nem kötelező)</span>' : ''}</legend><div class="chips">${opts.map(o => `<label class="chip"><input type="radio" name="c-${name}" value="${esc(o[0])}" data-f="${name}"><span>${esc(o[1])}</span></label>`).join('')}</div></fieldset>`; }
const yesNo = [['igen', 'igen'], ['nem', 'nem']];
/* ---------------- Személyválasztó: kereshető, legördülő lista (K4.8; CT kérése, 2026-11-19) ----------------
   Akadálymentes combobox (WAI-ARIA 1.2, listás kiegészítés): gépeléskor névre, szerepkörre és áreára szűr, az első találat kijelölve;
   nyíl, Enter és Esc; a lista a nyílgombbal vagy kattintásra is lenyílik. Előre senki nincs kiválasztva; kötelező mezőnél a hiba a mezőnél.
   Ahol több ember választható, a választottak eltávolítható címkeként látszanak a mező fölött.
   Az állapot a ui.f-ben: egy választásnál az azonosító (üres: senki), többnél a lista; a beírt, még nem választott szöveg a „_q:” kulcson.
   Gépelés közben csak a lista rajzolódik újra; választáskor az egész nézet (a mentőgomb kimondja a következményt). */
const cbNameKey = n => String(n || '').replace(/^dr\.\s*/i, '');
const byName = (a, b) => cbNameKey(a.name).localeCompare(cbNameKey(b.name), 'hu');
/* Egy munkatárs a listán: név, alatta a szerepkör és az áreái; a keresés mindegyikre szűr */
function personOpt(uid, pre) {
  const u = T.U(uid), prof = u.profile, ar = prof ? (cfg.areaOrder[prof] || []).map(a => cfg.areas[a]).filter(a => a.members.indexOf(uid) > -1 || a.owner === uid || a.deputy === uid).map(a => a.name) : [];
  const sub = [pre, u.role, ar.join(', ')].filter(Boolean).join(' · ');
  return { v: uid, name: u.name, sub, hay: T.norm([u.name, u.role, ar.join(' '), pre || ''].join(' ')) };
}
/* A választható emberek névsorban; az elöl állók (például az área helyettese) a sorrendjükben, jelölve */
function people(uids, first) {
  first = first || [];
  const head = first.map(x => personOpt(x[0], x[1])), rest = uids.filter(k => !first.some(x => x[0] === k)).map(k => personOpt(k)).sort(byName);
  return head.concat(rest);
}
const profPeople = (prof, except, onlyDoctors) => people(Object.keys(cfg.users).filter(k => cfg.users[k].profile === prof && (!onlyDoctors || cfg.users[k].doctor) && (except || []).indexOf(k) === -1));
function cbPath(key) { const m = /^rows\.(\d+)\.(\w+)$/.exec(key); return m ? { obj: (ui.f.rows || [])[Number(m[1])], k: m[2] } : { obj: ui.f, k: key }; }
function cbVal(key) { const p = cbPath(key); return p.obj ? p.obj[p.k] : undefined; }
function cbSet(key, v) { const p = cbPath(key); if (p.obj) p.obj[p.k] = v; }
function cbQ(key, v) { if (v === undefined) return ui.f['_q:' + key] || ''; if (v) ui.f['_q:' + key] = v; else delete ui.f['_q:' + key]; }
const cbSel = (spec, key) => { const v = cbVal(key); return spec.multi ? (Array.isArray(v) ? v.filter(Boolean) : []) : (v || ''); };
function cbName(spec, v) { const o = spec.opts.find(x => x.v === v); return o ? o.name : userName(v); }
/* A szűrés: minden beírt szó eleje illeszkedjen a név, a szerepkör vagy egy área nevének valamelyik szavára (ékezet nélkül is) */
function cbMatch(o, q) {
  const toks = T.norm(q).split(/[^a-z0-9]+/).filter(Boolean); if (!toks.length) return true;
  const words = o.hay.split(/[^a-z0-9]+/).filter(Boolean);
  return toks.every(t => words.some(w => w.indexOf(t) === 0));
}
function cbVisible(spec, q) {
  const list = spec.opts.filter(o => cbMatch(o, q));
  if (!q.trim() && !spec.multi && spec.empty) list.unshift({ v: '', name: spec.empty, sub: '', none: true });
  return list;
}
function cbActive(spec, vis) {
  if (!vis.length) return null;
  let i = ui.cb.act === null || ui.cb.act === undefined ? -1 : vis.findIndex(o => o.v === ui.cb.act);
  if (i < 0) i = 0;
  ui.cb.act = vis[i].v;
  return { i, id: spec.id + '-o-' + i };
}
function cbOptHtml(spec, o, i, act, sel) {
  const on = spec.multi ? sel.indexOf(o.v) > -1 : o.v === sel;
  return `<li class="cb-opt${i === act ? ' is-act' : ''}${o.none ? ' is-none' : ''}" id="${spec.id}-o-${i}" role="option" aria-selected="${on}" data-cb-opt="${esc(spec.key)}" data-v="${esc(o.v)}"><span class="cb-text"><span class="cb-name">${esc(o.name)}</span>${o.sub ? `<span class="cb-sub">${esc(o.sub)}</span>` : ''}</span><span class="cb-check" aria-hidden="true">${on ? ico('check') : ''}</span></li>`;
}
/* spec: key (a ui.f kulcsa), id, label, opts (people), multi, placeholder, empty (az üres választás neve, ha van), err, errKey, optional, hint, wide */
function cbField(spec) {
  ui.cbSpec[spec.key] = spec;
  const key = spec.key, id = spec.id, sel = cbSel(spec, key), q = cbQ(key), err = spec.err || ui.f['_cbE:' + key] || '';
  const open = !!(ui.cb && ui.cb.key === key), vis = open ? cbVisible(spec, q) : [], act = open ? cbActive(spec, vis) : null;
  const text = spec.multi ? q : (q || (sel ? cbName(spec, sel) : ''));
  const desc = [spec.hint ? id + '-h' : '', err ? id + '-err' : ''].filter(Boolean).join(' '), shown = open && vis.length > 0;
  const tags = spec.multi && sel.length ? `<ul class="labels cb-tags" aria-label="${esc(spec.label)}: kiválasztva">${sel.map(v => `<li><span class="label"><span class="cb-tag">${esc(cbName(spec, v))}</span><button class="link-btn cb-x" type="button" data-cb-del="${esc(key)}" data-v="${esc(v)}" data-k="cbx:${esc(id)}:${esc(v)}">${ico('x')}${sr('Eltávolítás: ' + cbName(spec, v))}</button></span></li>`).join('')}</ul>` : '';
  return `<div class="field cb${spec.multi ? ' cb-multi' : ''}${spec.wide ? ' wide' : ''}" data-cb-wrap="${esc(key)}">
    <label class="field-label" id="${id}-l" for="${id}">${esc(spec.label)}${spec.optional ? ' <span class="opt">(nem kötelező)</span>' : ''}</label>${spec.hint ? `<span class="field-hint" id="${id}-h">${esc(spec.hint)}</span>` : ''}${tags}
    <div class="cb-box"><input class="text-input cb-input" type="text" id="${id}" data-cb="${esc(key)}" data-k="${id}" role="combobox" aria-autocomplete="list" aria-expanded="${shown}" aria-controls="${id}-lb"${act ? ` aria-activedescendant="${act.id}"` : ''} autocomplete="off" spellcheck="false" placeholder="${esc(spec.placeholder)}" value="${esc(text)}"${desc ? ` aria-describedby="${desc}"` : ''}${err ? ' aria-invalid="true"' : ''}>
      <button class="cb-btn" type="button" tabindex="-1" data-cb-toggle="${esc(key)}" aria-label="${esc(spec.label)}: a lista" aria-expanded="${shown}" aria-controls="${id}-lb">${ico('chev')}</button>
      <ul class="cb-list" id="${id}-lb" role="listbox" aria-labelledby="${id}-l"${spec.multi ? ' aria-multiselectable="true"' : ''}${shown ? '' : ' hidden'}>${vis.map((o, i) => cbOptHtml(spec, o, i, act ? act.i : -1, sel)).join('')}</ul></div>
    <p class="cb-none"${open && !vis.length ? '' : ' hidden'}>${esc(spec.none || 'Nincs ilyen munkatárs a listán. Próbáld a név vagy a szerepkör elejével.')}</p>
    <p class="sr-only" id="${id}-st" aria-live="polite"></p>
    ${err ? `<p class="err" id="${id}-err" role="alert">${ico('alert')}<span>${esc(err)}</span></p>` : ''}</div>`;
}
/* Gépelés és nyílbillentyű közben csak a lista rajzolódik újra, a mező és a fókusz a helyén marad */
function cbPaint(key) {
  const spec = ui.cbSpec[key], wrap = document.querySelector('[data-cb-wrap="' + CSS.escape(key) + '"]'); if (!spec || !wrap) return;
  const input = wrap.querySelector('input[data-cb]'), lb = wrap.querySelector('.cb-list'), btn = wrap.querySelector('[data-cb-toggle]'), none = wrap.querySelector('.cb-none'), live = wrap.querySelector('[aria-live]');
  const open = !!(ui.cb && ui.cb.key === key), sel = cbSel(spec, key), vis = open ? cbVisible(spec, cbQ(key)) : [], act = open ? cbActive(spec, vis) : null, shown = open && vis.length > 0;
  lb.innerHTML = vis.map((o, i) => cbOptHtml(spec, o, i, act ? act.i : -1, sel)).join('');
  lb.hidden = !shown; none.hidden = !(open && !vis.length);
  input.setAttribute('aria-expanded', String(shown)); btn.setAttribute('aria-expanded', String(shown));
  if (act) input.setAttribute('aria-activedescendant', act.id); else input.removeAttribute('aria-activedescendant');
  if (open) { const t = vis.length ? vis.length + ' találat' : 'Nincs találat'; if (live.textContent !== t) live.textContent = t; }
  if (act) { const li = document.getElementById(act.id); if (li) li.scrollIntoView({ block: 'nearest' }); }
}
function cbOpen(key, last) {
  const spec = ui.cbSpec[key]; if (!spec) return;
  const vis = cbVisible(spec, cbQ(key));
  ui.cb = { key, act: last ? (vis.length ? vis[vis.length - 1].v : null) : (!spec.multi && !cbQ(key) ? cbSel(spec, key) : null) };
  cbPaint(key);
}
function cbClose(key) { if (ui.cb && ui.cb.key === key) { ui.cb = null; cbPaint(key); } }
function cbMove(key, d) {
  const spec = ui.cbSpec[key], vis = cbVisible(spec, cbQ(key)); if (!vis.length) return;
  let i = vis.findIndex(o => o.v === ui.cb.act); i = i < 0 ? 0 : Math.max(0, Math.min(vis.length - 1, i + d));
  ui.cb.act = vis[i].v; cbPaint(key);
}
function cbFocusEnd(id) { const el = document.getElementById(id); if (el && el.setSelectionRange) { const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) { /* nem szöveg */ } } }
function cbSay(id, msg) { setTimeout(() => { const s = document.getElementById(id + '-st'); if (s) s.textContent = msg; }, 80); }
/* Választás: a lista bezárul (többes választásnál is, hogy ne takarja el a mentőgombot; a következő névhez elég gépelni);
   a többesnél a választott címkeként jelenik meg, a már választott újra választva kikerül; a hiba a választással eltűnik */
function cbPick(key, v) {
  const spec = ui.cbSpec[key]; if (!spec) return;
  delete ui.f['_cbE:' + key]; if (spec.errKey) ui.f[spec.errKey] = '';
  let msg = '';
  if (spec.multi) {
    const cur = cbSel(spec, key).slice(), i = cur.indexOf(v);
    if (i > -1) cur.splice(i, 1); else cur.push(v);
    cbSet(key, cur); cbQ(key, ''); ui.cb = null; msg = (i > -1 ? 'Eltávolítva: ' : 'Hozzáadva: ') + cbName(spec, v);
  } else { cbSet(key, v); cbQ(key, ''); ui.cb = null; }
  ui.focus = spec.id; renderMain(); cbFocusEnd(spec.id);
  if (msg) cbSay(spec.id, msg);
}
/* A címke eltávolítása: a fókusz a szomszéd címkére, ennek híján a mezőre kerül */
function cbRemove(key, v) {
  const spec = ui.cbSpec[key]; if (!spec) return;
  const cur = cbSel(spec, key), i = cur.indexOf(v), next = cur[i + 1] || cur[i - 1];
  cbSet(key, cur.filter(x => x !== v)); ui.cb = null;
  ui.focus = next ? 'cbx:' + spec.id + ':' + next : spec.id; renderMain();
  cbSay(spec.id, 'Eltávolítva: ' + cbName(spec, v));
}
function cbInput(el) {
  const key = el.getAttribute('data-cb'), spec = ui.cbSpec[key]; if (!spec) return;
  let rerender = false;
  if (!spec.multi) { const v = cbSel(spec, key); if (v && el.value !== cbName(spec, v)) { cbSet(key, ''); rerender = true; } }
  cbQ(key, el.value.trim() ? el.value : '');
  ui.cb = { key, act: null };
  if (rerender) renderMain(); else cbPaint(key);
  clearTimeout(saveUiDraft.tm); saveUiDraft.tm = setTimeout(saveUiDraft, 300);
}
/* Mentés előtt: ha a mezőben beírt, de a listából nem választott szöveg áll, a hiba a mezőnél jelenik meg, és nem ment el semmi */
function cbCheck(form) {
  let first = null;
  form.querySelectorAll('input[data-cb]').forEach(el => { const key = el.getAttribute('data-cb'); if (cbQ(key).trim()) { ui.f['_cbE:' + key] = 'Válaszd ki a nevet a listából, vagy töröld a beírt szöveget.'; if (!first) first = el.id; } });
  if (!first) return true;
  ui.cb = null; ui.focus = first; renderMain(); return false;
}
/* Egy ember választható: kulcs, felirat, emberek, helyőrző, hiba, nem kötelező; az „extra” a többi beállítás (üres választás neve, hibakulcs, súgó) */
function personField(name, label, opts, placeholder, err, optional, extra) {
  return cbField(Object.assign({ key: name, id: 'f-' + name, label, opts, placeholder, err, optional }, extra || {}));
}
/* Több ember választható: a választottak címkeként a mező fölött */
function peopleField(name, label, opts, placeholder, optional, extra) {
  return cbField(Object.assign({ key: name, id: 'f-' + name, label, opts, placeholder, optional, multi: true }, extra || {}));
}
/* Részeshatározó rag a névhez: „dr. Vázlat Viktornak”, „Naptár Nórának”, „dr. Ideg Imrének” */
function dative(name) {
  const parts = name.split(' '), w = parts.pop();
  const r = /a$/.test(w) ? w.slice(0, -1) + 'ának' : /e$/.test(w) ? w.slice(0, -1) + 'ének' : w + (/[aáoóuú]/i.test(w) ? 'nak' : 'nek');
  return parts.concat([r]).join(' ');
}
/* A mentőgomb kimondja a következményt: kiadás másnak, kiutalás az ügyeletnek, vagy mentés magamnak */
function consequenceLabel(owners) {
  const uid = T.me();
  if (owners === null) return 'Kiutalom az ügyeletnek';
  if (!owners.length) return 'Mentés felelős nélkül';
  if (owners.indexOf('?') > -1) return 'Kiadom';
  const others = owners.filter(o => o !== uid);
  if (!others.length) return 'Mentés';
  if (owners.indexOf(uid) > -1) return 'Mentés, társfelelős: ' + others.map(userName).join(', ');
  return 'Kiadom ' + others.map(o => dative(userName(o))).join(' és ');
}
/* Az új ügy felelősei úgy, ahogy mentéskor lesznek (null: az ügyelet) */
function ncOwners(p, f) {
  const uid = T.me(), prof = T.U(uid).profile, type = p.type, area = cfg.areas[cfg.defaultArea[prof][type]], ao = area && area.owner;
  if (type === 'altalanos') return f.owner === 'duty' ? null : f.owner === 'other' ? (f.ownerId ? [f.ownerId] : ['?']) : f.owner === 'none' ? [] : [uid];
  if (T.flowOf(type) === 'konz') return [uid];
  if (T.flowOf(type) === 'd2t') return (f.owners || []).slice();
  if (type === 'atadas') return [f.coordinator || ao || uid];
  if (f.owner === 'area') return [ao];
  if (f.owner === 'me') return [uid];
  if (f.owner === 'other') return f.ownerId ? [f.ownerId] : ['?'];
  if (f.owner === 'none') return [];
  return ao ? [ao] : [];
}
function whenOptions(kind) {
  const n = T.now(), t = today(), tm = D.add(t, 1);
  const cand = kind === 'ward' ? [D.at(t, '08:00'), D.at(t, '10:00'), D.at(t, '14:00'), D.at(tm, '08:00'), D.at(tm, '10:00'), D.at(tm, '14:00')]
    : [D.at(t, '18:00'), D.at(t, '22:00'), D.at(tm, '08:00'), D.at(tm, '12:00'), D.at(tm, '18:00')];
  return cand.filter(x => D.mins(x) > D.mins(n)).slice(0, 3);
}
function panelHtml() {
  const p = ui.panel; if (!p) return '';
  if (p.kind === 'new-case') return newCasePanel(p);
  if (p.kind === 'kiutal') return kiutalPanel(p);
  if (p.kind === 'ward') return wardPanel(p);
  if (p.kind === 'absence') return absencePanel();
  if (p.kind === 'taj') return tajPanel(p);
  if (p.kind === 'name') return namePanel(p);
  return '';
}
function patientPicker(p) {
  const f = ui.f;
  if (p.pid) { const pt = T.P(p.pid); return `<p class="ok-line">${ico('check')}<span>Beteg: <strong>${esc(ptName(pt))}</strong>, <span class="taj">${esc(T.patientId(pt))}</span>${p.fixed ? '' : ` · <button class="link-btn lg" type="button" data-act="pick-clear">Másik beteg</button>`}</span></p>`; }
  const hits = f.pq ? T.searchPatients(f.pq).filter(x => T.patientAccess(x.id) === 'own').slice(0, 6) : [];
  return `${field('pq', 'Beteg (név vagy TAJ)', inText('pq', ' aria-describedby="pq-help"'))}<p class="field-hint" id="pq-help">${p.type === 'altalanos' ? 'Beteg nélkül is mentheted.' : 'Írd be a beteg nevének elejét vagy a TAJ-t.'}</p>
    ${hits.length ? `<ul class="plain-list" aria-label="Találatok">${hits.map(x => `<li><button class="link-btn lg" type="button" data-act="pick" data-pid="${x.id}">${esc(ptName(x))}, ${esc(T.patientId(x))}</button></li>`).join('')}</ul>` : f.pq ? `<p class="hint">Nincs ilyen beteg a profilodban. <a href="#/uj-beteg?q=${encodeURIComponent(f.pq)}">Új beteg felvétele</a></p>` : ''}`;
}
function ownerChips(type, prof, uid) {
  const area = cfg.areas[cfg.defaultArea[prof][type]], f = ui.f;
  const opts = [];
  if (area && area.owner && area.owner !== uid) opts.push(['area', userName(area.owner) + ' (az área felelőse)']);
  opts.push(['me', 'én'], ['other', 'más'], ['none', 'egyelőre senki']);
  return chipsF('owner', 'Felelős', opts, true) + (f.owner === 'other' ? personField('ownerId', 'Ki?', profPeople(prof, [uid]), 'Írd be a nevét', f._eOwner, false, { errKey: '_eOwner' }) : '')
    + `<p class="field-hint" style="margin-top:.375rem">${area && area.owner ? 'Ha nem választasz, az área felelőse viszi: ' + esc(userName(area.owner)) + '.' : 'Ennek az áreának nincs alapértelmezett felelőse; ha nem választasz, az ügy a munkalistán a „Felelős nélkül” részben áll.'}</p>`;
}
/* A változat plusz adatai az új ügy űrlapján (nem kötelezők); az archivált mező új ügynél már nem jelenik meg */
const plusLive = (prof, type) => plusOf(prof, type).filter(x => !x.archived);
function plusFields(prof, type) {
  return plusLive(prof, type).map(x => x.kind === 'yn' ? chipsF(x.id, x.label, yesNo, true)
    : x.kind === 'list' ? field(x.id, x.label, inSelect(x.id, (x.opts || []).map(o => [o, o]), 'nincs megadva'), true)
    : field(x.id, x.label, inText(x.id), true)).join('');
}
function plusData(prof, type, f) { const o = {}; plusLive(prof, type).forEach(x => { o[x.id] = x.kind === 'yn' ? (f[x.id] === 'igen' ? true : f[x.id] === 'nem' ? false : undefined) : (f[x.id] || ''); }); return o; }
function newCasePanel(p) {
  const f = ui.f, uid = T.me(), u = T.U(uid), prof = u.profile, type = p.type, pt = p.pid ? T.P(p.pid) : null;
  const tname = (cfg.newMenu[prof].find(m => m[0] === type) || [type, cfg.types[type].name])[1];
  const g = pt ? T.careIn(pt.id, prof) : null;
  let body = patientPicker(p);
  const appearance = pt ? chipsF('app', 'Megjelenés a feladattal együtt', T.openAdmission(pt.id) ? [['', 'a beteg bent fekszik; nincs új megjelenés'], ['visit', 'ambuláns vizit most']] : [['', 'nincs'], ['visit', 'ambuláns vizit most'], ['adm', 'felvétel az osztályra most']], true) : '';
  if (type === 'vizsgalat') {
    if (f.exam === undefined) f.exam = 'MR';
    body += `<div class="fields-2">${field('exam', 'Vizsgálat', inSelect('exam', cfg.profiles[prof].exams.map(x => [x, x])))}${field('region', 'Régió', inText('region'), true)}
      ${field('from', 'Időablak: mettől', inDate('from'), true)}${field('to', 'Időablak: meddig', inDate('to'), true)}</div>
      ${chipsF('anesthesia', 'Altatás', yesNo, true)}${field('his', 'HIS-hivatkozás a kérésre', inText('his', ' class="text-input short"'), true)}
      ${ownerChips(type, prof, uid)}${u.doctor ? '<p class="hint">Kérő orvosként figyelőként követed; külön értesítést nem kapsz.</p>' : ''}${appearance}`;
  } else if (type === 'labor') {
    if (f.requestedOn === undefined) f.requestedOn = today();
    body += `<div class="fields-2">${field('test', 'Vizsgálat', inText('test'), true)}${personField('notify', 'Kinek kell jelezni', profPeople(prof, [], true), 'Írd be a nevét', null, true, { empty: 'senkinek külön' })}
      ${field('requestedOn', 'A kérés napja', inDate('requestedOn'), true)}${field('expectedOn', 'Várható eredmény', inDate('expectedOn'), true)}</div>
      ${field('his', 'HIS-hivatkozás a kérésre', inText('his'), true)}
      ${ownerChips(type, prof, uid)}${appearance}`;
  } else if (type === 'engedely') {
    if (f.indication === undefined) f.indication = g ? g.dx : '';
    if (f.reqType === undefined) f.reqType = 'új';
    if (f.step === undefined) f.step = 'elok';
    body += `<div class="fields-2">${field('drug', 'Gyógyszer', inText('drug'), true)}${field('indication', 'Indikáció', inText('indication'), true)}</div>
      ${chipsF('reqType', 'Kérelemtípus', cfg.reqTypes.map(x => [x, x]))}${chipsF('offLabel', 'Indikáción túli alkalmazás', yesNo, true)}
      ${field('step', 'Lépés (folyamatban lévő engedélynél a tényleges lépés)', inSelect('step', cfg.types.engedely.steps.map(s => [s.id, s.label])))}
      <div class="fields-2">${field('sentOn', 'Beküldés napja', inDate('sentOn'), true)}${field('decidedOn', 'Határozat napja', inDate('decidedOn'), true)}${field('expiresOn', 'Érvényes eddig', inDate('expiresOn'), true)}</div>
      ${ownerChips(type, prof, uid)}`;
  } else if (T.isMeet(type)) {
    const sk = cfg.types[type].meeting, m = T.nextMeeting(sk), d2t = T.flowOf(type) === 'd2t';
    const others = pt ? T.state().cases.filter(c => c.patientId === pt.id && c.type !== type && T.caseAccess(c) === 'write').map(c => [c.id, T.caseTitle(c) + ' (' + typeName(c) + ')']) : [];
    /* A napirendről indítva az alkalom előre kitöltve (K5.11) */
    if (f.meeting === undefined) f.meeting = p.meeting && meetDates(sk).indexOf(p.meeting) > -1 ? p.meeting : m;
    body += `${meetingChooser('meeting', sk, 'Hiányosan is mentheted; a napirenden látszik, mi hiányzik.')}
      ${field('question', 'Kérdés', inText('question'))}${!d2t ? field('region', 'Régió vagy terület', inText('region')) : field('due', 'Határidő', inDate('due'), true)}
      ${field('summary', 'Rövid összefoglaló', inArea('summary'))}${field('his', d2t ? 'HIS-hivatkozás' : 'HIS-hivatkozás a felvételre', inText('his'))}
      ${d2t ? peopleField('owners', 'Felelős orvosok', profPeople(prof, [], true), 'Írd be a nevét', true, { hint: 'Egy vagy több; ha senkit nem választasz, egyelőre senki.' }) : ''}
      ${others.length ? field('link', 'Hivatkozás egy másik ügyre', inSelect('link', others, 'nincs'), true) : ''}`;
  } else if (type === 'atadas') {
    body += `<div class="fields-2">${field('institution', 'Fogadó intézmény', inText('institution'), true)}${field('recvDoctor', 'Fogadó orvos', inText('recvDoctor'), true)}
      ${field('contact', 'Intézményi elérhetőség', inText('contact'), true)}${field('plannedOn', 'Tervezett nap', inDate('plannedOn'), true)}</div>
      ${(ao => personField('coordinator', 'Tranzíciós koordinátor', profPeople(prof, [], true), 'Írd be a nevét', null, true, { empty: 'az área felelőse: ' + ao }) + `<p class="field-hint" style="margin-top:.375rem">Ha üresen hagyod, az área felelőse lesz: ${esc(ao)}.</p>`)(userName((cfg.areas[cfg.defaultArea[prof].atadas] || {}).owner || uid))}`;
  } else if (cfg.types[type].custom) {
    /* A profil saját ügytípusa (K4.17): a közös adatok, a lépései a kategóriájuk szerint működnek */
    const t = cfg.types[type];
    body += `${ownerChips(type, prof, uid)}${field('due', 'Határidő', inDate('due'), true)}
      <p class="hint">A profil saját ügytípusa. Első lépés: „${esc(t.steps[0].label)}”; az ügy a(z) ${esc(T.areaName(cfg.defaultArea[prof][type]))} munkalistáján áll.</p>`;
  } else if (type === 'altalanos') {
    if (f.owner === undefined) f.owner = 'me';
    const late = f.owner === 'duty';
    body += `${field('what', 'Mit kell tenni?', inText('what', ' maxlength="160"'))}
      ${chipsF('owner', 'Kinek?', [['me', 'nekem'], ['duty', 'az ügyeletnek'], ['other', 'másnak'], ['none', 'egyelőre senkinek']])}
      ${f.owner === 'other' ? personField('ownerId', 'Ki?', profPeople(prof, [uid]), 'Írd be a nevét', f._eOwner, false, { errKey: '_eOwner' }) : ''}
      ${late ? whenField('when', whenOptions('duty'), false) : field('due', 'Határidő', inDate('due'), true)}
      ${late ? '<p class="hint">A címzett az ügyelet, nem egy név; a tétel az ügyeleti listára kerül.</p>' : ''}`;
  }
  body += plusFields(prof, type);
  return `<section class="panel" aria-labelledby="nc-title"><form data-form="new-case" novalidate>
    <h2 id="nc-title" tabindex="-1" data-k="panel-h">Új ügy: ${esc(tname)}</h2><p class="panel-note">Csak a beteg és az ügytípus kötelező; minden más később is kitölthető.</p>
    ${body}${ui.f._err ? `<p class="err" role="alert">${ico('alert')}<span>${esc(ui.f._err)}</span></p>` : ''}
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="nc-save">${ico(ncOwners(p, f) === null ? 'send' : 'check')}${esc(consequenceLabel(ncOwners(p, f)))}</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form></section>`;
}
/* A megbeszélés alkalma (K5.10; CT, 2026-11-19): a felület kimondja, hogy a sorozat alkalmait kínálja; a legközelebbi négy egy kattintással,
   bármelyik későbbi a „későbbi alkalom” listájából, egy évre előre (például egy három hónap múlva esedékes MR utáni konzílium).
   Minden alkalom mellett, hány eset van már rajta; alatta a választott alkalom bejelentési határideje. A mintája a határidő „más időpont” választója. */
const MEET_MONTHS = 12;
/* Az alkalom esetei: ami rajta van, a még meg nem tartott alkalom előtt visszavontak nélkül */
function meetCount(sk, d) { return T.state().cases.filter(c => c.type === sk && c.meeting === d && !(c.closed && c.closed.at.slice(0, 10) < d)).length; }
const meetLabel = (sk, d) => fmtDate(d) + ', ' + D.dayName(d) + ' (' + meetCount(sk, d) + ' eset)';
function meetDates(sk) {
  const S = cfg.series[sk]; if (!S) return [];
  const end = D.addMonths(today(), MEET_MONTHS), out = []; let d = T.nextMeeting(sk);
  while (d <= end && out.length < 60) { out.push(d); d = D.add(d, 7 * (S.every || 1)); }
  return out;
}
const monthOf = iso => D.full(iso).split(' ').slice(0, 2).join(' ');
function meetingChooser(key, sk, note, wide) {
  const f = ui.f, S = cfg.series[sk], all = meetDates(sk), near = all.slice(0, 4), later = all.slice(4), cur = f[key];
  /* A meglévő ügy már elmúlt alkalma is látszik, a sajátjaként */
  const own = cur && all.indexOf(cur) === -1 ? cur : null, ck = key + 'Chip', lk = key + 'Later';
  f[ck] = near.indexOf(cur) > -1 || cur === own ? cur : later.indexOf(cur) > -1 ? 'later' : '';
  if (f[ck] === 'later') f[lk] = cur; else if (later.indexOf(f[lk]) === -1) f[lk] = later[0] || '';
  const dl = cur ? T.meetingDeadline(sk, cur) : null, past = dl && D.mins(T.now()) > D.mins(dl);
  const chip = (v, label, i) => `<label class="chip"><input type="radio" name="c-${ck}" value="${esc(v)}" data-f="${ck}" data-meet="${key}" data-rerender="1"${i === 0 ? ` data-k="${ck}-first"` : ''}><span>${esc(label)}</span></label>`;
  const months = []; later.forEach(d => { const m = monthOf(d); let g = months.find(x => x[0] === m); if (!g) months.push(g = [m, []]); g[1].push(d); });
  const vn = vlabel(S.profile, sk), nm = /^.[a-záéíóöőúüű]/.test(vn) ? vn.charAt(0).toLowerCase() + vn.slice(1) : vn;
  return `<fieldset class="field meet-pick${wide ? ' wide' : ''}" aria-describedby="${key}-mh${dl ? ' ' + key + '-dl' : ''}"><legend>Alkalom</legend>
    <p class="field-hint" id="${key}-mh">${esc(cap(art(nm)) + ' ' + nm)} alkalmai, ${esc(everyWord(S.every))} ${esc(DAY_ON[S.dow])}: a legközelebbi négy, és egy évre előre bármelyik későbbi. Zárójelben, hány eset van már rajta.</p>
    <div class="chips">${(own ? [chip(own, meetLabel(sk, own), 0)] : []).concat(near.map((d, i) => chip(d, meetLabel(sk, d), own ? 1 : i))).join('')}${later.length ? chip('later', 'későbbi alkalom', 1) : ''}</div>
    ${f[ck] === 'later' ? `<div class="field meet-later"><label class="field-label" for="f-${lk}">Melyik későbbi alkalom?</label><select class="select" id="f-${lk}" data-f="${lk}" data-meet="${key}" data-rerender="1" data-k="f-${lk}">${months.map(g => `<optgroup label="${esc(g[0])}">${g[1].map(d => `<option value="${d}">${esc(meetLabel(sk, d))}</option>`).join('')}</optgroup>`).join('')}</select></div>` : ''}
    ${dl ? `<p class="hint meet-dl" id="${key}-dl">Bejelentési határidő: ${esc(T.relAt(dl))}${past ? ' (lejárt; az eset így is a napirendre kerül)' : ''}.${note ? ' ' + esc(note) : ''}</p>` : ''}</fieldset>`;
}
/* A határidő gyorsválasztói mellett tetszőleges nap és idő is megadható (bírálat 22.); a hibák a képernyőolvasóhoz is eljutnak (25.) */
function whenField(prefix, opts, optional) {
  const f = ui.f, v = f[prefix];
  return `<fieldset${f['_e2' + prefix] ? ` aria-describedby="${prefix}-err"` : ''}><legend>Mikorra?${optional ? ' <span class="opt" style="font-weight:400">(nem kötelező)</span>' : ''}</legend><div class="chips">${opts.map((o, i) => `<label class="chip"><input type="radio" name="${prefix}" value="${o}" data-f="${prefix}"${i === 0 ? ` data-k="${prefix}-first"` : ''}><span>${esc(T.relAt(o))}</span></label>`).join('')}<label class="chip"><input type="radio" name="${prefix}" value="mas" data-f="${prefix}"><span>más időpont</span></label>${optional ? `<label class="chip"><input type="radio" name="${prefix}" value="" data-f="${prefix}"><span>nincs határidő</span></label>` : ''}</div>
    ${v === 'mas' ? `<div class="fields-2" style="max-width:26rem">${field(prefix + 'D', 'Nap', inDate(prefix + 'D'))}<div class="field"><label class="field-label" for="f-${prefix}T">Idő</label><input class="text-input short" type="time" id="f-${prefix}T" data-f="${prefix}T" data-k="f-${prefix}T"></div></div>` : ''}
    ${f['_e2' + prefix] ? `<p class="err" id="${prefix}-err" role="alert">${ico('alert')}<span>${esc(f['_e2' + prefix])}</span></p>` : ''}</fieldset>`;
}
function whenValue(prefix) { const f = ui.f, v = f[prefix]; if (v === 'mas') return f[prefix + 'D'] && f[prefix + 'T'] ? D.at(f[prefix + 'D'], f[prefix + 'T']) : 'hiányos'; return v || null; }
function kiutalPanel(p) {
  const f = ui.f, pt = p.pid ? T.P(p.pid) : null, c = p.cid ? T.Cs(p.cid) : null, opts = whenOptions('duty');
  if (f.mit === undefined) f.mit = T.draftOf('kiutal:' + (p.cid || p.pid));
  const w = whenValue('mikor'), adm = pt ? T.openAdmission(pt.id) : null;
  return `<section class="panel split" aria-labelledby="ku-title"><form data-form="kiutal" novalidate>
      <h2 id="ku-title" tabindex="-1" data-k="panel-h">Kiutalás az ügyeletnek</h2>
      ${c ? `<p class="panel-note">Ehhez az ügyhöz: ${esc(T.caseTitle(c))}</p>` : ''}
      <label class="field-label" for="f-mit">Mit kérsz az ügyelettől?</label>
      <input class="text-input" id="f-mit" type="text" maxlength="160" autocomplete="off" data-f="mit" data-k="f-mit" data-draft="kiutal:${esc(p.cid || p.pid)}" aria-describedby="ku-saved${f._e1 ? ' ku-e1' : ''}"${f._e1 ? ' aria-invalid="true"' : ''}>
      ${f._e1 ? `<p class="err" id="ku-e1" role="alert">${ico('alert')}<span>Írd be röviden, mit kérsz az ügyelettől.</span></p>` : ''}
      ${whenField('mikor', opts, false)}
      <p class="hint" id="ku-saved">Gépelés közben mentjük; ha félbehagyod, itt találod. A címzett az ügyelet, nem egy név.</p>
      <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ku-save">${ico('send')}Kiutalom az ügyeletnek</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form>
    <div class="ticket"><p class="ticket-head">Így látja az ügyeletes, megnyitás nélkül</p><dl class="dl">
      <dt>Kiről</dt><dd>${pt ? esc(ptName(pt)) + ', <span class="taj">' + esc(T.patientId(pt)) + '</span>' : '<span class="empty-val">beteg nélkül</span>'}</dd>
      <dt>Hol</dt><dd>${pt ? (adm ? esc(adm.place) + ' · fekvő' : esc(T.profileName(T.U(T.me()).profile)) + ' · járó') : esc(T.profileName(T.U(T.me()).profile))}</dd>
      <dt>Mit</dt><dd id="prev-mit"${f.mit ? '' : ' class="empty-val"'}>${f.mit ? '„' + esc(f.mit) + '”' : '(még üres)'}</dd>
      <dt>Mikorra</dt><dd id="prev-mikor"${w && w !== 'hiányos' ? '' : ' class="empty-val"'}>${w && w !== 'hiányos' ? esc(T.relAt(w)) : '(még nincs megadva)'}</dd>
      <dt>Kitől</dt><dd>${esc(userName(T.me()))}</dd></dl></div></section>`;
}
function wardPanel(p) {
  const f = ui.f, opts = whenOptions('ward');
  const list = T.inpatients();
  const pt = p.pid ? T.P(p.pid) : f.wpid ? T.P(f.wpid) : null, adm = pt ? T.openAdmission(pt.id) : null;
  const wp = pt ? T.wardProfiles(pt.id) : { list: [], def: null };
  if (pt && (!f.wprof || wp.list.indexOf(f.wprof) === -1)) f.wprof = wp.def;
  const w = whenValue('wmikor');
  return `<section class="panel split" aria-labelledby="wd-title"><form data-form="ward" novalidate>
      <h2 id="wd-title" tabindex="-1" data-k="panel-h">Tétel az osztálynak</h2><p class="panel-note">A másnapi ellátóknak; a címzett a beteg osztálya, nem egy név.</p>
      ${p.pid ? '' : `<div class="field"><label class="field-label" for="f-wpid">Melyik bent fekvő betegről?</label><select class="select" id="f-wpid" data-f="wpid" data-k="f-wpid"${f._e0 ? ' aria-describedby="wd-e0" aria-invalid="true"' : ''}><option value="">válaszd ki</option>${list.map(x => `<option value="${x.p.id}">${esc(ptName(x.p) + ', ' + T.patientId(x.p) + ' · ' + x.a.place)}</option>`).join('')}</select></div><p class="field-hint" style="margin-top:.375rem">Ha a beteg felvétele nincs rögzítve, a betegkártyáról hagyhatsz neki tételt.</p>`}
      ${f._e0 ? `<p class="err" id="wd-e0" role="alert">${ico('alert')}<span>Válaszd ki a beteget.</span></p>` : ''}
      ${wp.list.length > 1 ? chipsF('wprof', 'Melyik osztálynak?', wp.list.map(x => [x, T.profileName(x)])) : ''}
      <label class="field-label" for="f-wmit" style="margin-top:1.25rem">Mit hagysz az osztálynak?</label>
      <input class="text-input" id="f-wmit" type="text" maxlength="160" autocomplete="off" data-f="wmit" data-k="f-wmit"${f._e1 ? ' aria-describedby="wd-e1" aria-invalid="true"' : ''}>
      ${f._e1 ? `<p class="err" id="wd-e1" role="alert">${ico('alert')}<span>Írd be röviden, mit kell az osztálynak tennie.</span></p>` : ''}
      ${whenField('wmikor', opts, true)}
      <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="wd-save">${ico('inbox')}Az osztálynak hagyom</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form>
    <div class="ticket"><p class="ticket-head">Így látja az osztály, megnyitás nélkül</p><dl class="dl">
      <dt>Ki hagyta</dt><dd>az ügyelet: ${esc(userName(T.me()))}, ${esc(T.relAt(T.now()))}</dd>
      <dt>Kiről</dt><dd>${pt ? esc(ptName(pt)) + ', <span class="taj">' + esc(T.patientId(pt)) + '</span>' : '<span class="empty-val">(még nincs kiválasztva)</span>'}</dd>
      <dt>Hol</dt><dd>${adm ? esc(adm.place) + ' · fekvő' : pt ? 'felvétel nincs rögzítve' : '<span class="empty-val">–</span>'}</dd>
      <dt>Kinek</dt><dd>${f.wprof ? esc(T.profileName(f.wprof)) + ' (az osztály, nem egy név)' : '<span class="empty-val">–</span>'}</dd>
      <dt>Mit</dt><dd id="prev-wmit"${f.wmit ? '' : ' class="empty-val"'}>${f.wmit ? '„' + esc(f.wmit) + '”' : '(még üres)'}</dd>
      <dt>Mikorra</dt><dd${w && w !== 'hiányos' ? '' : ' class="empty-val"'}>${w && w !== 'hiányos' ? esc(T.relAt(w)) : 'nincs határidő'}</dd></dl></div></section>`;
}
/* A távollét helyettese: a profil bármelyik tagja, mert az área felelőse és helyettese is bármelyik szerepkörből lehet (K2.3, K5.17; a prototípus bírálata, 9.);
   akinek az áreáján helyettes van beállítva, annál ő áll elöl, jelölve, de nincs kiválasztva */
function absenceDeputies(u) {
  const me = T.me(), ad = (cfg.areaOrder[u.profile] || []).map(a => cfg.areas[a]).filter(a => a.owner === me && a.deputy && a.deputy !== me && T.U(a.deputy).profile === u.profile);
  const first = T.membersOf(u.profile).filter(k => k !== me && ad.some(a => a.deputy === k)).map(k => [k, 'az área helyettese: ' + ad.filter(a => a.deputy === k).map(a => a.name).join(', ')]);
  return people(T.membersOf(u.profile).filter(k => k !== me), first);
}
function absencePanel() {
  const f = ui.f, u = T.U(T.me());
  if (f.afrom === undefined) f.afrom = today();
  return `<section class="panel" aria-labelledby="ab-title"><form data-form="absence" novalidate><h2 id="ab-title" tabindex="-1" data-k="panel-h">Távollét és helyettes</h2>
    <p class="panel-note">A távollét alatt a nyitott tételeid a helyettesed listáján is látszanak, áthelyezés nélkül.</p>
    <div class="fields-2">${field('afrom', 'Mettől', inDate('afrom'))}${field('ato', 'Meddig', inDate('ato'))}</div>
    ${personField('adep', 'Helyettes', absenceDeputies(u), 'Írd be a nevét', f._eDep, false, { errKey: '_eDep' })}
    ${f._err ? `<p class="err" role="alert">${ico('alert')}<span>${esc(f._err)}</span></p>` : ''}
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ab-save">Mentés</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form></section>`;
}
function tajPanel(p) {
  const f = ui.f, ex = f._exists ? T.P(f._exists) : null;
  return `<section class="panel" aria-labelledby="tj-title"><form data-form="taj" novalidate><h2 id="tj-title" tabindex="-1" data-k="panel-h">TAJ beírása</h2>
    ${field('taj', 'TAJ (9 számjegy)', inText('taj', ' inputmode="numeric" class="text-input short"'))}
    ${f._err ? `<p class="err" role="alert">${ico('alert')}<span>${esc(f._err)}</span></p>` : ''}
    ${ex ? `<div class="notice is-ro" role="alert">${ico('alert')}<div><p><strong>Ez a TAJ már szerepel:</strong> ${esc(ex.name || 'név nélküli rekord')}, <span class="taj">${esc(T.patientId(ex))}</span>. Második rekord nem jön létre.</p>
      <p class="meta">${T.canMerge() ? `<a href="#/osszevonas/${p.pid}/${ex.id}">A két rekord összevetése és összevonása</a>` : `A két rekordot csak a profilban erre kijelölt munkatárs vonhatja össze: ${esc(Object.keys(cfg.users).filter(k => cfg.users[k].merge && cfg.users[k].profile === T.U(T.me()).profile).map(k => cfg.users[k].name).join(', '))}.`}
      ${T.patientAccess(ex.id) !== 'none' ? ` · <a href="#/beteg/${ex.id}">A meglévő rekord megnyitása</a>` : ''}</p></div></div>` : ''}
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="tj-save">Mentés</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form></section>`;
}
function namePanel(p) {
  return `<section class="panel" aria-labelledby="nm-title"><form data-form="name" novalidate><h2 id="nm-title" tabindex="-1" data-k="panel-h">A beteg neve</h2>
    ${field('pname', 'Név', inText('pname'))}<div class="form-actions"><button class="btn btn-primary" type="submit">Mentés</button><button class="btn btn-quiet" type="button" data-act="panel-close">Mégse</button></div></form></section>`;
}

/* ---------------- Nézet: ügyeleti lista (K8) ---------------- */
function vUgyelet() {
  ui.title = 'Ügyeleti lista';
  const L = T.dutyLists(keep()), late = L.open.filter(y => T.dutyLate(y) && !y.closed).length;
  let h = `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Ügyeleti lista</h1><p class="lede">Klinikai ügyelet · ${esc(D.long(today()))} ${esc(D.hm(T.now()))} · ${L.open.length} nyitott tétel${late ? ', ' + late + ' késik' : ''}</p></div>
    <div class="head-actions"><button class="btn btn-quiet" type="button" data-act="panel" data-panel="ward" data-k="ward">${ico('inbox')}Tétel az osztálynak</button></div></div>`;
  h += panelHtml();
  h += `<div class="layout wide-side"><div class="primary"><section class="group" aria-labelledby="h-nyitott"><div class="group-head"><h2 class="group-title" id="h-nyitott">Nyitott tételek <span class="count">${L.open.length}</span></h2><span class="sort">${ico('sort')}a lejártak elöl, utána határidő szerint</span></div>
    ${L.open.length ? `<ul class="duty-list">${L.open.map(y => dutyItemHtml(y, 'duty')).join('')}</ul>` : '<p class="empty"><strong>Most nincs nyitott ügyeleti tétel.</strong> Ami érkezik, itt jelenik meg.</p>'}</section></div>
    <div class="side"><section class="group" aria-labelledby="h-hagyott"><h2 class="group-title" id="h-hagyott">Az osztályoknak hagyva <span class="count">${L.left.length}</span></h2>
    <p class="group-note">Amit az ügyelet a másnapi ellátóknak hagyott, és mi lett vele.</p>
    ${L.left.length ? `<ul class="side-list">${L.left.map(y => { const p = y.patientId ? T.P(y.patientId) : null; return `<li class="side-item"><p class="side-pt">${ptLink(p)}<span class="taj">${esc(T.patientId(p))}</span></p><p class="side-title">„${esc(y.text)}”</p><p class="side-meta">${esc(T.profileName(y.profileId))}</p>${dutyFlow(y)}${ui.undo['duty:' + y.id] ? undoHtml('duty:' + y.id) : ''}</li>`; }).join('')}</ul>` : '<p class="empty">Most nincs ilyen tétel.</p>'}</section></div></div>`;
  return h;
}

/* ---------------- Nézet: összesítő (K9.6, K9.10) ---------------- */
function vOsszesito() {
  const sc = T.leaderScope(); ui.title = 'Összesítő';
  if (!sc) return noAccess('Ehhez a szerephez nem tartozik összesítő.');
  const per = ui.r.q.idoszak || 'het', ty = ui.r.q.tipus || '', S = T.summary(sc, per, ty);
  const scopeName = sc.kind === 'klinika' ? 'a klinika' : sc.kind === 'dept' ? 'a ' + cfg.departments[sc.id].name + ' részleg' : 'a ' + T.profileName(sc.id) + ' profil';
  let worst = null;
  S.rows.forEach(d => d.profiles.forEach(p => p.areas.forEach(a => { const n = a.r.late.c + a.r.late.t; if (n && (!worst || n > worst.n)) worst = { n, a, p, d }; })));
  const cell = (x, late) => { const tot = x.c + x.t; return `<span class="num${late && tot ? ' late' : ''}">${late && tot ? ico('alert') : ''}${tot}</span><span class="split-n">${x.c} ügy · ${x.t} teendő</span>`; };
  const tr = (cls, name, r, link) => `<tr class="${cls}"><th scope="row">${link ? `<a href="${link}">${esc(name)}</a>` : esc(name)}</th><td data-label="Nyitott">${cell(r.open)}</td><td data-label="Lejárt">${cell(r.late, true)}</td><td data-label="Felelős nélkül">${cell(r.unassigned)}</td><td class="hide-sm" data-label="Várakozik">${cell(r.waiting)}</td><td class="hide-md" data-label="Lezárva">${cell(r.closed)}</td></tr>`;
  let rows = '';
  S.rows.forEach(d => {
    if (sc.kind !== 'profile') rows += tr('lv-dept', d.name + ' részleg', d.r);
    d.profiles.forEach(p => { rows += tr('lv-prof', p.name, p.r); p.areas.forEach(a => { rows += tr('lv-area', a.name, a.r, sc.kind === 'profile' ? '#/munkalistak/' + a.id : null); }); });
  });
  if (sc.kind === 'klinika' && !ty) rows += `<tr class="lv-prof"><th scope="row">Klinikai ügyelet</th><td data-label="Nyitott"><span class="num">${S.duty.open}</span><span class="split-n">nyitott tétel</span></td><td data-label="Lejárt"><span class="num${S.duty.late ? ' late' : ''}">${S.duty.late ? ico('alert') : ''}${S.duty.late}</span><span class="split-n">tétel</span></td><td data-label="Felelős nélkül"><span class="num">${S.duty.unaccepted}</span><span class="split-n">még nincs átvéve</span></td><td class="hide-sm"></td><td class="hide-md"></td></tr>`;
  rows += tr('lv-total', 'Összesen', S.total);
  const M = T.metrics(sc, per, ty), R = T.closedByReason(sc, per, ty);
  const persel = ['het', 'honap', 'negyedev', 'ev'].map(k => `<li><a href="#/osszesito?idoszak=${k}${ty ? '&tipus=' + ty : ''}"${k === per ? ' aria-current="page"' : ''}>${esc(cap(T.periodNames[k]))}</a></li>`).join('');
  const tysel = `<div class="field"><label class="field-label" for="os-tipus">Ügytípus</label><select class="select" id="os-tipus" data-act-change="os-type" data-k="os-tipus"><option value="">mind</option>${Object.keys(cfg.types).map(t => `<option value="${t}"${t === ty ? ' selected' : ''}>${esc(cfg.types[t].name)}</option>`).join('')}</select></div>`;
  const md = T.mode(), u = T.U(T.me());
  return `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Összesítő</h1><p class="lede">${esc(cap(scopeName))} · ${esc(D.long(today()))} · ${md === 'leader' ? esc(u.leader.role) + 'ként: csak számok, egyes ügy és beteg nem nyitható meg' : (u.head ? 'osztályvezetőként' : 'főnővérként') + ': a profil számai; az ügyekhez a munkalistákon jutsz el'}</p>${pendingLine()}</div></div>
    <p class="answer">${worst ? `Itt torlódik leginkább a munka: <strong>${esc(worst.a.name)}</strong> (${esc(worst.p.name)}), <span class="late">${worst.n} lejárt tétel</span>.` : 'Most sehol nincs lejárt tétel.'}</p>
    <p class="note-line">A számok ugyanabból készülnek, mint a munkalisták, ezért a kettő mindig ugyanazt mutatja.</p>
    <section class="section" aria-labelledby="h-tabla"><div class="section-head"><h2 id="h-tabla">Nyitott munka, áreánként</h2></div>
      <div class="filters">${tysel}<div class="field"><span class="field-label" id="os-per">A lezártak időszaka</span><ul class="seg" aria-labelledby="os-per">${persel}</ul></div></div>
      <table class="sum-table"><caption class="sr-only">Nyitott, lejárt, felelős nélküli és várakozó tételek, valamint a(z) ${esc(T.periodNames[per])} során lezártak</caption>
      <thead><tr><th scope="col">Hely</th><th scope="col">Nyitott</th><th scope="col">Lejárt</th><th scope="col">Felelős nélkül</th><th scope="col" class="hide-sm">Várakozik</th><th scope="col" class="hide-md">Lezárva: ${esc(T.periodNames[per])}</th></tr></thead>
      <tbody>${rows}</tbody></table></section>
    <section class="section" aria-labelledby="h-mutatok"><div class="section-head"><h2 id="h-mutatok">Mutatók: ${esc(T.periodNames[per])}</h2></div><div class="metrics">
      <p class="metric"><span class="m-val">${M.m1}</span><span class="m-name">Lejárt engedély megújítás nélkül</span><span class="m-desc">Cél: 0. Nem szakad meg terápia engedély hiányában.</span></p>
      <p class="metric"><span class="m-val">${M.m2}</span><span class="m-name">Felelős nélküli nyitott tétel</span><span class="m-desc">Cél: 0. A lista nem hagy ki semmit.</span></p>
      <p class="metric"><span class="m-val">${M.m3}%</span><span class="m-name">Határidőn túli nyitott teendők</span><span class="m-desc">A nyitott teendők arányában.</span></p>
      <p class="metric"><span class="m-val">${M.m4 === null ? 'nincs adat' : M.m4 + '%'}</span><span class="m-name">Rögzített döntés a megbeszélés után</span><span class="m-desc">Két munkanapon belül, teendőkkel; ${M.m4n} megbeszélt eset. Cél: legalább 90%.</span></p></div></section>
    <section class="section" aria-labelledby="h-okok"><div class="section-head"><h2 id="h-okok">Lezárt ügyek ok szerint: ${esc(T.periodNames[per])}</h2></div>
      ${Object.keys(R).length ? `<ul class="reasons">${Object.keys(R).map(k => `<li><span class="r-type">${esc(k)}: ${Object.values(R[k]).reduce((a, b) => a + b, 0)}</span><span class="r-parts">${Object.keys(R[k]).map(r => esc(r) + ' ' + R[k][r]).join(' · ')}</span></li>`).join('')}</ul>` : '<p class="empty">Az időszakban nem zárult le ügy.</p>'}</section>`;
}

/* ---------------- Nézet: munkalisták (K6) ---------------- */
/* A kész nézetek (K6.7) munkafolyamatonként. Az área nézetei az itt futó változatokból jönnek; a profil adminja elrejthet közülük (K6.6).
   A csak megbeszélést tartó área a napirenddel indul, a többi a munkalistával. */
const READY = { vizsgalat: [['eloj', 'Előjegyzendők'], ['idop', 'Időpontra vár'], ['kozelgo', 'Közelgő vizsgálatok']], labor: [['eredmeny', 'Eredményre vár']],
  engedely: [['elok', 'Előkészítendők'], ['hatosag', 'Hatóságnál'], ['lejaro', 'Lejáró engedélyek']], atadas: [['atadandok', 'Átadandók'], ['fogado', 'Fogadó félre vár'], ['utokovetes', 'Utókövetés']],
  konz: [['napirend', 'Napirend'], ['dok', 'Dokumentálandó']], d2t: [['napirend', 'Napirend']] };
const ML = ['munkalista', 'Munkalista'];
function readyViews(area) {
  const a = cfg.areas[area]; if (!a) return [ML];
  const vs = cfg.variants[a.profile] || {}, here = Object.keys(vs).filter(t => vs[t].on && cfg.defaultArea[a.profile][t] === area);
  const meet = here.filter(t => T.isMeet(t) && cfg.series[t]), other = here.filter(t => !T.isMeet(t) && READY[t]);
  const out = [], push = v => { if (!out.some(x => x[0] === v[0])) out.push(v); };
  const meetViews = []; meet.forEach(t => READY[T.flowOf(t)].forEach(v => meetViews.push(v)));
  if (meet.length && !other.length) { meetViews.forEach(push); push(ML); return out; }
  push(ML); ['vizsgalat', 'labor', 'engedely'].forEach(t => { if (other.indexOf(t) > -1) READY[t].forEach(push); });
  meetViews.forEach(push); if (other.indexOf('atadas') > -1) READY.atadas.forEach(push);
  return out;
}
function areaViews(area) { const a = cfg.areas[area], hide = a ? a.hide || [] : []; return readyViews(area).filter(v => v[0] === 'munkalista' || hide.indexOf(v[0]) === -1); }
/* Az áreában tartott megbeszélések (a sorozat áreája a változat áreája) */
function meetsIn(area) { const a = cfg.areas[area]; return a ? Object.keys(cfg.series).filter(k => cfg.series[k].profile === a.profile && cfg.series[k].area === area) : []; }
const VIEW_PRED = {
  elok: c => c.type === 'engedely' && ['elok', 'kesz', 'neakk'].indexOf(c.step) > -1 && !c.closed,
  hatosag: c => c.type === 'engedely' && ['ogyei', 'neak'].indexOf(c.step) > -1 && !c.closed,
  lejaro: c => c.type === 'engedely' && c.step === 'erv' && !c.closed,
  eloj: c => c.type === 'vizsgalat' && c.step === 'eloj' && !c.closed,
  idop: c => c.type === 'vizsgalat' && c.step === 'idop' && !c.closed,
  kozelgo: c => c.type === 'vizsgalat' && (c.step === 'ert' || c.step === 'vizs') && !c.closed,
  dok: c => T.flowOf(c.type) === 'konz' && c.step === 'dok' && !c.closed,
  eredmeny: c => c.type === 'labor' && c.step === 'var' && !c.closed,
  atadandok: c => c.type === 'atadas' && (c.step === 'atd' || c.step === 'dok') && !c.closed,
  fogado: c => c.type === 'atadas' && c.step === 'elk' && !c.closed,
  utokovetes: c => c.type === 'atadas' && c.step === 'ata' && !c.closed
};
const VIEW_SORT = { lejaro: c => c.data.expiresOn, kozelgo: c => c.data.appointment || c.data.to, eredmeny: c => c.data.expectedOn, eloj: c => c.data.to || c.data.from, idop: c => c.waitSince };
function wlFilters(area, q) {
  const f = c => {
    const p = c.patientId ? T.P(c.patientId) : null;
    if (q.forma === 'fekvo' && !(p && T.openAdmission(p.id))) return false;
    if (q.forma === 'jaro' && (!p || T.openAdmission(p.id))) return false;
    if (q.tipus && c.type !== q.tipus) return false;
    if (q.altatas === 'igen' && c.data.anesthesia !== true) return false;
    if (q.altatas === 'nem' && c.data.anesthesia !== false) return false;
    if (q.vizsgalat && c.data.exam !== q.vizsgalat) return false;
    if (q.gyogyszer && T.norm(c.data.drug || '').indexOf(T.norm(q.gyogyszer)) === -1) return false;
    return true;
  };
  return f;
}
function vMunkalistak(areaArg, viewArg) {
  const uid = T.me(), prof = T.U(uid).profile; ui.title = 'Munkalisták';
  let q = Object.assign({}, ui.r.q), area = areaArg || (cfg.areaOrder[prof].find(a => cfg.areas[a].members.indexOf(uid) > -1)) || cfg.areaOrder[prof][0], saved = null;
  if (area && area.indexOf('n-') === 0) { saved = T.state().views.find(v => v.id === area.slice(2) && v.user === uid); if (saved) { q = Object.assign({}, saved.spec.q, ui.r.q); area = saved.spec.area; viewArg = saved.spec.view; } }
  if (area === 'klinika' && !T.isDoctor(uid)) area = 'profil';
  if (area !== 'profil' && area !== 'klinika' && !(cfg.areas[area] && cfg.areas[area].profile === prof)) area = cfg.areaOrder[prof][0];
  /* Az új profilnak még nincs áreája: üres munkalista helyett megmondjuk, mi a teendő */
  if (!area) return `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Munkalisták</h1><p class="lede">${esc(T.profileName(prof))} · ${esc(D.long(today()))}</p></div></div>
    <p class="empty"><strong>A profilnak még nincs áreája.</strong> ${T.isAdminOf(uid, prof) ? 'Áreát a <a href="#/beallitasok">Beállításokban</a> veszel fel; utána itt látod a munkalistáját.' : 'Az áreákat a profil adminja veszi fel; utána itt látod a munkalistájukat.'}</p>
    ${T.isDoctor(uid) ? '<p class="note-line"><a href="#/munkalistak/klinika">A klinika: amit láthatsz</a></p>' : ''}`;
  const views = area === 'profil' || area === 'klinika' ? [ML] : areaViews(area), view = viewArg && views.some(v => v[0] === viewArg) ? viewArg : views[0][0];
  const K = keep(), counts = aid => { const A = T.areaList(aid, { keep: K }); const all = A.working.concat(A.waiting, A.unassigned); return [all.length, all.filter(i => i.late).length]; };
  const navArea = cfg.areaOrder[prof].map(aid => { const n = counts(aid); return `<li><a href="#/munkalistak/${aid}"${!saved && aid === area ? ' aria-current="page"' : ''}><span>${esc(cfg.areas[aid].name)}</span><span class="n${n[1] ? ' late' : ''}">${n[0]}${n[1] ? sr(', ebből ' + n[1] + ' késik') : ''}</span></a></li>`; }).join('');
  const myViews = T.state().views.filter(v => v.user === uid);
  const A = cfg.areas[area], who = A && !saved && (A.owner || A.deputy) ? ' · felelős: ' + (A.owner ? userName(A.owner) : 'nincs') + (A.deputy ? ' · helyettes: ' + userName(A.deputy) : '') : '';
  let h = `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">${saved ? esc(saved.name) : area === 'profil' ? 'A profil összes áreája' : area === 'klinika' ? 'A klinika: amit láthatsz' : esc(A.name)}</h1>
    <p class="lede">${esc(T.profileName(prof))} · ${esc(D.long(today()))}${saved ? ' · saját nézet, csak neked látszik' : esc(who)}</p></div></div>
    <div class="wl"><nav class="wl-nav" aria-label="Áreák és nézetek"><div><h2>Áreák</h2><ul>${navArea}<li><a href="#/munkalistak/profil"${!saved && area === 'profil' ? ' aria-current="page"' : ''}><span>A profil összes áreája</span></a></li>${T.isDoctor(uid) ? `<li><a href="#/munkalistak/klinika"${!saved && area === 'klinika' ? ' aria-current="page"' : ''}><span>A klinika: amit láthatsz</span></a></li>` : ''}</ul></div>
      <div><h2>Saját nézeteim</h2>${myViews.length ? `<ul>${myViews.map(v => `<li><a href="#/munkalistak/n-${v.id}"${saved && saved.id === v.id ? ' aria-current="page"' : ''}><span>${esc(v.name)}</span></a></li>`).join('')}</ul>` : '<p class="hint" style="margin-top:0">Még nincs. A szűrők beállítása után mentheted.</p>'}</div></nav>
    <div class="wl-main">`;
  if (!saved && views.length > 1) h += `<ul class="seg" aria-label="Nézetek">${views.map(v => `<li><a href="#/munkalistak/${area}/${v[0]}"${v[0] === view ? ' aria-current="page"' : ''}>${esc(v[1])}</a></li>`).join('')}</ul>`;
  if (view === 'napirend') return h + agendaHtml(area) + '</div></div>';
  /* szűrők */
  const fsel = (name, label, opts) => `<div class="field"><label class="field-label" for="wf-${name}">${esc(label)}</label><select class="select" id="wf-${name}" data-act-change="wl-filter" data-name="${name}" data-k="wf-${name}">${opts.map(o => `<option value="${esc(o[0])}"${(q[name] || '') === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  let filters = fsel('forma', 'Ellátási forma', [['', 'mind'], ['jaro', 'járó'], ['fekvo', 'fekvő']]);
  if (area === 'profil' || area === 'klinika') filters += fsel('tipus', 'Ügytípus', [['', 'mind']].concat((cfg.newMenu[prof] || []).map(m => [m[0], cfg.types[m[0]].name])));
  if (area === 'mr' || area === 'eeg' || q.tipus === 'vizsgalat') filters += fsel('altatas', 'Altatás', [['', 'mind'], ['igen', 'altatással'], ['nem', 'altatás nélkül']]) + fsel('vizsgalat', 'Vizsgálat', [['', 'mind']].concat(cfg.profiles[prof].exams.map(x => [x, x])));
  if (area === 'eng' || q.tipus === 'engedely') filters += `<div class="field"><label class="field-label" for="wf-gyogyszer">Gyógyszer</label><input class="text-input" id="wf-gyogyszer" type="text" value="${esc(q.gyogyszer || '')}" data-act-change="wl-filter" data-name="gyogyszer" data-k="wf-gyogyszer" autocomplete="off"></div>`;
  filters += fsel('rend', 'Rendezés', [['', 'határidő szerint'], ['lepes', 'lépés szerint'], ['felelos', 'felelős szerint']]);
  h += `<div class="filters">${filters}<div class="field">${ui.f._saveView ? `<form data-form="save-view" class="act-pair" style="justify-content:flex-start"><label class="sr-only" for="f-vname">A nézet neve</label><input class="text-input" id="f-vname" data-f="vname" data-k="f-vname" placeholder="A nézet neve" style="min-width:12rem"><button class="btn-sm btn-fill" type="submit">Mentés</button></form>` : `<button class="btn-sm" type="button" data-act="save-view-open" data-k="sv">Mentés saját nézetként</button>`}</div>${saved ? `<div class="field"><button class="btn-sm" type="button" data-act="view-delete" data-id="${saved.id}">A nézet törlése</button></div>` : ''}</div>`;
  const filt = wlFilters(area, q);
  const sortBy = arr => {
    if (q.rend === 'lepes') return arr.sort((a, b) => (a.c ? T.stepLabel(a.c) : '').localeCompare(b.c ? T.stepLabel(b.c) : '', 'hu'));
    if (q.rend === 'felelos') return arr.sort((a, b) => ownerOf(a).localeCompare(ownerOf(b), 'hu'));
    return arr;
  };
  const aids = area === 'profil' ? cfg.areaOrder[prof] : [area];
  /* A klinika: a saját profil ügyei és más profil bent fekvő betegeinek nyitott ügyei, csak olvashatóként jelölve (K6.8) */
  if (area === 'klinika') {
    const vis = T.state().cases.filter(c => ['write', 'read'].indexOf(T.caseAccess(c)) > -1 && T.isOpen(c) && filt(c));
    const detailFilter = q.altatas || q.vizsgalat || q.gyogyszer;
    const taskOk = t => { const c = T.Cs(t.caseId); if (!c || t.done || T.taskAccess(t) === 'none') return false; return ['write', 'read'].indexOf(T.caseAccess(c)) > -1 ? filt(c) : !detailFilter && filt(Object.assign({}, c, { data: {} })); };
    const its = vis.map(c => ({ kind: 'case', key: 'case:' + c.id, c, date: T.caseDate(c), late: T.caseLate(c) }))
      .concat(T.state().tasks.filter(taskOk).map(t => ({ kind: 'task', key: 'task:' + t.id, t, c: T.Cs(t.caseId), date: t.due, late: T.taskLate(t) })));
    const working = its.filter(i => i.kind === 'task' || T.cat(i.c) !== 'V').sort((a, b) => (a.late === b.late ? ((a.date || '9') < (b.date || '9') ? -1 : 1) : a.late ? -1 : 1)), waiting = its.filter(i => i.kind !== 'task' && T.cat(i.c) === 'V').sort((a, b) => (a.c.waitSince || '') < (b.c.waitSince || '') ? -1 : 1);
    return h + `<p class="note-line">Más profil ügyei és teendői közül csak a most bent fekvő betegek nyitottjai látszanak, olvasásra.</p>` + rowsBlock('h-wd', 'Ezen dolgozz!', sortBy(working), { sort: 'határidő szerint, a lejártak elöl', empty: 'Ebben a nézetben most nincs teendő.' })
      + rowsBlock('h-wv', 'Kire várunk?', sortBy(waiting), { sort: 'a várakozás hossza szerint', cols: ['Várakozik', 'Beteg', 'Ügy', ''], empty: 'Most senkire nem várunk.' }) + '</div></div>';
  }
  if (view === 'munkalista') {
    const acc = { working: [], waiting: [], unassigned: [] };
    aids.forEach(aid => { const A = T.areaList(aid, { keep: K, filter: filt }); acc.working.push(...A.working); acc.waiting.push(...A.waiting); acc.unassigned.push(...A.unassigned); });
    if (aids.length > 1) { const w = acc.working.sort((a, b) => (a.late === b.late ? ((a.date || '9') < (b.date || '9') ? -1 : 1) : a.late ? -1 : 1)); acc.working = w; }
    h += (acc.unassigned.length ? rowsBlock('h-fn', 'Felelős nélkül', sortBy(acc.unassigned), { note: 'Ami nyitott, az valakinek a listáján ott van; ezeket még senki nem vállalta el.' }) : '')
      + rowsBlock('h-wd', 'Ezen dolgozz!', sortBy(acc.working), { sort: q.rend ? (q.rend === 'lepes' ? 'lépés szerint' : 'felelős szerint') : 'határidő szerint, a lejártak elöl', empty: 'Ebben a nézetben most nincs teendő.' })
      + rowsBlock('h-wv', 'Kire várunk?', sortBy(acc.waiting), { sort: 'a várakozás hossza szerint', cols: ['Várakozik', 'Beteg', 'Ügy', ''], empty: 'Most senkire nem várunk.' });
  } else {
    const pred = VIEW_PRED[view], items = T.state().cases.filter(c => aids.indexOf(c.areaId) > -1 && T.caseAccess(c) === 'write' && pred(c) && filt(c)).map(c => ({ kind: 'case', key: 'case:' + c.id, c, date: T.caseDate(c), late: T.caseLate(c) }));
    const sk = VIEW_SORT[view]; if (sk) items.sort((a, b) => (sk(a.c) || '9') < (sk(b.c) || '9') ? -1 : 1);
    h += rowsBlock('h-view', views.find(v => v[0] === view)[1], sortBy(items), { sort: view === 'lejaro' ? 'a lejárat szerint' : view === 'kozelgo' ? 'az időpont szerint' : view === 'eredmeny' ? 'a várható nap szerint' : '', empty: 'Ebben a nézetben most nincs tétel.' });
  }
  return h + '</div></div>';
}
function ownerOf(it) { const o = it.kind === 'task' ? it.t.owner : it.c.owners[0]; return o ? userName(o) : 'ö'; }
/* Napirend: magától áll össze a bejelentett esetekből; előszűrés (K5.11) */
function agendaHtml(area) {
  const list = meetsIn(area); if (!list.length) return '<p class="empty">Ebben az áreában most nincs megbeszélés.</p>';
  const type = list.indexOf(ui.r.q.mb) > -1 ? ui.r.q.mb : list[0], sk = type, S = cfg.series[sk], mq = list.length > 1 ? '&mb=' + type : '';
  const cs = T.state().cases.filter(c => c.type === type && c.meeting && T.caseAccess(c) === 'write' && (!c.closed || ui.undo['case:' + c.id] || c.closed.at.slice(0, 10) === today()));
  /* Az alkalmak: amelyeken eset van, és a sorozat legközelebbi négy alkalma, hogy a még üres alkalomra is fel lehessen venni esetet (K5.11) */
  const dates = Array.from(new Set(cs.filter(c => c.meeting >= today() || !c.closed).map(c => c.meeting).concat(T.meetingsAhead(sk, 4)))).sort();
  const sel = ui.r.q.alkalom && dates.indexOf(ui.r.q.alkalom) > -1 ? ui.r.q.alkalom : dates.find(d => d >= today()) || dates[dates.length - 1] || T.nextMeeting(sk);
  const items = cs.filter(c => c.meeting === sel);
  const dl = T.meetingDeadline(sk, sel), past = D.mins(T.now()) > D.mins(dl);
  const one = c => {
    const p = T.P(c.patientId), miss = T.missingFields(c), key = 'case:' + c.id, k = kidsParts(c, key, false), hasMiss = miss.length > 0 && !c.closed;
    const acts = ui.undo[key] ? undoHtml(key) : c.closed ? `<span class="muted">${ico('check')}lezárva: ${esc(c.closed.reason)}</span>` : (c.triage === 'tudomásul'
      ? `<button class="btn-sm" type="button" data-act="ack" data-id="${c.id}" data-k="act:${key}">Tudomásul vettük</button><button class="btn-sm" type="button" data-act="triage" data-id="${c.id}" data-val="megbeszéljük">Mégis megbeszéljük</button>`
      : `${c.decision ? `<a class="btn-sm" href="#/ugy/${c.id}">A döntés és a teendők</a>` : `${c.step === 'nap' ? `<button class="btn-sm" type="button" data-act="step" data-id="${c.id}" data-to="dok" data-key="${esc(key)}">Megbeszéltük</button>` : ''}<a class="btn-sm btn-fill" href="#/ugy/${c.id}?dontes=1" data-k="act:${key}">Döntés rögzítése…</a>`}<button class="btn-sm" type="button" data-act="triage" data-id="${c.id}" data-val="tudomásul">Csak tudomásul vesszük</button>`);
    return `<li class="row"><div class="cell-due">${sr('Bejelentette: ')}<span class="main">${esc(userName(c.owners[0] || c.created.by))}</span><span class="sub">${esc(T.relAt(c.created.at))}</span></div>
      <div class="cell-pt">${sr('Beteg: ')}${ptLink(p)}<span class="pt-id">${ptIdLine(p)}</span></div>
      <div class="cell-what">${originKin(c)}<a class="what-title" href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a>${subWithKids(`${esc(c.data.region || '')}${c.data.region ? ' · ' : ''}${esc(T.stepLabel(c))}${(c.his || []).length ? ' · HIS: ' + esc(c.his.map(x => x.ref).join(', ')) : ''}${(c.files || []).length ? ' · ' + c.files.length + ' csatolmány' : ''}`, hasMiss ? null : k)}
        ${hasMiss ? `<span class="sub"><strong class="late">${ico('alert')} Hiányzik: ${esc(miss.join(', '))}</strong></span>${k ? k.btn : ''}` : ''}${k ? k.list : ''}</div>
      <div class="cell-act"><div class="act-pair">${acts}</div></div></li>`;
  };
  const disc = items.filter(c => c.triage !== 'tudomásul'), ack = items.filter(c => c.triage === 'tudomásul');
  /* Új eset a napirendről, erre az alkalomra (K5.11; CT, 2026-11-19): az új ügy űrlapja helyben nyílik, az alkalom előre kitöltve */
  const np = ui.panel && ui.panel.kind === 'new-case' && ui.panel.from === 'agenda' ? ui.panel : null;
  const canNew = sel >= today() && (cfg.newMenu[T.U(T.me()).profile] || []).some(m => m[0] === type);
  const newBtn = canNew && !np ? `<button class="btn btn-secondary" type="button" data-act="agenda-new" data-type="${type}" data-meeting="${sel}" data-k="agenda-new">${ico('plus')}Új eset erre az alkalomra</button>` : '';
  return `<div class="section" style="margin-top:2rem">${list.length > 1 ? `<ul class="seg" aria-label="Megbeszélések" style="margin:0 0 1.25rem">${list.map(k => `<li><a href="#/munkalistak/${area}/napirend?mb=${k}"${k === type ? ' aria-current="page"' : ''}>${esc(cfg.series[k].name)}</a></li>`).join('')}</ul>` : ''}
    <div class="agenda-top"><div><p class="lede"><strong>${esc(cap(D.dayName(sel)))}, ${esc(fmtDate(sel))}</strong> · ${esc(S.name)} · bejelentési határidő: ${esc(T.relAt(dl))}${past ? ' (lejárt; a napirend összeállt)' : ''}</p>
    ${S.participants.length ? `<p class="note-line">Résztvevők: ${S.participants.map(x => esc(userName(x))).join(', ')}</p>` : ''}</div>${newBtn ? `<div class="head-actions">${newBtn}</div>` : ''}</div>
    ${dates.length > 1 ? `<ul class="seg" aria-label="Alkalmak">${dates.map(d => `<li><a href="#/munkalistak/${area}/napirend?alkalom=${d}${mq}"${d === sel ? ' aria-current="page"' : ''}>${esc(fmtDate(d))}</a></li>`).join('')}</ul>` : ''}
    <p class="note-line">A napirendet senkinek nem kell összeállítania: a bejelentett esetekből magától áll össze. A hiányos bejelentés is rajta van, a hiány jelölésével.</p>
    ${np ? newCasePanel(np) : ''}</div>
    <section class="group" aria-labelledby="h-meg" style="margin-top:2.5rem"><div class="group-head"><h2 class="group-title" id="h-meg">Megbeszéljük <span class="count">${disc.length}</span></h2></div>
    ${disc.length ? `<div class="cols" aria-hidden="true"><span>Bejelentő</span><span>Beteg</span><span>Kérdés</span><span></span></div><ul class="rows">${disc.map(one).join('')}</ul>` : '<p class="empty">Erre az alkalomra még nincs megbeszélendő eset.</p>'}</section>
    <section class="group" aria-labelledby="h-tud"><div class="group-head"><h2 class="group-title" id="h-tud">Csak tudomásul vesszük <span class="count">${ack.length}</span></h2></div>
    ${ack.length ? `<ul class="rows">${ack.map(one).join('')}</ul>` : '<p class="empty">Nincs ilyen eset.</p>'}</section>`;
}

/* ---------------- Nézet: archívum és keresés (K10, K4.16) ---------------- */
function vArchivum() {
  ui.title = 'Archívum'; const a = ui.arch;
  const types = Object.keys(cfg.types).map(t => [t, cfg.types[t].name]).concat([['ugyelet', 'Ügyeleti tétel (mindkét irány)']]);
  const sel = (name, label, opts, blank) => `<div class="field"><label class="field-label" for="ar-${name}">${esc(label)}</label><select class="select" id="ar-${name}" data-arch="${name}" data-k="ar-${name}"><option value="">${esc(blank)}</option>${opts.map(o => `<option value="${esc(o[0])}"${a[name] === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
  const any = a.text || a.patient || a.type || a.period || a.state || a.reason;
  const dutyMode = a.type === 'ugyelet';
  const res = any ? (dutyMode ? T.searchDuty(a) : T.search(a)) : [];
  const lim = ui.archLimit || 60;
  const byReason = {}; if (!dutyMode) res.forEach(r => { if (r.c.closed && r.acc !== 'header') byReason[r.c.closed.reason] = (byReason[r.c.closed.reason] || 0) + 1; });
  const labels = T.usedLabels();
  const row = r => {
    const c = r.c, p = c.patientId ? T.P(c.patientId) : null, detail = r.acc === 'write' || r.acc === 'read';
    const when = c.closed ? c.closed.at.slice(0, 10) : c.created.at.slice(0, 10), k = detail ? kidsParts(c, 'arch:' + c.id, false) : null;
    const status = c.closed ? 'lezárva: ' + c.closed.reason : T.stepLabel(c) + ' (' + T.catWord[T.cat(c)] + ')';
    return `<li class="row"><div class="cell-due"><span class="main">${esc(fmtDate(when))}</span><span class="sub">${c.closed ? 'lezárva' : 'indult'}</span></div>
      <div class="cell-pt">${sr('Beteg: ')}${ptLink(p)}${p ? `<span class="pt-id"><span class="taj">${esc(T.patientId(p))}</span></span>` : ''}</div>
      <div class="cell-what">${detail ? originKin(c) + `<a class="what-title" href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a>` : `<span class="what-title">${esc(T.commonType(c))}</span>`}
        ${subWithKids(`${esc(detail ? typeName(c) : T.commonType(c))} · ${esc(detail ? status : (c.closed ? 'lezárt' : T.catWord[T.cat(c)]))} · ${esc(T.profileName(c.profileId))}${detail && c.files.length ? ' · ' + ico('file') + ' ' + c.files.map(x => esc(x.name)).join(', ') : ''}${detail && c.labels.length ? ' · ' + ico('tag') + ' ' + c.labels.map(esc).join(', ') : ''}${!detail ? ' · csak fejléc (más profil betege)' : ''}`, detail && c.decision ? null : k)}
        ${detail && c.decision ? subWithKids(`Döntés: „${esc(c.decision)}”`, k) : ''}${k ? k.list : ''}</div><div class="cell-act"></div></li>`;
  };
  const drow = y => { const p = y.patientId ? T.P(y.patientId) : null;
    return `<li class="row"><div class="cell-due"><span class="main">${esc(fmtDate((y.closed ? y.closed.at : y.at).slice(0, 10)))}</span><span class="sub">${y.closed ? 'lezárva' : 'nyitott'}</span></div>
      <div class="cell-pt">${sr('Beteg: ')}${p ? ptLink(p) + `<span class="pt-id"><span class="taj">${esc(T.patientId(p))}</span></span>` : '<span class="none">beteg nélkül</span>'}</div>
      <div class="cell-what"><span class="what-title">„${esc(y.text)}”</span><span class="sub">${y.dir === 'from' ? 'Az ügyelet hagyta a(z) ' + esc(T.profileName(y.profileId)) + ' osztályának' : 'Kiutalva az ügyeletnek, ' + esc(T.profileName(y.profileId))}</span>${dutyFlow(y)}</div><div class="cell-act"></div></li>`; };
  const shown = res.slice(0, lim);
  return `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Archívum és keresés</h1><p class="lede">Nyitott és lezárt ügyek és ügyeleti tételek között; csak azt mutatja, amit a szerepköröd szerint láthatsz.</p></div></div>
    <form class="search-form" data-form="arch" role="search" aria-label="Ügyek keresése">
      <div class="field"><label class="field-label" for="ar-text">Mit keresel?</label><input class="text-input" id="ar-text" type="search" list="cimkek" data-arch="text" data-k="ar-text" value="${esc(a.text || '')}" placeholder="gyógyszer, vizsgálat, döntés, címke…" autocomplete="off"><datalist id="cimkek">${labels.map(l => `<option value="${esc(l)}">`).join('')}</datalist></div>
      <div class="field"><label class="field-label" for="ar-patient">Beteg</label><input class="text-input" id="ar-patient" type="search" data-arch="patient" data-k="ar-patient" value="${esc(a.patient || '')}" placeholder="név, TAJ vagy ideiglenes azonosító" autocomplete="off"></div>
      ${sel('type', 'Ügytípus', types, 'mind')}${sel('period', 'Időszak', [['honap', 'az elmúlt hónap'], ['negyedev', 'az elmúlt negyedév'], ['ev', 'az elmúlt év']], 'bármikor')}
      ${sel('state', 'Állapot', [['closed', 'lezárt'], ['open', 'nyitott']], 'nyitott és lezárt')}</form>
    <p class="sr-only" aria-live="polite" id="ar-live">${any ? res.length + ' találat' : ''}</p>
    ${any ? `<div class="facets"><span class="lbl">${res.length} találat${res.length > shown.length ? ', ebből ' + shown.length + ' látszik' : ''}${Object.keys(byReason).length ? ' · lezárási ok szerint:' : ''}</span>${Object.keys(byReason).map(r => `<button class="btn-sm${a.reason === r ? ' btn-fill' : ''}" type="button" data-act="arch-reason" data-reason="${esc(r)}" aria-pressed="${a.reason === r}">${esc(r)} ${byReason[r]}</button>`).join('')}${a.reason ? `<button class="link-btn lg" type="button" data-act="arch-reason" data-reason="">minden ok</button>` : ''}</div>
      ${res.length ? `<div class="cols" aria-hidden="true" style="margin-top:1.5rem"><span>Dátum</span><span>Beteg</span><span>${dutyMode ? 'Ügyeleti tétel' : 'Ügy'}</span><span></span></div><ul class="rows">${shown.map(dutyMode ? drow : row).join('')}</ul>
        ${res.length > shown.length ? `<div class="form-actions"><button class="btn btn-quiet" type="button" data-act="arch-more" data-k="arch-more">További találatok (még ${res.length - shown.length})</button></div>` : ''}` : '<p class="empty">Nincs találat. Próbáld rövidebb szóval, vagy bővítsd az időszakot.</p>'}`
      : '<p class="empty">Írj be egy szót (például egy gyógyszer nevét vagy egy címkét), vagy válassz ügytípust.</p>'}`;
}

/* ---------------- Nézet: betegkártya ---------------- */
function noAccess(msg) { ui.title = 'Nincs hozzáférés'; return `<h1 tabindex="-1" data-k="h1">Ez itt nem nyitható meg</h1><p class="lede">${esc(msg)}</p>`; }
function trackHtml(c) {
  const t = T.typeOf(c), steps = menuSteps(c).filter(s => !s.alt || s.id === c.step);
  const altPath = c.type === 'vizsgalat' && (c.step === 'lem' || (c.closed && c.closed.reason === 'lemondva'));
  const closeSteps = t.closeSteps || [];
  const endLabel = c.closed ? (c.closed.step ? T.stepLabel(c, c.closed.step) : (t.end[c.closed.reason] || t.end._)) : altPath ? 'lemondva' : c.type === 'engedely' ? 'lejárt vagy megújítva'
    : closeSteps.length ? closeSteps.map(s => T.stepLabel(c, s.id)).join(' vagy ') : (t.end['teljesült'] || t.end._);
  const list = altPath ? ['eloj', 'idop', 'lem'] : steps.filter(s => !s.alt).map(s => s.id);
  const curIdx = c.closed ? list.length : list.indexOf(c.step);
  const li = list.map((sid, j) => {
    const lbl = esc(T.stepLabel(c, sid));
    if (j < curIdx) return `<li class="done"><span class="dot" aria-hidden="true"></span>${lbl}${sr(' (megvolt)')}</li>`;
    if (j === curIdx) return `<li class="now" aria-current="step"><span class="dot" aria-hidden="true"></span>${lbl}</li>`;
    return `<li><span class="dot" aria-hidden="true"></span>${lbl}</li>`;
  });
  li.push(c.closed ? `<li class="now" aria-current="step"><span class="dot" aria-hidden="true"></span>${esc(endLabel)}${sr(' (lezárva)')}</li>` : `<li><span class="dot" aria-hidden="true"></span>${esc(endLabel)}</li>`);
  return `<ol class="track" aria-label="Lépések">${li.join('')}</ol>`;
}
function kvHtml(c, full) {
  const d = c.data || {}, rows = [];
  const add = (k, v, cls) => { if (v !== undefined && v !== null && v !== '') rows.push(`<div><dt>${esc(k)}</dt><dd${cls ? ` class="${cls}"` : ''}>${v}</dd></div>`); };
  add('Felelős', c.owners.length ? c.owners.map(o => esc(userName(o))).join(', ') : '<strong class="late">nincs még felelős</strong>');
  if (c.watchers.length && full) add('Figyelő', c.watchers.map(o => esc(userName(o))).join(', '));
  if (c.type === 'engedely') { add('Gyógyszer', esc(d.drug)); add('Indikáció', esc(d.indication)); add('Kérelemtípus', esc(d.reqType)); add('Indikáción túli', d.offLabel === true ? 'igen' : d.offLabel === false ? 'nem' : ''); add('Hatóság', d.offLabel === false ? 'NEAK' : d.offLabel === true ? 'OGYÉI, NEAK' : ''); add('Beküldés', esc(fmtDate(d.sentOn))); if (full) add('OGYÉI-engedély', esc(fmtDate(d.ogyeiOn))); add('Határozat', esc(fmtDate(d.decidedOn))); add('Érvényes eddig', esc(fmtDate(d.expiresOn))); if (full && d.prevExpires) add('Az előző lejárt volna', esc(fmtDate(d.prevExpires))); }
  if (c.type === 'vizsgalat') { add('Vizsgálat', esc(d.exam)); add('Régió', esc(d.region)); add('Időablak', d.from || d.to ? esc(fmtDate(d.from) + ' – ' + fmtDate(d.to)) : ''); add('Altatás', d.anesthesia === true ? 'igen' : d.anesthesia === false ? 'nem' : ''); add('Időpont', esc(fmtDate(d.appointment))); }
  if (c.type === 'labor') { add('Vizsgálat', esc(d.test)); add('Kérés napja', esc(fmtDate(d.requestedOn))); add('Várható eredmény', esc(fmtDate(d.expectedOn))); add('Kinek kell jelezni', d.notify ? esc(userName(d.notify)) : ''); }
  if (c.type === 'atadas') { add('Fogadó intézmény', esc(d.institution)); add('Fogadó orvos', esc(d.recvDoctor)); add('Elérhetőség', esc(d.contact)); add('Tervezett nap', esc(fmtDate(d.plannedOn))); add('Koordinátor', d.coordinator ? esc(userName(d.coordinator)) : ''); add('Átadó dokumentum', d.docReady ? 'elkészült' : 'még nincs kész');
    const before = c.contacts.filter(x => !x.after).length, after = c.contacts.filter(x => x.after).length; add('Kapcsolatfelvétel', `${before} az átadás előtt, ${after} utána`); }
  if (T.isMeet(c.type)) { add('Alkalom', c.meeting ? esc(D.dayName(c.meeting) + ', ' + fmtDate(c.meeting)) : ''); add('Régió', esc(d.region)); if (c.due) add('Határidő', esc(fmtDate(c.due))); const miss = T.missingFields(c); if (miss.length && !c.closed) add('Hiányzik', esc(miss.join(', ')), 'miss'); }
  plusOf(c.profileId, c.type).forEach(x => add(x.label, x.kind === 'yn' ? (d[x.id] === true ? 'igen' : d[x.id] === false ? 'nem' : '') : esc(d[x.id])));
  if (c.type === 'altalanos' && c.due) add('Határidő', esc(fmtDate(c.due)));
  add('HIS-hivatkozás', (c.his || []).map(x => esc(x.ref) + ' <span class="muted">(' + esc(x.kind) + ')</span>').join(', '));
  if (c.patientId) add('Indult', esc(c.startedAs) + ' ellátásban');
  return `<dl class="kv">${rows.join('')}</dl>`;
}
function caseBlock(c, acc) {
  const key = 'case:' + c.id, late = T.caseLate(c);
  let due = '';
  if (T.permitExpired(c)) due = `<p class="case-due is-late">${ico('alert')}${D.diff(today(), c.data.expiresOn)} napja lejárt</p>`;
  else if (c.closed) due = `<p class="case-due">${ico('check')}lezárva: ${esc(c.closed.reason)}</p>`;
  else if (T.cat(c) === 'V') { const w = (T.stepDef(c) || {}).wait; due = `<p class="case-due is-wait">${ico('clock')}${esc(c.type === 'atadas' ? (c.data.institution || '').split(',')[0] : w || '')} · ${esc(T.waitLen(c.waitSince || today()))}</p>`; }
  else { const dt = T.caseDate(c); if (dt) due = `<p class="case-due${late ? ' is-late' : ''}">${late ? ico('alert') : ''}${esc(c.type === 'engedely' && c.step === 'erv' ? 'lejár: ' + fmtDate(dt) : T.relDue(dt))}</p>`; }
  return `<article class="case${c.closed ? ' is-done' : ''}${acc === 'read' ? ' is-ro' : ''}" aria-labelledby="cs-${c.id}">
    <div class="case-top"><p class="case-kind">${esc(kindLine(c))}${acc === 'read' ? ' · ' + esc(T.profileName(c.profileId)) : ''}</p>${due}</div>
    ${originKin(c)}<h4 class="case-title" id="cs-${c.id}"><a href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a></h4>
    ${trackHtml(c)}${kvHtml(c, false)}
    ${kidsHtml(c, key, true)}
    ${acc === 'write' ? `<div class="case-actions">${caseActions(c, key, 'lg')}</div>${promptHtml(c, key)}` : ''}
  </article>`;
}
function vBeteg(pid) {
  ui.title = 'Betegkártya';
  if (T.mode() === 'leader') return noAccess('Vezetői szerepben egyes beteg és ügy nem nyitható meg; az összesítő csak számokat mutat.' + (T.modesOf(T.me()).length > 1 ? ' A szerepet fent, a neved alatt válthatod.' : ''));
  const p = T.P(pid); if (p && p.merged) { return `<div><h1 tabindex="-1" data-k="h1">Ezt a rekordot összevonták</h1><p class="lede"><a href="#/beteg/${p.merged}">A megmaradt rekord megnyitása</a></p></div>`; }
  const acc = p ? T.patientAccess(pid) : 'none';
  if (acc === 'none') return noAccess('Ez a beteg nem a te profilod betege, ezért az ügyeit nem látod.');
  const uid = T.me(), u = T.U(uid), own = acc === 'own', adm = T.openAdmission(pid);
  const g = own ? T.careIn(pid, u.profile) : null, gAll = T.caresOf(pid);
  const cases = T.state().cases.filter(c => c.patientId === pid);
  const vis = cases.map(c => ({ c, a: T.caseAccess(c) })).filter(x => x.a !== 'none');
  const openC = vis.filter(x => (x.a === 'write' || x.a === 'read') && (T.isOpen(x.c) || T.permitExpired(x.c) || ui.undo['case:' + x.c.id]));
  const working = openC.filter(x => T.cat(x.c) !== 'V' || ui.undo['case:' + x.c.id]), waiting = openC.filter(x => T.cat(x.c) === 'V' && !ui.undo['case:' + x.c.id]);
  const done = vis.filter(x => x.a === 'write' && T.cat(x.c) === 'K' && !T.permitExpired(x.c));
  const headers = vis.filter(x => x.a === 'header');
  const nOpen = vis.filter(x => T.isOpen(x.c) && x.a !== 'header').length, nWait = waiting.length;
  const admUndo = ui.undo['adm:' + pid] ? undoHtml('adm:' + pid) : '';
  const stateChip = adm ? `<span class="state">${ico('bed')}Fekvő</span><span>${esc(adm.place)} · ${esc(fmtDate(adm.start))} óta (${(n => n === 0 ? 'ma' : n === 1 ? 'tegnap' : n + ' napja')(D.diff(today(), adm.start))})</span>${own && adm.profileId === u.profile ? `<button class="link-btn lg" type="button" data-act="discharge" data-pid="${pid}" data-k="discharge">${ico('out')} Hazabocsátás rögzítése</button>` : ''}`
    : `<span class="state out">Járó</span><span>${esc(gAll.filter(x => !x.ended).map(x => T.profileName(x.profileId)).join(', ') || 'nincs élő gondozás')}</span>`;
  const back = crumbBack();
  const ident = p.taj ? `<span class="taj">${esc(T.patientId(p))}</span>` : `<span class="taj">Ideiglenes azonosító: ${esc(p.temp)}</span> · <span>ok: ${esc(p.tempReason || '–')}</span>${own ? ` · <button class="link-btn lg" type="button" data-act="panel" data-panel="taj" data-pid="${pid}" data-k="taj">TAJ beírása</button>` : ''}`;
  /* Az ügyeletes az ügyeleti listáról jövet a beteg osztályának hagyhat tételt (K8.8); felvétel nélkül is */
  const wardBtn = T.U(uid).duty && (dutyCtx() || !own) ? `<button class="btn btn-secondary" type="button" data-act="panel" data-panel="ward" data-pid="${pid}" data-k="ward">${ico('inbox')}Tétel az osztálynak</button>` : '';
  const actions = (own && !dutyCtx() ? `${newCaseMenu(pid)}<button class="btn btn-secondary" type="button" data-act="panel" data-panel="kiutal" data-pid="${pid}" data-k="kiutal" aria-expanded="${!!(ui.panel && ui.panel.kind === 'kiutal')}">${ico('send')}Kiutalás az ügyeletnek</button>` : '') + wardBtn;
  let h = `<nav class="crumbs" aria-label="Hol vagy"><a href="${back[0]}">${esc(back[1])}</a><span aria-hidden="true">/</span><span aria-current="page">Betegkártya</span></nav>
  <section class="ident" aria-labelledby="beteg"><div class="ident-top"><div>
    <p class="kicker">Betegkártya${own ? '' : ' · <span class="ro">más profil betege, csak olvasható</span>'}</p>
    <h1 id="beteg" tabindex="-1" data-k="h1">${esc(p.name || T.patientId(p))}</h1>
    <p class="ident-id">${p.name ? ident : (own ? `<span class="muted">Név még nincs megadva</span> · <button class="link-btn lg" type="button" data-act="panel" data-panel="name" data-pid="${pid}">Név megadása</button>` : '')}${p.age ? ' · ' + p.age + ' éves' : ''}</p>
    <p class="ident-status">${stateChip}</p>${admUndo}</div>
    <div class="ident-actions">${actions}</div></div></section>`;
  /* A gondozás sávja a bal hasáb tetején áll, az ügyek fölött; így nem lóg az ügyeleti tételek fölé, és a jobb hasáb a sávval egy magasságban indul (CT, 2026-11-19) */
  const strip = `<dl class="strip">${g ? `<div><dt>Gondozás</dt><dd>${esc(T.profileName(g.profileId))}, ${esc(fmtDate(g.since))} óta${g.ended ? ' · lezárva: ' + esc(g.ended.reason) + ', ' + esc(fmtDate(g.ended.on)) : ''}</dd></div><div><dt>Kezelőorvos</dt><dd>${g.doctor ? esc(userName(g.doctor)) : '<span class="muted">még nincs megadva</span>'}</dd></div><div><dt>Fő diagnózis</dt><dd>${g.dx ? esc(g.dx) : '<span class="muted">még nincs megadva</span>'}</dd></div>`
      : `<div><dt>Gondozás</dt><dd>${esc(gAll.map(x => T.profileName(x.profileId)).join(', '))} (más profil)</dd></div><div><dt>Kezelőorvos</dt><dd class="muted">a gondozó profilnál</dd></div><div><dt>Fő diagnózis</dt><dd class="muted">a gondozó profilnál</dd></div>`}
      <div><dt>Nyitott ügyek</dt><dd>${nOpen}${nWait ? ', ebből ' + nWait + ' várakozik' : ''}</dd></div></dl>`;
  if (!p.taj && own) h += `<p class="note-line">${ico('alert')} TAJ még nincs: ideiglenes azonosítóval ugyanúgy dolgozhatsz; ha megvan a TAJ, írd be ide.</p>`;
  h += panelHtml();
  if (!own) h += `<div class="ro-banner">${ico('lock')}<div><p><strong>Csak olvasható.</strong> ${adm ? 'A beteg most bent fekszik, ezért a nyitott ügyeit és teendőit olvashatod; szerkeszteni a gondozó profil tudja.' : 'A beteg most nem fekszik bent, ezért más profil ügyeiből csak a fejlécet látod: ügytípus, státusz, dátum, felelős profil.'}</p><p class="sub">${esc(gAll.map(x => T.profileName(x.profileId)).join(', '))} betege. A megnyitás a naplóba kerül.</p></div></div>`;
  const grp = (title, list, empty) => `<h3 class="sub-head">${esc(title)}</h3><div class="grp">${list.length ? list.map(x => caseBlock(x.c, x.a)).join('') : `<p class="grp-empty">${empty}</p>`}</div>`;
  h += `<div class="layout wide-side card-layout"><div class="primary">${strip}`;
  if (own || openC.length) h += `<section class="group" aria-labelledby="h-nyitott"><h2 class="group-title" id="h-nyitott" tabindex="-1">Nyitott ügyek <span class="count">${openC.length}</span></h2>
    ${grp('Ezen dolgozz!', working, 'Most nincs ilyen ügy.')}${grp('Kire várunk?', waiting, 'Most senkire nem várunk.')}</section>`;
  if (done.length) h += `<section class="group" aria-labelledby="h-kesz"><h2 class="group-title" id="h-kesz">Kész, még él <span class="count">${done.length}</span></h2><p class="group-note">Érvényes engedélyek a lejáratig, átadott beteg az utólagos kapcsolatfelvételig.</p>${done.map(x => caseBlock(x.c, x.a)).join('')}</section>`;
  if (headers.length) h += `<section class="group" aria-labelledby="h-fejlec"><h2 class="group-title" id="h-fejlec">Más profil ügyei: csak fejléc <span class="count">${headers.length}</span></h2>
    <table class="hdr-table"><thead><tr><th scope="col">Ügytípus</th><th scope="col">Státusz</th><th scope="col">Dátum</th><th scope="col">Felelős profil</th></tr></thead><tbody>${headers.map(x => `<tr><td data-label="Ügytípus">${esc(T.commonType(x.c))}</td><td data-label="Státusz">${esc(x.c.closed ? 'lezárt' : T.catWord[T.cat(x.c)])}</td><td data-label="Dátum">${esc(fmtDate(x.c.created.at.slice(0, 10)))}</td><td data-label="Felelős profil">${esc(T.profileName(x.c.profileId))}</td></tr>`).join('')}</tbody></table></section>`;
  /* Más profil olvasható nyitott teendői, teendőnként ellenőrzött joggal, akkor is, ha a beteget a saját profil is gondozza */
  const roTasks = T.state().tasks.filter(t => { const c = T.Cs(t.caseId); return c && c.patientId === pid && T.taskAccess(t) === 'read'; });
  if (roTasks.length) h += `<section class="group" aria-labelledby="h-roteendo"><h2 class="group-title" id="h-roteendo">${own ? 'Más profil nyitott teendői' : 'Nyitott teendők'} <span class="count">${roTasks.length}</span></h2><p class="group-note">Olvasásra, a gondozó profil teendői; lezárt ügynél csak az ügy fejléce látszik.</p>
    <ul class="plain-list">${roTasks.map(t => { const c = T.Cs(t.caseId), hdr = T.caseAccess(c) === 'header'; return `<li><div class="li-main"><span>${esc(t.text)}</span><span class="muted">${t.due ? 'határidő: ' + esc(fmtDate(t.due)) : 'nincs határidő'}</span></div><p class="li-sub">Felelős: ${t.owner ? esc(userName(t.owner)) : 'még nincs'} · ${hdr ? esc(T.commonType(c)) + ' (' + esc(c.closed ? 'lezárt' : T.catWord[T.cat(c)]) + ', csak fejléc)' : `<a href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a>`} · ${esc(T.profileName(c.profileId))}</p></li>`; }).join('')}</ul></section>`;
  h += `</div><div class="side">${patientDutyHtml(pid, own)}${historyHtml(pid, vis, own)}
    <ul class="side-links">${T.canAudit() && own ? `<li><a href="#/naplo/${pid}">${ico('lock')} Ki nézte meg? (napló)</a></li>` : ''}${T.canMerge() && own ? `<li><a href="#/osszevonas/${pid}">Összevetés és összevonás egy másik rekorddal</a></li>` : ''}</ul></div></div>`;
  return h;
}
function patientDutyHtml(pid, own) {
  const L = T.patientDuty(pid);
  if (!own) { if (!T.openAdmission(pid)) return ''; L.to = L.to.filter(y => !y.closed); L.from = L.from.filter(y => !y.closed); }
  const item = y => { const key = 'duty:' + y.id; return `<li class="duty-item${ui.undo[key] && !y.closed ? ' is-new' : ''}"><p class="duty-title">„${esc(y.text)}”</p><p class="duty-meta">${y.dir === 'from' ? 'Az ügyelet hagyta: ' + esc(userName(y.by)) + ' · ' + esc(T.profileName(y.profileId)) + ' osztályának' : 'Kiutalta: ' + esc(userName(y.by))}${y.due ? ' · mikorra: ' + esc(T.relAt(y.due)) : ''}</p>${dutyFlow(y)}${ui.undo[key] ? undoHtml(key) : ''}
    ${y.dir === 'from' && !y.closed && !ui.undo[key] && T.isMember(T.me(), y.profileId) && !dutyCtx() ? `<div class="case-actions" style="margin-top:.75rem">${y.accepted ? `<button class="btn-sm btn-fill" type="button" data-act="duty-close" data-id="${y.id}">${ico('check')}Lezárás</button>` : `<button class="btn-sm btn-fill" type="button" data-act="duty-accept" data-id="${y.id}">Átveszem</button>`}</div>` : ''}</li>`; };
  /* Az ügyeleti tételek saját, halvány lapon: a klinikai ügyelettel közös munka, külön a profil ügyeitől (CT, 2026-11-19) */
  return `<section class="group duty-box" aria-labelledby="h-ugyelet"><h2 class="group-title" id="h-ugyelet">Ügyeleti tételek <span class="count">${L.to.length + L.from.length}</span></h2>
    <h3 class="duty-dir">${ico('send')} Kiutalva az ügyeletnek</h3>${L.to.length ? `<ul class="duty">${L.to.map(item).join('')}</ul>` : '<p class="grp-empty">Nincs.</p>'}
    <h3 class="duty-dir">${ico('inbox')} Az ügyelettől az osztálynak</h3>${L.from.length ? `<ul class="duty">${L.from.map(item).join('')}</ul>` : '<p class="grp-empty">Nincs.</p>'}</section>`;
}
function historyHtml(pid, vis, own) {
  const ev = [];
  /* A bejegyzés alatt: honnan indult, illetve a kézzel kapcsolt ügy (K4.11) */
  const relName = o => detailAcc(o.acc) ? `<a href="#/ugy/${o.c.id}">${esc(shortName(o.c))}</a>` : esc(hdrText(o.c));
  const rels = c => { const o = T.originOf(c), peers = T.linkedOf(c).filter(l => l.rel.kind === 'kapcsolodik');
    return (o ? `<p class="t-meta">Innen indult: ${relName(o)}</p>` : '') + peers.map(l => `<p class="t-meta">Kapcsolódik: ${relName(l)}</p>`).join(''); };
  vis.forEach(x => { if (x.a === 'header') return; ev.push({ at: x.c.created.at, li: `<li${x.c.closed ? ' class="closed"' : ''}><span class="t-dot" aria-hidden="true"></span><p class="t-date">${esc(fmtDate(x.c.created.at.slice(0, 10)))}</p><p class="t-title"><a href="#/ugy/${x.c.id}">${esc(T.caseTitle(x.c))}</a></p><p class="t-meta">${esc(typeName(x.c))} · ${esc(T.profileName(x.c.profileId))} · ${x.c.closed ? 'lezárva: ' + esc(x.c.closed.reason) : 'nyitott'}${x.c.decision ? ' · döntés: ' + esc(x.c.decision) : ''}</p>${rels(x.c)}</li>` }); });
  T.state().appearances.filter(a => a.patientId === pid && (own ? T.isMember(T.me(), a.profileId) : false)).forEach(a => ev.push({ at: a.start + 'T00:00', li: `<li class="visit"><span class="t-dot" aria-hidden="true"></span><p class="t-date">${esc(fmtDate(a.start))}${a.end ? ' – ' + esc(fmtDate(a.end)) : ''}</p><p class="t-title">${a.kind === 'adm' ? 'Felvétel' : 'Ambuláns vizit'}</p><p class="t-meta">Megjelenés · ${esc(a.place)} · ${a.kind === 'adm' ? (a.end ? 'hazabocsátva' : 'bent fekszik') : 'a feladattal együtt rögzítve'}</p></li>` }));
  T.caresOf(pid).filter(g => own && T.isMember(T.me(), g.profileId)).forEach(g => { ev.push({ at: g.since + 'T00:00', li: `<li class="closed"><span class="t-dot" aria-hidden="true"></span><p class="t-date">${esc(fmtDate(g.since))}</p><p class="t-title">A gondozás kezdete</p><p class="t-meta">${esc(T.profileName(g.profileId))}${g.doctor ? ' · kezelőorvos: ' + esc(userName(g.doctor)) : ''}</p></li>` }); if (g.ended) ev.push({ at: g.ended.on + 'T23:59', li: `<li class="closed"><span class="t-dot" aria-hidden="true"></span><p class="t-date">${esc(fmtDate(g.ended.on))}</p><p class="t-title">A gondozás vége</p><p class="t-meta">${esc(T.profileName(g.profileId))} · ${esc(g.ended.reason)}</p></li>` }); });
  ev.sort((a, b) => (b.at > a.at ? 1 : -1));
  return `<section class="group history" aria-labelledby="h-elozmeny"><h2 class="group-title" id="h-elozmeny"><button class="disclose" type="button" aria-expanded="${ui.hist}" aria-controls="elozmeny-test" data-act="hist" data-k="hist">Előzmények <span class="count">${ev.length}</span>${ico('chev')}</button></h2>
    <div id="elozmeny-test"${ui.hist ? '' : ' hidden'}><p class="legend">Időrendben minden ügy, a lezártak is, és a feladathoz rögzített megjelenések. ● lezárt · ○ nyitott · ▢ megjelenés</p><ol class="timeline">${ev.map(e => e.li).join('')}</ol></div></section>`;
}

/* ---------------- Nézet: az ügy (K4, K5, K11.5) ---------------- */
function vUgy(cid) {
  ui.title = 'Ügy';
  if (T.mode() === 'leader') return noAccess('Vezetői szerepben egyes ügy nem nyitható meg; az összesítő csak számokat mutat.' + (T.modesOf(T.me()).length > 1 ? ' A szerepet fent, a neved alatt válthatod.' : ''));
  const c = T.Cs(cid); if (!c) return noAccess('Ilyen ügy nincs.');
  const acc = T.caseAccess(c); if (acc === 'none') return noAccess('Ehhez az ügyhöz nincs jogosultságod.');
  const p = c.patientId ? T.P(c.patientId) : null, key = 'case:' + c.id, write = acc === 'write', back = crumbBack();
  const crumbs = `<nav class="crumbs" aria-label="Hol vagy"><a href="${back[0]}">${esc(back[1])}</a><span aria-hidden="true">/</span>${p ? `<a href="#/beteg/${p.id}">${esc(ptName(p))}</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">Ügy</span></nav>`;
  const ptLine = p ? `<p class="case-pt">${ptLink(p)}<span class="taj">${esc(T.patientId(p))}</span><span class="muted">${stateLine(p)}</span></p>` : '<p class="case-pt muted">Beteg nélküli ügy</p>';
  if (acc === 'header') return crumbs + ptLine + `<h1 tabindex="-1" data-k="h1" class="case-title-h1">${esc(T.commonType(c))}</h1><div class="ro-banner">${ico('lock')}<div><p><strong>Csak fejléc.</strong> Más profil járóbetegének ügyéből ezt látod: ügytípus, státusz, dátum, felelős profil.</p></div></div>
    <dl class="kv"><div><dt>Ügytípus</dt><dd>${esc(T.commonType(c))}</dd></div><div><dt>Státusz</dt><dd>${esc(c.closed ? 'lezárt' : T.catWord[T.cat(c)])}</dd></div><div><dt>Dátum</dt><dd>${esc(fmtDate(c.created.at.slice(0, 10)))}</dd></div><div><dt>Felelős profil</dt><dd>${esc(T.profileName(c.profileId))}</dd></div></dl>`
    + (tasksRO => tasksRO.length ? `<section class="section" aria-labelledby="h-roteendo"><div class="section-head"><h2 id="h-roteendo">Nyitott teendők <span class="count">${tasksRO.length}</span></h2></div><ul class="plain-list">${tasksRO.map(t => `<li><div class="li-main"><span>${esc(t.text)}</span><span class="muted">${t.due ? 'határidő: ' + esc(fmtDate(t.due)) : 'nincs határidő'}</span></div><p class="li-sub">Felelős: ${t.owner ? esc(userName(t.owner)) : 'még nincs'}</p></li>`).join('')}</ul><p class="hint">A beteg bent fekszik: a nyitott teendő a lezárt ügynél is olvasható, az ügy többi része nem.</p></section>` : '')(T.state().tasks.filter(t => t.caseId === c.id && T.taskAccess(t) === 'read'));
  const catw = c.closed ? 'lezárva: ' + c.closed.reason + ', ' + T.relAt(c.closed.at) : T.stepLabel(c) + (T.stepLabel(c).indexOf(T.catWord[T.cat(c)]) > -1 ? '' : ' (' + T.catWord[T.cat(c)] + ')');
  const extraBtns = [];
  if (write && !c.closed && !ui.undo[key]) {
    extraBtns.push(`<button class="btn btn-quiet" type="button" data-act="panel" data-panel="kiutal" data-pid="${c.patientId || ''}" data-cid="${c.id}">${ico('send')}Kiutalás az ügyeletnek</button>`);
    if (c.type === 'atadas' && !c.data.docReady) extraBtns.push(`<button class="btn btn-quiet" type="button" data-act="doc-ready" data-id="${c.id}">Az átadó dokumentum elkészült</button>`);
  }
  if (write && c.closed && !ui.undo[key]) {
    extraBtns.push(`<button class="btn btn-quiet" type="button" data-act="reopen" data-id="${c.id}">Újranyitás</button>`);
    if ((c.type === 'vizsgalat' && c.closed.reason === 'lemondva') || (c.type === 'engedely' && c.closed.reason === 'elutasítva')) extraBtns.push(`<button class="btn btn-secondary" type="button" data-act="new-from" data-id="${c.id}">${c.type === 'vizsgalat' ? 'Új előjegyzés ebből' : 'Új kérelem az elutasítottra hivatkozva'}</button>`);
  }
  if (write && c.type === 'engedely' && c.step === 'erv' && !c.closed && T.renewalOf(c.id)) extraBtns.push(`<a class="btn btn-quiet" href="#/ugy/${T.renewalOf(c.id).id}">A hosszabbítás megnyitása</a>`);
  let h = crumbs + ptLine + `<div class="case-page"><p class="kicker">${esc(kindLine(c))} · ${esc(T.profileName(c.profileId))}${write ? '' : ' · <span class="ro">csak olvasható</span>'}</p>
    <h1 class="case-title-h1" tabindex="-1" data-k="h1">${esc(T.caseTitle(c))}</h1>
    <p class="case-state"><strong>${esc(catw)}</strong>${!c.closed && T.cat(c) === 'V' ? '<span>vár: ' + esc(c.type === 'atadas' ? (c.data.institution || '').split(',')[0] : (T.stepDef(c) || {}).wait || '') + ', ' + esc(T.waitLen(c.waitSince || today())) + '</span>' : ''}${T.permitExpired(c) ? `<span class="late">${ico('alert')} ${D.diff(today(), c.data.expiresOn)} napja lejárt, és nem indult hosszabbítás</span>` : ''}</p>
    ${originLine(c)}${trackHtml(c)}
    ${write ? `<div class="case-actions">${caseActions(c, key, 'lg')}${extraBtns.join('')}</div>${promptHtml(c, key)}` : `<div class="ro-banner">${ico('lock')}<div><p><strong>Csak olvasható.</strong> A beteg most bent fekszik, ezért a nyitott ügyét olvashatod; szerkeszteni a gondozó profil tudja (${esc(T.profileName(c.profileId))}).</p></div></div>`}
    ${panelHtml()}
    <div class="layout wide-side"><div class="primary">`;
  h += `<section class="section" aria-labelledby="h-adat"><div class="section-head"><h2 id="h-adat">Adatok</h2>${write && !ui.edit ? `<button class="link-btn lg" type="button" data-act="edit" data-id="${c.id}" data-k="edit">Szerkesztés</button>` : ''}</div>${ui.edit === c.id ? editForm(c) : kvHtml(c, true)}</section>`;
  if (T.isMeet(c.type)) h += decisionSection(c, write);
  if (c.type === 'atadas') { const perms = T.state().cases.filter(x => x.patientId === c.patientId && x.type === 'engedely' && x.step === 'erv' && !x.closed && x.data.expiresOn >= today() && T.caseAccess(x) !== 'none' && T.caseAccess(x) !== 'header');
    h += `<section class="section" aria-labelledby="h-perm"><div class="section-head"><h2 id="h-perm">A beteg érvényes engedélyei</h2></div>${perms.length ? `<ul class="plain-list">${perms.map(x => `<li><div class="li-main"><a href="#/ugy/${x.id}">${esc(T.caseTitle(x))}</a><span class="muted">érvényes ${esc(fmtDate(x.data.expiresOn))}-ig</span></div></li>`).join('')}</ul>` : '<p class="empty">Nincs érvényes engedély.</p>'}<p class="hint">Magától látszik, újbóli beírás nélkül.</p></section>`; }
  h += tasksSection(c, write) + linkedSection(c, write);
  if (c.type !== 'epi') h += contactsSection(c, write);
  h += noteSection(c, write) + filesSection(c, write) + labelsSection(c, write);
  h += `</div><div class="side"><section class="section" aria-labelledby="h-tort"><div class="section-head"><h2 id="h-tort">A lépések története <span class="count">${c.history.length}</span></h2></div>
    <p class="group-note">Magától rögzül, ki és mikor léptette; kézi napló nem kell.</p><ul class="history-list">${c.history.slice().reverse().map(x => `<li><time>${esc(fmtDate(x.at.slice(0, 10)))} ${esc(D.hm(x.at))}</time><span>${esc(x.text)}<br><span class="muted">${esc(userName(x.by))}</span></span></li>`).join('')}</ul></section></div></div></div>`;
  return h;
}
/* Az ügy szerkeszthető adatai: ugyanazok, amelyek induláskor megadhatók (bírálat 10.), a felelősök teljes listájával (4.) */
const YN = v => v === true ? 'igen' : v === false ? 'nem' : '';
const NY = v => v === 'igen' ? true : v === 'nem' ? false : undefined;
/* A lista már nem kínálja, de a meglévő ügyön ez az érték áll: látszik, és változatlanul menthető (a prototípus bírálata, 5.) */
const keepOpt = (opts, v) => v && !opts.some(o => o[0] === v) ? opts.concat([[v, v + ' (már nincs a listán)']]) : opts;
/* A plusz adat, ha az ügyön ki van töltve: az archivált mező is (a prototípus bírálata, 6.) */
const hasVal = (c, k) => c.data && c.data[k] !== undefined && c.data[k] !== null && c.data[k] !== '';
const plusFor = c => plusOf(c.profileId, c.type).filter(x => !x.archived || hasVal(c, x.id));
function editFields(c) {
  const prof = c.profileId;
  const d = (k, label, type, opts, extra) => Object.assign({ k, label, type: type || 'text', opts, get: x => x.data[k] == null ? '' : (typeof x.data[k] === 'boolean' ? YN(x.data[k]) : String(x.data[k])), put: (pt, v) => { pt.data[k] = type === 'yn' ? NY(v) : v; } }, extra || {});
  const F = [];
  if (c.type === 'engedely') F.push(d('drug', 'Gyógyszer'), d('indication', 'Indikáció'), d('reqType', 'Kérelemtípus', 'select', keepOpt(cfg.reqTypes.map(x => [x, x]), c.data.reqType)), d('offLabel', 'Indikáción túli alkalmazás', 'yn'), d('sentOn', 'Beküldés napja', 'date'), d('ogyeiOn', 'OGYÉI-engedély napja', 'date'), d('decidedOn', 'Határozat napja', 'date'), d('expiresOn', 'Érvényes eddig', 'date'));
  if (c.type === 'vizsgalat') F.push(d('exam', 'Vizsgálat', 'select', keepOpt(cfg.profiles[prof].exams.map(x => [x, x]), c.data.exam)), d('region', 'Régió'), d('from', 'Időablak: mettől', 'date'), d('to', 'Időablak: meddig', 'date'), d('anesthesia', 'Altatás', 'yn'), d('appointment', 'Időpont', 'date'));
  if (c.type === 'labor') F.push(d('test', 'Vizsgálat'), d('requestedOn', 'A kérés napja', 'date'), d('expectedOn', 'Várható eredmény', 'date'), d('notify', 'Kinek kell jelezni', 'person', profPeople(prof, [], true), { empty: 'senkinek külön' }));
  if (T.isMeet(c.type)) {
    F.push(d('question', 'Kérdés')); if (T.flowOf(c.type) !== 'd2t') F.push(d('region', 'Régió vagy terület'));
    F.push(d('summary', 'Rövid összefoglaló', 'area'));
    if (!c.closed) F.push({ k: 'meeting', label: 'Alkalom', type: 'meeting', sk: T.typeOf(c).meeting, get: x => x.meeting || '', put: (pt, v) => { pt.meeting = v; } });
  }
  if (c.type === 'atadas') F.push(d('institution', 'Fogadó intézmény'), d('recvDoctor', 'Fogadó orvos'), d('contact', 'Intézményi elérhetőség'), d('plannedOn', 'Tervezett nap', 'date'), d('coordinator', 'Tranzíciós koordinátor', 'person', profPeople(prof, [], true), { empty: 'nincs megadva' }), d('docReady', 'Az átadó dokumentum elkészült', 'yn'));
  plusFor(c).forEach(x => F.push(x.kind === 'yn' ? d(x.id, x.label, 'yn') : x.kind === 'list' ? d(x.id, x.label, 'select', keepOpt((x.opts || []).map(o => [o, o]), c.data[x.id])) : d(x.id, x.label)));
  if (c.type === 'altalanos') F.push({ k: 'title', label: 'Mit kell tenni?', type: 'text', get: x => x.title || '', put: (pt, v) => { pt.title = v; } });
  F.push({ k: 'due', label: 'Határidő', type: 'date', get: x => x.due || '', put: (pt, v) => { pt.due = v || null; } });
  F.push({ k: 'owners', label: 'Felelős', type: 'multi', opts: profPeople(prof), hint: 'Egy vagy több; ha üresen hagyod, az ügy felelős nélkül marad.', get: x => x.owners.slice().sort().join(','), put: (pt, v) => { pt.owners = v ? v.split(',').filter(Boolean) : []; } });
  /* A figyelő követi az ügyet (K4.8): a „Figyelt ügyeim” között látja, ki viszi és mi változott */
  F.push({ k: 'watchers', label: 'Figyelő', type: 'multi', opts: profPeople(prof), hint: 'Aki követi az ügyet: a „Figyelt ügyeim” között látja, ki viszi és mi változott.', get: x => x.watchers.slice().sort().join(','), put: (pt, v) => { pt.watchers = v ? v.split(',').filter(Boolean) : []; } });
  return F;
}
function fieldShow(x, v) {
  if (v === '' || v == null) return 'nincs megadva';
  if (x.type === 'multi') return v.split(',').map(userName).join(', ');
  if (x.type === 'person') return userName(v);
  if (x.type === 'meeting') return D.dayName(v) + ', ' + fmtDate(v);
  if (x.type === 'date') return fmtDate(v);
  if (x.type === 'select') { const o = (x.opts || []).find(o => o[0] === v); return o ? o[1] : v; }
  return v;
}
const mineVal = (x, f) => x.type === 'multi' ? (f['e_' + x.k] || []).slice().sort().join(',') : (f['e_' + x.k] == null ? '' : String(f['e_' + x.k]));
function editForm(c) {
  const f = ui.f, F = editFields(c);
  if (f._init !== c.id) { f._init = c.id; f._snap = {}; F.forEach(x => { const v = x.get(c); f._snap[x.k] = v; f['e_' + x.k] = x.type === 'multi' ? (v ? v.split(',') : []) : v; }); }
  const body = F.map(x => {
    if (x.type === 'multi') return peopleField('e_' + x.k, x.label, x.opts, 'Írd be a nevét', true, { wide: true, hint: x.hint });
    if (x.type === 'person') return personField('e_' + x.k, x.label, x.opts, 'Írd be a nevét', null, true, { empty: x.empty });
    if (x.type === 'meeting') return meetingChooser('e_meeting', x.sk, '', true);
    if (x.type === 'yn') return field('e_' + x.k, x.label, inSelect('e_' + x.k, yesNo, 'nincs megadva'), true);
    if (x.type === 'select') return field('e_' + x.k, x.label, inSelect('e_' + x.k, x.opts, 'nincs megadva'), true);
    if (x.type === 'date') return field('e_' + x.k, x.label, inDate('e_' + x.k), true);
    if (x.type === 'area') return `<div class="field wide"><label class="field-label" for="f-e_${x.k}">${esc(x.label)} <span class="opt">(nem kötelező)</span></label>${inArea('e_' + x.k)}</div>`;
    return field('e_' + x.k, x.label, inText('e_' + x.k), true);
  }).join('') + field('e_his', 'Új HIS-hivatkozás', inText('e_his'), true);
  return `<form data-form="edit" data-id="${c.id}" novalidate><div class="fields-2">${body}</div>${conflictHtml(c, 'data')}<div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ed-save">Mentés</button><button class="btn btn-quiet" type="button" data-act="edit-cancel">Mégse</button></div></form>`;
}
/* Egyidejű szerkesztés: a később mentő látja az eltérést, és ő dönt (K12.3); döntés, megjegyzés és adatok */
function conflictHtml(c, kind) {
  const k = ui.conflict; if (!k || k.id !== c.id || k.kind !== kind) return '';
  const last = c.history.slice().reverse().find(x => x.by !== T.me()) || {};
  let two;
  if (kind === 'data') two = `<table class="hdr-table"><thead><tr><th scope="col">Adat</th><th scope="col">Az övé (most ez van mentve)</th><th scope="col">A tiéd (még nincs mentve)</th></tr></thead><tbody>${k.fields.map(x => `<tr><td data-label="Adat">${esc(x.label)}</td><td data-label="Az övé">${esc(x.theirs)}</td><td data-label="A tiéd">${esc(x.mine)}</td></tr>`).join('')}</tbody></table>`;
  else { const theirs = kind === 'decision' ? c.decision : c.note; two = `<div class="two"><div><h4>Az övé (most ez van mentve)</h4><p>${esc(theirs || '(üres)')}</p></div><div><h4>A tiéd (még nincs mentve)</h4><p>${esc(k.mine || '(üres)')}</p></div></div>`; }
  return `<div class="conflict" role="alert" aria-labelledby="cf-h"><h3 id="cf-h" tabindex="-1" data-k="conflict">Közben ${esc(userName(last.by || ''))} is mentett${last.at ? ' (' + esc(T.relAt(last.at)) + ')' : ''}</h3>
    <p>A te változatodat nem mentettük el, és nem is veszett el. Nézd meg a kettőt, és dönts: az összefésülés ${kind === 'data' ? 'a te módosításaid mellé átveszi az övéit, a felelősöket egyesíti, és mentés előtt átnézheted' : 'mindkét szöveget a mezőbe teszi, egymás alá'}.</p>${two}
    <div class="form-actions"><button class="btn btn-primary" type="button" data-act="cf-mine" data-id="${c.id}" data-kind="${kind}">Az enyémet mentem</button><button class="btn btn-quiet" type="button" data-act="cf-merge" data-id="${c.id}" data-kind="${kind}">Összefésülöm</button><button class="btn btn-quiet" type="button" data-act="cf-theirs" data-id="${c.id}" data-kind="${kind}">Az övé marad</button></div></div>`;
}
function decisionSection(c, write) {
  const f = ui.f, editing = ui.decide === c.id, prof = c.profileId;
  let h = `<section class="section" aria-labelledby="h-dontes"><div class="section-head"><h2 id="h-dontes">Megbeszélés és döntés</h2>${write && !editing && !c.closed ? `<button class="link-btn lg" type="button" data-act="decide" data-id="${c.id}" data-k="decide">${c.decision ? 'A döntés szerkesztése' : 'Döntés rögzítése'}</button>` : ''}</div>
    <dl class="kv"><div><dt>Alkalom</dt><dd>${c.meeting ? esc(D.dayName(c.meeting) + ', ' + fmtDate(c.meeting)) : '–'}</dd></div><div><dt>Előszűrés</dt><dd>${c.triage === 'tudomásul' ? 'csak tudomásul vesszük' : 'megbeszéljük'}</dd></div>
    <div><dt>Kérdés</dt><dd>${esc(c.data.question || '–')}</dd></div>${c.data.summary ? `<div><dt>Rövid összefoglaló</dt><dd>${esc(c.data.summary)}</dd></div>` : ''}${c.participants.length ? `<div><dt>Résztvevő orvosok</dt><dd>${c.participants.map(x => esc(userName(x))).join(', ')}</dd></div>` : ''}</dl>`;
  if (!editing) h += c.decision ? `<p class="decision">„${esc(c.decision)}”</p><p class="hint">Rögzítve: ${esc(c.decidedAt ? T.relAt(c.decidedAt) : '')}</p>` : `<p class="empty">Még nincs döntés.${write && !c.closed && c.step !== 'dok' && T.flowOf(c.type) !== 'd2t' ? ' A megbeszélés után rögzítsd.' : ''}</p>`;
  else {
    if (f._dinit !== c.id) { f._dinit = c.id; f._dbase = c.ver; f._dtext = c.decision || ''; f.dec = T.draftOf('dec:' + c.id) || c.decision || ''; f.rows = f.rows || []; if (T.flowOf(c.type) === 'd2t' && !f.part) f.part = c.owners.slice(); }
    const rows = (f.rows || []).map((r, i) => `<li><div class="field"><label class="field-label" for="r-t-${i}">Teendő</label><input class="text-input" id="r-t-${i}" data-row="${i}" data-rf="text" data-k="r-t-${i}" value="${esc(r.text || '')}" autocomplete="off"></div>
      ${cbField({ key: 'rows.' + i + '.owner', id: 'r-o-' + i, label: 'Felelős', opts: profPeople(prof), placeholder: 'Írd be a nevét', empty: 'egyelőre senki' })}
      <div class="field"><label class="field-label" for="r-d-${i}">Határidő</label><input class="text-input" type="date" id="r-d-${i}" data-row="${i}" data-rf="due" value="${esc(r.due || '')}"></div>
      <div class="field"><label class="field-label" for="r-s-${i}">Kapcsolt ügy indul belőle</label><select class="select" id="r-s-${i}" data-row="${i}" data-rf="spawn"><option value="">nem</option>${T.spawnTypes(prof).map(t => `<option value="${t}"${r.spawn === t ? ' selected' : ''}>${esc(vlabel(prof, t))}</option>`).join('')}</select></div>
      <button class="btn-sm btn-icon" type="button" data-act="row-del" data-i="${i}">${ico('x')}${sr('A teendő törlése')}</button></li>`).join('');
    h += `<form data-form="decide" data-id="${c.id}" novalidate>${field('dec', 'Döntés', `<textarea class="textarea" id="f-dec" data-f="dec" data-k="f-dec" data-draft="dec:${c.id}"></textarea>`)}
      ${T.flowOf(c.type) === 'd2t' ? peopleField('part', 'Résztvevő orvosok', profPeople(prof, [], true), 'Írd be a nevét', false) : ''}
      <h3 class="sub-head">Teendők a döntésből</h3>${rows ? `<ul class="task-rows">${rows}</ul>` : '<p class="hint">Ha nincs teendő, így is mentheted.</p>'}
      <button class="btn-sm" type="button" data-act="row-add" data-k="row-add" style="margin-top:1rem">${ico('plus')}Teendő hozzáadása</button>
      ${conflictHtml(c, 'decision')}
      <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="dec-save">${ico('check')}A döntés mentése</button><button class="btn btn-quiet" type="button" data-act="decide-cancel">Mégse</button></div></form>`;
  }
  return h + '</section>';
}
function tasksSection(c, write) {
  const ts = T.state().tasks.filter(t => t.caseId === c.id && (write || !t.done));
  const f = ui.f, open = ui.panel && ui.panel.kind === 'task' && ui.panel.cid === c.id, target = ui.r.q.teendo;
  /* A teendőn, amelyből ügy lett: „kapcsolt ügy lett belőle: <cím>”; a lenyitott listából ide visz a teendő (?teendo=) */
  const mark = t => { const sp = t.spawned && !ui.undo['task:' + t.id] ? T.Cs(t.spawned) : null; return sp && detailAcc(T.caseAccess(sp)) ? ' · ' + (t.done ? 'kapcsolt ügy lett belőle: ' : 'kapcsolt ügy indult belőle: ') + `<a href="#/ugy/${sp.id}">${esc(T.caseTitle(sp))}</a>` : ''; };
  const li = ts.map(t => { const key = 'task:' + t.id; return `<li${target === t.id ? ` class="is-target" tabindex="-1" data-k="tli:${t.id}"` : ''}><div class="li-main"><span class="${t.done && !ui.undo[key] ? 'muted' : ''}" style="${t.done ? 'text-decoration:line-through' : ''}">${esc(t.text)}</span>
    <span>${ui.undo[key] ? undoHtml(key) : !t.done && write ? taskActions(t, key, t.text, null) : t.done ? `<span class="muted">${ico('check')} kész, ${esc(T.relAt(t.done.at))}</span>` : ''}</span></div>
    <p class="li-sub">${t.owner ? 'Felelős: ' + esc(userName(t.owner)) : '<strong class="late">nincs még felelős</strong>'}${t.due ? ' · határidő: ' + esc(fmtDate(t.due)) + (T.taskLate(t) ? ' <strong class="late">(' + esc(T.relDue(t.due)) + ')</strong>' : '') : ''}${t.note ? ' · „' + esc(t.note) + '”' : ''}${mark(t)}${!t.owner && write && !t.done ? ` · <button class="link-btn lg" type="button" data-act="task-take" data-id="${t.id}">Elvállalom</button>` : ''}</p>${spawnPanel(t, key)}</li>`; }).join('');
  return `<section class="section" aria-labelledby="h-teendok"><div class="section-head"><h2 id="h-teendok">Teendők <span class="count">${ts.filter(t => !t.done).length} nyitott</span></h2>${write && !c.closed && !open ? `<button class="link-btn lg" type="button" data-act="panel" data-panel="task" data-cid="${c.id}" data-k="new-task">${ico('plus')} Új teendő</button>` : ''}</div>
    ${open ? `<form class="inline-form" data-form="task" data-id="${c.id}" novalidate>${field('ttext', 'Mit kell tenni?', inText('ttext', ' maxlength="160"'))}${personField('towner', 'Ki?', profPeople(c.profileId), 'Írd be a nevét', null, true, { empty: 'egyelőre senki' })}${field('tdue', 'Határidő', inDate('tdue'), true)}
      <div class="form-actions" style="margin:0"><button class="btn-sm btn-fill" type="submit" data-k="t-save">${esc(consequenceLabel(f.towner ? [f.towner] : []))}</button><button class="btn-sm" type="button" data-act="panel-close">Mégse</button></div>${f._err ? `<p class="err" role="alert" style="flex-basis:100%">${ico('alert')}<span>${esc(f._err)}</span></p>` : ''}</form>` : ''}
    ${ts.length ? `<ul class="plain-list">${li}</ul>` : '<p class="empty">Nincs teendő.</p>'}</section>`;
}
function contactsSection(c, write) {
  const key = 'contact:' + c.id;
  return `<section class="section" aria-labelledby="h-kapcs"><div class="section-head"><h2 id="h-kapcs">Kapcsolatfelvételek <span class="count">${c.contacts.length}</span></h2>${write ? `<button class="link-btn lg" type="button" data-act="contact" data-id="${c.id}" data-k="contact">Kapcsolatfelvétel rögzítése</button>` : ''}</div>
    ${ui.prompt && ui.prompt.key === key ? promptHtml(c, key) : ''}
    ${c.contacts.length ? `<ul class="plain-list">${c.contacts.map(x => `<li><div class="li-main"><span>${esc(cap(x.whom))}, ${esc(x.how)}${c.type === 'atadas' ? ' · ' + (x.after ? 'az átadás után' : 'az átadás előtt') : ''}</span><span class="muted">${esc(T.relAt(x.at))}</span></div><p class="li-sub">Rögzítette: ${esc(userName(x.by))}${x.note ? ' · „' + esc(x.note) + '”' : ''}</p></li>`).join('')}</ul>` : '<p class="empty">Még nincs rögzítve.</p>'}</section>`;
}
function noteSection(c, write) {
  const f = ui.f; if (f.note === undefined || f._nid !== c.id) { f._nid = c.id; f._nbase = c.note || ''; f.note = T.draftOf('note:' + c.id) || c.note || ''; }
  const dirty = (f.note || '') !== (c.note || '');
  return `<section class="section" aria-labelledby="h-megj"><div class="section-head"><h2 id="h-megj">Rövid megjegyzés</h2></div>
    ${write ? `<form data-form="note" data-id="${c.id}"><label class="sr-only" for="f-note">Rövid megjegyzés az ügyhöz</label><textarea class="textarea" id="f-note" data-f="note" data-k="f-note" data-draft="note:${c.id}" aria-describedby="note-h"></textarea>
      <p class="hint" id="note-h">${dirty ? 'Félbehagyott bejegyzés: neked megőrizzük, akkor is, ha más lép be ezen a gépen.' : 'Gépelés közben mentjük; ha félbehagyod, itt találod.'}</p>${conflictHtml(c, 'note')}<div class="form-actions" style="margin-top:.75rem"><button class="btn-sm btn-fill" type="submit" data-k="note-save">A megjegyzés mentése</button></div></form>`
      : `<p>${c.note ? esc(c.note) : '<span class="muted">Nincs.</span>'}</p>`}</section>`;
}
function filesSection(c, write) {
  return `<section class="section" aria-labelledby="h-csat"><div class="section-head"><h2 id="h-csat">Csatolmányok <span class="count">${c.files.length}</span></h2>
    ${write ? `<details class="menu"><summary class="link-btn lg" data-k="attach">${ico('file')} Fájl csatolása</summary><ul class="menu-list"><li class="mhead">A próbában csak kitalált fájl csatolható</li>${cfg.fakeFiles.map(n => `<li><button type="button" data-act="attach" data-id="${c.id}" data-name="${esc(n)}">${esc(n)}</button></li>`).join('')}</ul></details>` : ''}</div>
    ${c.files.length ? `<ul class="plain-list">${c.files.map((x, i) => `<li><div class="li-main"><a href="#/csatolmany/${c.id}/${i}" data-k="file-${i}">${ico('file')} ${esc(x.name)}</a><span class="muted">${esc(userName(x.by))}, ${esc(T.relAt(x.at))}</span></div></li>`).join('')}</ul>` : '<p class="empty">Nincs csatolmány.</p>'}</section>`;
}
function labelsSection(c, write) {
  const used = T.usedLabels().filter(l => c.labels.indexOf(l) === -1);
  return `<section class="section" aria-labelledby="h-cimke"><div class="section-head"><h2 id="h-cimke">Címkék <span class="count">${c.labels.length}</span></h2></div>
    ${c.labels.length ? `<ul class="labels">${c.labels.map(l => `<li><span class="label">${ico('tag')}${esc(l)}${write ? `<button class="link-btn" type="button" data-act="label-del" data-id="${c.id}" data-label="${esc(l)}" style="margin-left:.375rem">${ico('x')}${sr('A címke törlése: ' + l)}</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="empty">Nincs címke. A címkével az ügy később a beteg neve nélkül is visszakereshető.</p>'}
    ${write ? `<form class="inline-form" data-form="label" data-id="${c.id}"><div class="field"><label class="field-label" for="f-label">Új címke</label><input class="text-input" id="f-label" data-f="label" data-k="f-label" list="cimke-javaslat" autocomplete="off" placeholder="például a diagnózis vagy egy eltérés"><datalist id="cimke-javaslat">${used.map(l => `<option value="${esc(l)}">`).join('')}</datalist></div><button class="btn-sm btn-fill" type="submit">Hozzáadás</button></form>
      ${used.length ? `<p class="hint">Már használt címkék: ${used.slice(0, 8).map(l => `<button class="link-btn" type="button" data-act="label-add" data-id="${c.id}" data-label="${esc(l)}">${esc(l)}</button>`).join(' · ')}</p>` : ''}` : ''}</section>`;
}
/* Az ügy oldalán, a cím és az állapot alatt: „↳ Innen indult: <kiinduló> · <viszony, ha nem „ebből indult”> · <a kiinduló állapota>” (a terv 3.7).
   Csak fejléc jogánál a közös ügytípus, a státusz, a dátum és a felelős profil, link nélkül (bírálat 3.; K9.4) */
function originLine(c) {
  const o = T.originOf(c); if (!o) return '';
  if (!detailAcc(o.acc)) return `<p class="case-origin">${ico('sub')}<span>Innen indult: ${esc(hdrText(o.c))}</span></p>`;
  return `<p class="case-origin">${ico('sub')}<span>Innen indult: <a href="#/ugy/${o.c.id}">${esc(shortName(o.c))}</a>${o.rel.kind !== 'ebbol' ? ' · ' + esc(o.word) : ''} · ${esc(stateWord(o.c))}</span></p>`;
}
/* „Kapcsolt ügyek” a főhasábban, a teendők után: ami ebből indult, és a kézzel kapcsoltak; a nyitottak elöl, a lezártak halványabban, a végén.
   Csak akkor látszik, ha van kapcsolt ügy, vagy a néző kapcsolhat; a fejében „Meglévő ügy kapcsolása” (a terv 3.5, 3.7) */
function linkedSection(c, write) {
  const ls = T.linkedOf(c), ukey = 'rel:' + c.id, canLink = write && !c.closed, open = canLink && ui.panel && ui.panel.kind === 'relate' && ui.panel.cid === c.id;
  if (!ls.length && !canLink && !ui.undo[ukey]) return '';
  const li = o => o.acc === 'header'
    ? `<li class="is-hdr"><div class="li-main"><span>${esc(T.commonType(o.c))}</span></div><p class="li-sub">${esc([o.word].concat(hdrParts(o.c).slice(1)).join(' · '))}</p></li>`
    : `<li${o.c.closed ? ' class="is-closed"' : ''}><div class="li-main"><a href="#/ugy/${o.c.id}">${esc(T.caseTitle(o.c))}</a></div><p class="li-sub">${linkedSub(o)}</p></li>`;
  return `<section class="section" aria-labelledby="h-kapcsolt"><div class="section-head"><h2 id="h-kapcsolt">Kapcsolt ügyek <span class="count">${ls.length}</span></h2>${canLink && !open ? `<button class="link-btn lg" type="button" data-act="relate-open" data-id="${c.id}" data-k="act:${ukey}">Meglévő ügy kapcsolása</button>` : ''}</div>
    ${open ? relateForm(c) : ''}${ui.undo[ukey] ? undoHtml(ukey) : ''}
    ${ls.length ? `<ul class="plain-list linked">${ls.map(li).join('')}</ul>` : '<p class="empty">Nincs kapcsolt ügy. Kapcsolt ügy a teendő menüjéből indul; meglévő ügyet itt kapcsolhatsz.</p>'}</section>`;
}
/* Meglévő ügy kapcsolása: a beteg ügyei, a nyitottak elöl, kereshetően; beteg nélküli ügynél bármely látható ügy. Csak olyan ügy, amelyet a néző
   részletesen láthat, és amely még nincs kapcsolva. Szabad szöveg nincs: a viszony „kapcsolódik” */
function relateOpts(c) {
  const ok = x => x.id !== c.id && (c.patientId ? x.patientId === c.patientId : true) && detailAcc(T.caseAccess(x)) && !T.relBetween(c.id, x.id);
  return T.state().cases.filter(ok).sort((a, b) => (!!a.closed - !!b.closed) || (b.created.at > a.created.at ? 1 : -1)).map(x => {
    const sub = [typeName(x) + (T.isMember(T.me(), x.profileId) ? '' : ' · ' + T.profileName(x.profileId)), stateWord(x), fmtDate(x.created.at.slice(0, 10))].join(' · ');
    return { v: x.id, name: T.caseTitle(x), sub, hay: T.norm([T.caseTitle(x), sub, c.patientId ? '' : ptName(T.P(x.patientId))].join(' ')) };
  });
}
function relateForm(c) {
  const f = ui.f, opts = relateOpts(c);
  if (!opts.length) return `<div class="inline-form"><p class="hint" style="margin:0">${c.patientId ? 'A betegnek nincs más ügye, amelyet kapcsolhatnál.' : 'Nincs más ügy, amelyet kapcsolhatnál.'}</p><button class="btn-sm" type="button" data-act="relate-cancel" data-k="rel-cancel">Mégse</button></div>`;
  return `<form class="inline-form" data-form="relate" data-id="${c.id}" novalidate>${cbField({ key: 'relId', id: 'f-relId', label: 'Melyik ügyet kapcsolod?', opts, placeholder: 'Írd be a címét vagy az ügytípusát', err: f._eRel, errKey: '_eRel', none: 'Nincs ilyen ügy a listán. Próbáld a cím vagy az ügytípus elejével.', hint: c.patientId ? 'A beteg ügyei, amelyeket részletesen láthatsz.' : 'Bármely ügy, amelyet részletesen láthatsz.' })}
    <div class="form-actions" style="margin:0"><button class="btn-sm btn-fill" type="submit" data-k="rel-save">Kapcsolom</button><button class="btn-sm" type="button" data-act="relate-cancel">Mégse</button></div>
    <p class="hint" style="flex-basis:100%; margin:0">Egyenrangú kapcsolat: mindkét ügy listájában ott lesz a másik, „kapcsolódik” jelöléssel.</p></form>`;
}
/* ---------------- Kapcsolt ügy indítása ebből a teendőből (a terv 3.4) ----------------
   A teendő sora alatt nyílik. Az ügytípust választani kell (egyik sincs előre kiválasztva); utána egy sor megmondja, hová kerül, mi az első lépése,
   ki viszi, és mi kerül át. Átkerül a beteg, a cím, a határidő és a felelős; az ügytípus adatai kitölthetők, nem kötelezők (K4.7).
   Mentés után a felhasználó a helyén marad; a teendő helyén a visszavonás sora, a kapcsolt ügy megnyitásával */
function spawnOwnerSpec(t, c, type) {
  const prof = c.profileId, uid = T.me(), area = type ? cfg.areas[T.areaFor(type, prof, uid)] : null;
  const to = t.owner && T.U(t.owner).profile === prof ? t.owner : null, ao = area && area.owner && T.U(area.owner).profile === prof ? area.owner : null, opts = [];
  if (to) opts.push(['task', userName(to) + ', a teendő felelőse']); else if (ao) opts.push(['area', userName(ao) + ' (az área felelőse)']);
  if (uid !== (to || ao)) opts.push(['me', 'én']);
  opts.push(['other', 'más'], ['none', 'egyelőre senki']);
  return { opts, def: to ? 'task' : ao ? 'area' : 'none', to, ao };
}
function spawnOwners(t, c, f) {
  const S = spawnOwnerSpec(t, c, f.ltype), v = S.opts.some(o => o[0] === f.lowner) ? f.lowner : S.def;
  return v === 'task' ? [S.to] : v === 'area' ? [S.ao] : v === 'me' ? [T.me()] : v === 'other' ? (f.lownerId ? [f.lownerId] : ['?']) : [];
}
function spawnTitleField(type) {
  if (T.isMeet(type)) return field('ltitle', 'Kérdés', inText('ltitle'));
  if (type === 'altalanos') return field('ltitle', 'Mit kell tenni?', inText('ltitle', ' maxlength="160"'));
  if (!T.titleFromTask(type)) return `<p class="hint">${type === 'engedely' ? 'Az engedély címét a gyógyszer adja (például „Rituximab-engedély”), ezért a teendő szövege itt nem lesz cím.' : 'Az átadás címét a fogadó intézmény adja, ezért a teendő szövege itt nem lesz cím.'}</p>`;
  return `<div class="field"><label class="field-label" for="f-ltitle">Cím</label><span class="field-hint" id="ltitle-h">A teendő szövege, átírható; ha üresen hagyod, az ügytípus adja${type === 'vizsgalat' ? ' (például „MR, jobb térd”)' : ''}.</span>${inText('ltitle', ' aria-describedby="ltitle-h"')}</div>`;
}
/* Az ügytípus mezői, mint az „Új ügy” űrlapján (nem kötelezők); megbeszélésnél az alkalom is (K5.10) */
function spawnTypeFields(type, prof, pt) {
  const f = ui.f, g = pt ? T.careIn(pt.id, prof) : null;
  if (type === 'vizsgalat') {
    if (f.exam === undefined) f.exam = cfg.profiles[prof].exams[0] || 'MR';
    return `<div class="fields-2">${field('exam', 'Vizsgálat', inSelect('exam', cfg.profiles[prof].exams.map(x => [x, x])))}${field('region', 'Régió', inText('region'), true)}
      ${field('from', 'Időablak: mettől', inDate('from'), true)}${field('to', 'Időablak: meddig', inDate('to'), true)}</div>${chipsF('anesthesia', 'Altatás', yesNo, true)}`;
  }
  if (type === 'labor') {
    if (f.requestedOn === undefined) f.requestedOn = today();
    return `<div class="fields-2">${field('test', 'Vizsgálat', inText('test'), true)}${personField('notify', 'Kinek kell jelezni', profPeople(prof, [], true), 'Írd be a nevét', null, true, { empty: 'senkinek külön' })}
      ${field('requestedOn', 'A kérés napja', inDate('requestedOn'), true)}${field('expectedOn', 'Várható eredmény', inDate('expectedOn'), true)}</div>`;
  }
  if (type === 'engedely') {
    if (f.indication === undefined) f.indication = g ? g.dx : '';
    if (f.reqType === undefined) f.reqType = 'új';
    return `<div class="fields-2">${field('drug', 'Gyógyszer', inText('drug'), true)}${field('indication', 'Indikáció', inText('indication'), true)}</div>
      ${chipsF('reqType', 'Kérelemtípus', cfg.reqTypes.map(x => [x, x]))}${chipsF('offLabel', 'Indikáción túli alkalmazás', yesNo, true)}`;
  }
  if (T.isMeet(type)) {
    const sk = cfg.types[type].meeting;
    if (f.meeting === undefined) f.meeting = T.nextMeeting(sk);
    return meetingChooser('meeting', sk, '') + (T.flowOf(type) === 'd2t' ? '' : field('region', 'Régió vagy terület', inText('region'), true)) + `<div class="field"><label class="field-label" for="f-summary">Rövid összefoglaló <span class="opt">(nem kötelező)</span></label>${inArea('summary')}</div>`;
  }
  if (type === 'atadas') return `<div class="fields-2">${field('institution', 'Fogadó intézmény', inText('institution'), true)}${field('recvDoctor', 'Fogadó orvos', inText('recvDoctor'), true)}
      ${field('contact', 'Intézményi elérhetőség', inText('contact'), true)}${field('plannedOn', 'Tervezett nap', inDate('plannedOn'), true)}</div>`;
  return '';
}
function spawnData(type, f, prof, owners) {
  const yn = v => v === 'igen' ? true : v === 'nem' ? false : undefined;
  let d = {};
  if (type === 'vizsgalat') d = { exam: f.exam || 'MR', region: f.region || '', from: f.from || '', to: f.to || '', anesthesia: yn(f.anesthesia) };
  else if (type === 'labor') d = { test: f.test || '', requestedOn: f.requestedOn || '', expectedOn: f.expectedOn || '', notify: f.notify || '' };
  else if (type === 'engedely') d = { drug: f.drug || '', indication: f.indication || '', reqType: f.reqType || 'új', offLabel: yn(f.offLabel) };
  else if (T.isMeet(type)) d = { question: (f.ltitle || '').trim(), region: T.flowOf(type) === 'd2t' ? '' : f.region || '', summary: f.summary || '' };
  else if (type === 'atadas') d = { institution: f.institution || '', recvDoctor: f.recvDoctor || '', contact: f.contact || '', plannedOn: f.plannedOn || '', coordinator: owners[0] || '', docReady: false };
  return Object.assign(d, plusData(prof, type, f));
}
function spawnPanel(t, key) {
  const pn = ui.panel; if (!pn || pn.kind !== 'spawn' || pn.key !== key || pn.tid !== t.id || t.done || t.spawned) return '';
  const f = ui.f, c = T.Cs(t.caseId); if (!c) return '';
  const prof = c.profileId, pt = c.patientId ? T.P(c.patientId) : null, menu = cfg.newMenu[prof] || [];
  const all = T.spawnTypes(prof, true), types = all.filter(x => !T.isMeet(x)).concat(all.filter(T.isMeet));
  const tname = ty => (menu.find(m => m[0] === ty) || [ty, cfg.types[ty].name])[1];
  if (f.ltitle === undefined) f.ltitle = t.text;
  if (f.ldue === undefined) f.ldue = t.due || '';
  const type = types.indexOf(f.ltype) > -1 ? f.ltype : '', eT = f._eType;
  let body = `<fieldset class="field"${eT ? ' aria-describedby="lk-type-err"' : ''}><legend>Milyen ügy lesz belőle?</legend><p class="field-hint">Kapcsolt ügy akkor kell, ha a munka egy másik área dolga, saját lépésekkel; különben elég a teendő.</p>
    <div class="chips">${types.map((ty, i) => `<label class="chip"><input type="radio" name="c-ltype" value="${esc(ty)}" data-f="ltype" data-rerender="1"${i === 0 ? ' data-k="lk-type-first"' : ''}><span>${esc(tname(ty))}</span></label>`).join('')}</div>
    ${eT ? `<p class="err" id="lk-type-err" role="alert">${ico('alert')}<span>${esc(eT)}</span></p>` : ''}</fieldset>`;
  let prev = '';
  if (type) {
    const S = spawnOwnerSpec(t, c, type); if (!S.opts.some(o => o[0] === f.lowner)) f.lowner = S.def;
    const owners = spawnOwners(t, c, f), an = T.areaName(T.areaFor(type, prof, T.me()));
    const first = T.stepLabel({ type, profileId: prof, data: {} }, cfg.types[type].steps[0].id), carried = [];
    if (pt) carried.push('a beteg');
    if ((T.isMeet(type) || T.titleFromTask(type)) && (f.ltitle || '').trim() === t.text.trim()) carried.push('a cím');
    if (t.due && f.ldue === t.due) carried.push('a határidő (' + fmtDate(t.due) + ')');
    const ownCarried = !!t.owner && owners.length === 1 && owners[0] === t.owner;
    if (ownCarried) carried.push('a felelős (' + userName(t.owner) + ')');
    const who = ownCarried ? '' : !owners.length ? ' · felelős nélkül, a munkalistán a „Felelős nélkül” részben' : owners[0] === '?' ? '' : ' · viszi: ' + owners.map(userName).join(', ');
    prev = `<p>Hová kerül: ${esc(art(an) + ' ' + an)} munkalistájára · első lépés: ${esc(first)}${esc(who)}</p>${carried.length ? `<p>Átkerül: ${esc(carried.join(', '))}</p>` : ''}`;
    body += `<div class="lk-prev"><div id="lk-prev" aria-live="polite">${prev}</div></div>`;
    body += spawnTitleField(type) + spawnTypeFields(type, prof, pt) + plusFields(prof, type) + field('ldue', 'Határidő', inDate('ldue'), true);
    body += `<fieldset class="field"><legend>Felelős</legend><div class="chips">${S.opts.map(o => `<label class="chip"><input type="radio" name="c-lowner" value="${o[0]}" data-f="lowner" data-rerender="1"><span>${esc(o[1])}</span></label>`).join('')}</div></fieldset>`
      + (f.lowner === 'other' ? personField('lownerId', 'Ki?', profPeople(prof, [T.me()]), 'Írd be a nevét', f._eOwner, false, { errKey: '_eOwner' }) : '');
  } else body += `<div id="lk-prev" aria-live="polite"></div>`;
  const owners = type ? spawnOwners(t, c, f) : null;
  return `<form class="link-form" data-form="spawn" data-id="${t.id}" data-key="${esc(key)}" novalidate aria-labelledby="lk-h">
    <h3 class="form-h" id="lk-h" tabindex="-1" data-k="lk-h">Kapcsolt ügy indítása</h3>
    <p class="lk-from">Innen indul: ${esc(shortName(c))}${pt ? ' · ' + esc(ptName(pt)) + ', <span class="taj">' + esc(T.patientId(pt)) + '</span>' : ''}<br>A teendőből: „${esc(t.text)}”</p>
    ${body}${f._err ? `<p class="err" role="alert">${ico('alert')}<span>${esc(f._err)}</span></p>` : ''}
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="lk-save">${ico('check')}${esc(type ? consequenceLabel(owners) : 'Kapcsolt ügy indítása')}</button><button class="btn btn-quiet" type="button" data-act="spawn-cancel" data-key="${esc(key)}">Mégse</button></div>
    <p class="hint">${T.spawnClosesTask ? 'A teendő ezzel kész lesz; rajta marad, hogy kapcsolt ügy lett belőle.' : 'A teendő nyitva marad; rajta marad, hogy kapcsolt ügy indult belőle.'}</p></form>`;
}
/* ---------------- Nézet: új beteg (K3.2–K3.5) ---------------- */
function vUjBeteg() {
  ui.title = 'Új beteg'; const f = ui.f;
  if (f._init !== 'ub') { f._init = 'ub'; const q = ui.r.q.q || ''; if (/\d/.test(q)) f.taj = q; else f.pname = q; }
  const ex = f._exists ? T.P(f._exists) : null, back = crumbBack();
  return `<nav class="crumbs" aria-label="Hol vagy"><a href="${back[0]}">${esc(back[1])}</a><span aria-hidden="true">/</span><span aria-current="page">Új beteg</span></nav>
    <div class="page narrow" style="padding:0; margin:0"><h1 tabindex="-1" data-k="h1">Új beteg felvétele</h1><p class="lede">A felvételhez a TAJ elég; a név később is megadható. A beteg a(z) ${esc(T.profileName(T.U(T.me()).profile))} gondozásába kerül.</p>
    <form data-form="new-patient" novalidate style="margin-top:2rem">
      ${f.noTaj ? '' : field('taj', 'TAJ (9 számjegy)', inText('taj', ' inputmode="numeric" class="text-input short" aria-describedby="taj-h"'))}
      ${f.noTaj ? '' : '<p class="field-hint" id="taj-h" style="margin-top:.375rem">Szóközzel vagy anélkül is beírhatod.</p>'}
      ${f._err ? `<p class="err" role="alert">${ico('alert')}<span>${esc(f._err)}</span></p>` : ''}
      ${ex ? `<div class="notice is-ro" role="alert">${ico('alert')}<div><p><strong>Ez a TAJ már szerepel:</strong> ${esc(ex.name || 'név nélküli rekord')}, <span class="taj">${esc(T.patientId(ex))}</span>. Második rekord nem jön létre.</p><p class="meta">${T.patientAccess(ex.id) === 'own' ? `<a href="#/beteg/${ex.id}">A meglévő beteg megnyitása</a>` : `<button class="link-btn lg" type="button" data-act="add-care" data-pid="${ex.id}">A meglévő beteg felvétele a gondozásodba</button>`}</p></div></div>` : ''}
      <label class="check"><input type="checkbox" data-f="noTaj" data-k="noTaj"><span>A betegnek nincs TAJ-a (újszülött, külföldi): ideiglenes azonosítót kap</span></label>
      ${f.noTaj ? chipsF('reason', 'Miért nincs TAJ?', cfg.tempReasons.map(x => [x, x])) : ''}
      ${field('pname', f.noTaj ? 'Név (TAJ nélkül kötelező)' : 'Név', inText('pname'), !f.noTaj)}
      <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="np-save">${ico('check')}Felvétel</button><a class="btn btn-quiet" href="${back[0]}">Mégse</a></div></form></div>`;
}

/* ---------------- Nézet: összevonás (K3.6) – az egyetlen megerősítést kérő művelet ---------------- */
/* Összevonás (K3.6): csak a kijelölt munkatárs, csak a profilja két rekordja; az ütköző mezőkre választás kell; két nyitott felvételnél megáll */
function vOsszevonas(a, b) {
  ui.title = 'Összevonás';
  if (!T.canMerge()) return noAccess('Betegrekordot csak a profilban erre kijelölt munkatárs vonhat össze.');
  const A = T.P(a); if (!A || A.merged || T.patientAccess(a) !== 'own') return noAccess('Ilyen rekord nincs a profilodban.');
  if (!b) {
    const cands = T.state().patients.filter(p => !p.merged && p.id !== a && T.patientAccess(p.id) === 'own');
    return `<nav class="crumbs" aria-label="Hol vagy"><a href="#/beteg/${a}">${esc(ptName(A))}</a><span aria-hidden="true">/</span><span aria-current="page">Összevonás</span></nav><h1 tabindex="-1" data-k="h1">Melyik rekorddal vonod össze?</h1>
      <p class="lede">Válaszd ki a másik rekordot; utána egymás mellett látod a kettőt, és csak a megerősítés után vonjuk össze.</p><ul class="plain-list" style="margin-top:1.5rem">${cands.map(p => `<li><a href="#/osszevonas/${a}/${p.id}">${esc(p.name || 'név nélküli rekord')}, ${esc(T.patientId(p))}</a></li>`).join('')}</ul>`;
  }
  const B = T.P(b); if (!B || B.merged || b === a || T.patientAccess(b) !== 'own') return noAccess('A másik rekord nem a profilod betege, ezért nem vetheted össze és nem vonhatod össze vele.');
  const keepId = A.taj ? a : B.taj ? b : a, goneId = keepId === a ? b : a, K = T.P(keepId), G = T.P(goneId);
  const conflicts = T.mergeConflicts(keepId, goneId), blocked = T.mergeBlocked(keepId, goneId), f = ui.f;
  const col = (p, title) => {
    const cs = T.state().cases.filter(c => c.patientId === p.id).map(c => ({ c, acc: T.caseAccess(c) })).filter(x => x.acc !== 'none');
    const ap = T.state().appearances.filter(x => x.patientId === p.id && T.isMember(T.me(), x.profileId));
    const adm = T.openAdmission(p.id);
    return `<div><h2>${esc(title)}</h2><dl class="dl"><dt>Név</dt><dd>${esc(p.name || '–')}</dd><dt>Azonosító</dt><dd>${esc(T.patientId(p))}${p.temp && p.taj ? ' (korábban ' + esc(p.temp) + ')' : ''}</dd>${p.tempReason ? `<dt>Ok</dt><dd>${esc(p.tempReason)}</dd>` : ''}<dt>Felvéve</dt><dd>${esc(T.caresOf(p.id).filter(g => T.isMember(T.me(), g.profileId)).map(g => T.profileName(g.profileId) + ', ' + fmtDate(g.since)).join('; '))}</dd><dt>Most</dt><dd>${adm ? 'bent fekszik: ' + esc(adm.place) : 'járó'}</dd></dl>
      <p class="hint">Látható ügyek: ${cs.length}</p><ul>${cs.map(x => x.acc === 'header' ? `<li>${esc(T.commonType(x.c))} <span class="muted">(${esc(x.c.closed ? 'lezárt' : T.catWord[T.cat(x.c)])}, ${esc(T.profileName(x.c.profileId))}, csak fejléc)</span></li>` : `<li>${esc(T.caseTitle(x.c))} <span class="muted">(${esc(typeName(x.c))}${x.c.owners.length ? '' : ', felelős nélkül'})</span></li>`).join('') || '<li class="muted">nincs</li>'}</ul><p class="hint">Megjelenések a profilodban: ${ap.length}</p></div>`;
  };
  const choice = conflicts.map(x => `<fieldset class="field"><legend>${esc(x.label)}: melyik maradjon?</legend><div class="chips"><label class="chip"><input type="radio" name="mc-${esc(x.k)}" value="a" data-f="mc:${esc(x.k)}"><span>${esc(x.a)}</span></label><label class="chip"><input type="radio" name="mc-${esc(x.k)}" value="b" data-f="mc:${esc(x.k)}"><span>${esc(x.b)}</span></label></div></fieldset>`).join('');
  const missing = conflicts.filter(x => !f['mc:' + x.k]);
  return `<nav class="crumbs" aria-label="Hol vagy"><a href="#/beteg/${a}">${esc(ptName(A))}</a><span aria-hidden="true">/</span><span aria-current="page">Összevonás</span></nav>
    <h1 tabindex="-1" data-k="h1">Két rekord összevetése</h1><p class="lede">Ugyanaz a beteg? Ha igen, egy rekord marad, ${esc(T.patientId(K.taj ? K : G))} azonosítóval; minden ügy, megjelenés és előzmény egyesül.</p>
    <div class="cmp">${col(K, 'A megmaradó rekord')}${col(G, 'A beolvadó rekord')}</div>
    ${blocked ? `<div class="notice is-ro" role="alert">${ico('alert')}<div><p><strong>Most nem vonható össze.</strong> ${esc(blocked)}</p></div></div>` : ''}
    ${!blocked && conflicts.length ? `<section class="section" aria-labelledby="h-valaszt"><div class="section-head"><h2 id="h-valaszt">Eltérő adatok: válassz</h2></div><p class="group-note">Mindkét rekordban ki van töltve, és eltér; az összevonás csak a választás után indul.</p>${choice}${f._mErr ? `<p class="err" role="alert" id="mc-err">${ico('alert')}<span>Válassz minden eltérő adatnál.</span></p>` : ''}</section>` : ''}
    <div class="form-actions" style="margin-top:2.5rem">${blocked ? '' : `<button class="btn btn-primary" type="button" data-act="merge-ask" data-k="merge">Összevonás…</button>`}<a class="btn btn-quiet" href="#/beteg/${a}">Mégse</a></div>
    <dialog id="merge-dlg" aria-labelledby="mg-h"><h2 id="mg-h">Összevonod a két rekordot?</h2><p>Egy rekord marad: <strong>${esc((f['mc:name'] === 'b' ? G.name : K.name) || G.name || 'név nélkül')}</strong>, <span class="taj">${esc(T.patientId(K.taj ? K : G))}</span>. Ez nem vonható vissza, és bekerül a naplóba.</p>
      <div class="form-actions"><button class="btn btn-primary" type="button" data-act="merge-do" data-keep="${keepId}" data-gone="${goneId}">Igen, összevonom</button><button class="btn btn-quiet" type="button" data-act="merge-cancel">Mégse</button></div></dialog>`;
}
/* ---------------- Nézet: napló (K12.2) ---------------- */
/* Napló (K12.2): a kijelölt munkatárs a saját profilja betegére kérdezhet; más profil ügyeiről csak a fejléc jelenik meg (bírálat 2.) */
function vNaplo(pid) {
  ui.title = 'Napló';
  if (!T.canAudit()) return noAccess('A napló lekérdezéséhez külön kijelölés kell.');
  const p = T.P(pid); if (!p) return noAccess('Ilyen beteg nincs.');
  if (T.patientAccess(pid) !== 'own') return noAccess('A naplólekérdezési jogod a profilodra szól; ez a beteg nem a profilod betege.');
  const ids = [pid].concat(T.state().patients.filter(x => x.merged === pid).map(x => x.id));
  const rows = T.state().audit.filter(e => ids.indexOf(e.pid) > -1).slice().reverse();
  const actName = { 'kártya': 'a betegkártyát megnyitotta', 'ügy': 'egy ügyét megnyitotta', 'csatolmány': 'csatolmányt nyitott meg', 'naplólekérdezés': 'lekérdezte a naplót' };
  const line = e => {
    const c = e.cid ? T.Cs(e.cid) : null, ownCase = c && T.isMember(T.me(), c.profileId);
    const dy = e.did ? T.Dy(e.did) : null, prof = e.prof || (dy && dy.profileId) || null;
    const ok = c ? ownCase : dy ? T.dutyVisible(dy) : (!prof || T.isMember(T.me(), prof));
    const what = c ? (ownCase ? ' <span class="muted">(' + esc(T.caseTitle(c)) + ')</span>' : ' <span class="muted">(' + esc(T.commonType(c)) + ', ' + esc(T.profileName(c.profileId)) + ')</span>')
      : !ok && prof ? ' <span class="muted">(' + esc(T.profileName(prof)) + ')</span>' : '';
    const detail = e.detail && ok ? ': ' + esc(e.detail) : '';
    return `<li><time>${esc(fmtDate(e.at.slice(0, 10)))} ${esc(D.hm(e.at))}</time><span><strong>${esc(userName(e.by))}</strong> ${esc(actName[e.act] || e.act)}${detail}${what}</span></li>`;
  };
  return `<nav class="crumbs" aria-label="Hol vagy"><a href="#/beteg/${pid}">${esc(ptName(p))}</a><span aria-hidden="true">/</span><span aria-current="page">Napló</span></nav>
    <h1 tabindex="-1" data-k="h1">Ki és mikor nézte meg?</h1><p class="lede">${esc(ptName(p))}, <span class="taj">${esc(T.patientId(p))}</span> · minden megnyitás és módosítás, a legújabb elöl. Más profil ügyeiről csak a fejléc látszik. A lekérdezés maga is a naplóba kerül.</p>
    <ul class="history-list" style="margin-top:2rem">${rows.map(line).join('')}</ul>`;
}
/* ---------------- Nézet: csatolmány (K4.13) – helyi mintatartalom, az ügy jogosultságával, naplózva ---------------- */
function vCsatolmany(cid, idx) {
  ui.title = 'Csatolmány';
  if (T.mode() === 'leader') return noAccess('Vezetői szerepben csatolmány nem nyitható meg.');
  const c = T.Cs(cid), x = c && c.files[Number(idx)];
  if (!c || !x) return noAccess('Ilyen csatolmány nincs.');
  const acc = T.caseAccess(c); if (acc !== 'write' && acc !== 'read') return noAccess('Ehhez a csatolmányhoz nincs jogosultságod; közvetlen hivatkozással sem nyitható meg.');
  const p = c.patientId ? T.P(c.patientId) : null, img = /\.png$/i.test(x.name);
  const docTitle = /kerelem/.test(x.name) ? 'Kérelem' : /hatarozat/.test(x.name) ? 'Határozat' : /orvosi-osszefoglalo/.test(x.name) ? 'Orvosi összefoglaló' : /konziliumi/.test(x.name) ? 'Konzíliumi összefoglaló' : 'Irat';
  return `<nav class="crumbs" aria-label="Hol vagy">${p ? `<a href="#/beteg/${p.id}">${esc(ptName(p))}</a><span aria-hidden="true">/</span>` : ''}<a href="#/ugy/${c.id}">${esc(T.caseTitle(c))}</a><span aria-hidden="true">/</span><span aria-current="page">Csatolmány</span></nav>
    <p class="case-pt">${p ? ptLink(p) + `<span class="taj">${esc(T.patientId(p))}</span>` : ''}</p>
    <h1 tabindex="-1" data-k="h1">${esc(x.name)}</h1><p class="lede">Csatolta: ${esc(userName(x.by))}, ${esc(T.relAt(x.at))} · ${esc(typeName(c))} · a megnyitás a naplóba került.</p>
    <div class="viewer">${img ? `<img src="minta/kitalalt-mr-kivagat.png" alt="Kitalált mintakép: szürke árnyalatos, MR-szerű kivágat; nem valódi felvétel." width="640" height="400">`
      : `<article class="sample-doc" aria-label="Kitalált mintairat"><p class="kicker">Kitalált mintairat · a próbában nincs valódi fájl</p><h2>${esc(docTitle)}</h2><p>Beteg: ${p ? esc(ptName(p)) + ', ' + esc(T.patientId(p)) : '–'}</p><p>Ügy: ${esc(T.caseTitle(c))}</p><p>Ez a dokumentum a próba kitalált mintája. Valódi betegadat nincs benne; a tartalma csak azt mutatja, hogy a csatolmány az ügy jogosultságával nyílik meg.</p></article>`}</div>
    <p class="note-line"><a href="#/ugy/${c.id}">Vissza az ügyhöz</a></p>`;
}
/* ---------------- Nézet: Beállítások – a profil adminjának és a fő adminnak ----------------
   CT döntése (2026-11-19): a profil minden beállítása itt van, a felületen. A beépített technikai adminfelület csak az üzemeltetőé:
   a klinika szerkezete (részlegek) és új profil. Elöl a gyakori feladat (jóváhagyás, tagok, áreák), mellette egy kattintásra
   a ritkábbak: ügytípusok és változatok, megbeszélések, emlékeztetők, közös nézetek, kijelölt feladatkörök (K2.3, K4.2, K4.17,
   K5.9, K6.6, K6.7, K7.3, K9.9, K9.12, K9.13; E 1–7, F1 1d). */
const whereOf = rq => rq.profile ? T.profileName(rq.profile) + ', ' + cfg.departments[cfg.profiles[rq.profile].dept].name : rq.dept ? cfg.departments[rq.dept].name + ' részleg' : 'a klinika';
const DAY_ON = { 1: 'hétfőn', 2: 'kedden', 3: 'szerdán', 4: 'csütörtökön', 5: 'pénteken' };
const SET_PARTS = {
  ugytipusok: ['Ügytípusok és lépések (státuszok)', 'Az ügy a lépésein halad végig; a lépés a klinika szavával a státusz. A hat általános ügytípus a klinika katalógusából jön: a profil bekapcsolja, amit használ, és saját változatot készít belőle (név, área, a lépések neve, plusz adatok). Mellé saját ügytípust is létrehozhat, saját lépésekkel.'],
  megbeszelesek: ['Megbeszélések', 'Az esetmegbeszélés változatai: mindegyiknek saját napja, résztvevői és bejelentési határideje van. Az alkalmak ebből jönnek létre, a napirend a bejelentett esetekből magától áll össze.'],
  emlekeztetok: ['Emlékeztetők', 'Mikor szóljon az emlékeztető, ügytípusonként. Az emlékeztető kevés, összevont, és mindig dátumhoz kötött.'],
  nezetek: ['Közös nézetek', 'A munkalisták kész nézetei áreánként; a profil minden tagjánál ezek látszanak. Saját nézetet bárki menthet a munkalistán: az csak neki látszik, és ezt a menüt nem bővíti.'],
  feladatkorok: ['Kijelölt feladatkörök', 'Két feladat csak a kijelölteké, a profilra szólva.']
};
const deptName = prof => cfg.departments[cfg.profiles[prof].dept].name;
const setQ = (prof, profs) => profs.length > 1 ? '?profil=' + prof : '';
const vlabel = (prof, type) => { const v = T.variant(prof, type); return (v && v.name) || cfg.types[type].name; };
function vBeallitasok(part) {
  ui.title = 'Beállítások';
  const uid = T.me(), u = T.U(uid);
  if (u.mainAdmin) return mainAdminPage();
  const profs = T.adminProfiles(uid);
  if (!profs.length) return noAccess('A profil beállításait a profil adminja kezeli.');
  const prof = profs.indexOf(ui.r.q.profil) > -1 ? ui.r.q.profil : profs.indexOf(u.profile) > -1 ? u.profile : profs[0];
  const src = T.adminSource(uid, prof);
  const as = src.kind === 'head' ? 'admin: osztályvezetőként, alapból' : src.kind === 'leader' ? 'admin: ' + src.role + 'ként, alapból' : src.kind === 'first' ? 'admin: az üzemeltető jelölte ki a profil létrehozásakor' : 'admin: az adminjogot ' + userName(src.by) + ' adta';
  const seg = profs.length > 1 ? `<ul class="seg" aria-label="Melyik profil beállításai">${profs.map(p => `<li><a href="#/beallitasok${part && SET_PARTS[part] ? '/' + part : ''}?profil=${p}"${p === prof ? ' aria-current="page"' : ''}>${esc(T.profileName(p))}</a></li>`).join('')}</ul>` : '';
  const P = part && SET_PARTS[part];
  if (P) {
    ui.title = P[0] + ' – Beállítások';
    const body = { ugytipusok: typesPage, megbeszelesek: meetingsPage, emlekeztetok: remindersPage, nezetek: viewsPage, feladatkorok: dutiesPage }[part](prof, setQ(prof, profs));
    return `<nav class="crumbs" aria-label="Hol vagy"><a href="#/beallitasok${setQ(prof, profs)}">Beállítások</a><span aria-hidden="true">/</span><span aria-current="page">${esc(P[0])}</span></nav>
      <div class="page-head"><div><h1 tabindex="-1" data-k="h1">${esc(P[0])}</h1><p class="lede">${esc(T.profileName(prof))}, ${esc(deptName(prof))} · ${esc(as)}</p></div></div>
      ${seg}<p class="set-intro">${esc(P[1])}</p>${body}`;
  }
  return `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Beállítások</h1><p class="lede">${esc(T.profileName(prof))}, ${esc(deptName(prof))} · ${esc(as)}</p></div></div>
    ${seg}
    <div class="layout set-home"><div class="primary">${requestsSection(T.requestsFor(uid, prof), prof)}${membersSection(prof)}${areasSection(prof)}${typesFront(prof, profs)}</div>
    <div class="side">${rareLinks(prof, setQ(prof, profs))}${fixedNote()}</div></div>`;
}
function mainAdminPage() {
  return `<div class="page-head"><div><h1 tabindex="-1" data-k="h1">Beállítások</h1><p class="lede">Fő admin · a klinika</p></div></div>
    <p class="note-line">A fő admin hagyja jóvá az osztályvezetők, a főnővérek és a vezetőség regisztrációját. A profilok beállítása a profilok adminjainál van, ezen a felületen. A klinika szerkezetét és az új profilt az üzemeltető állítja be.</p>
    ${requestsSection(T.requestsFor(T.me()), null)}`;
}
/* Ügytípusok és lépéseik (státuszok) a főoldalon, a tagok és az áreák után (CT, 2026-11-19): a klinika szavával a lépés a státusz;
   az admin itt látja, milyen lépéseken halad az ügy, és egy kattintással a szerkesztőben van, fejlesztés nélkül */
function typesFront(prof, profs) {
  const vs = cfg.variants[prof] || {}, base = '#/beallitasok/ugytipusok', pq = profs.length > 1 ? 'profil=' + prof + '&' : '';
  const to = (path, k) => path + '?' + pq + 'nyit=' + encodeURIComponent(k);
  const meets = Object.keys(cfg.series).filter(k => cfg.series[k].profile === prof);
  const list = cfg.catalog.filter(k => k.type !== 'meeting' && vs[k.type] && vs[k.type].on).map(k => ({ type: k.type, name: vlabel(prof, k.type), kind: k.name, href: to(base, k.type) }))
    .concat(meets.map(k => ({ type: k, name: vlabel(prof, k), kind: 'Esetmegbeszélés', href: to('#/beallitasok/megbeszelesek', k) })))
    .concat(T.state().types.filter(t => t.profile === prof).map(t => ({ type: t.id, name: t.name, kind: 'Saját ügytípus', href: to(base, t.id) })));
  const off = cfg.catalog.filter(k => k.type !== 'meeting' && vs[k.type] && !vs[k.type].on).map(k => k.name);
  const steps = type => { const t = cfg.types[type], fake = { type, profileId: prof, data: {} }; return t.steps.concat(t.closeSteps || []).map(s => T.stepLabel(fake, s.id)); };
  const row = x => `<li><div class="li-main"><h3 class="area-name">${esc(x.name)}</h3><span class="member-act"><a class="btn-sm" href="${x.href}" data-k="tf-${esc(x.type)}">Lépések és adatok${sr(': ' + x.name)}</a></span></div>
    <p class="li-sub">${x.kind !== x.name ? esc(x.kind) + ' · ' : ''}${esc(T.areaName(cfg.defaultArea[prof][x.type]))}</p>
    <ol class="step-line" aria-label="${esc(x.name)}: lépések (státuszok)">${steps(x.type).map(l => `<li>${esc(l)}</li>`).join('')}</ol></li>`;
  return `<section class="section" aria-labelledby="h-tipusok-fo"><div class="section-head"><h2 id="h-tipusok-fo">Ügytípusok és lépések (státuszok) <span class="count">${list.length}</span></h2><a class="link-btn lg" href="${to(base, 'uj')}" data-k="tf-uj">${ico('plus')} Új ügytípus</a></div>
    <p class="group-note">Az ügy a lépésein halad végig; a lépés a klinika szavával a státusz. A lépések neve átnevezhető, a kategóriájuk kötött. Ha egy folyamat egyik ügytípusba sem illik, új ügytípus hozható létre, saját lépésekkel.</p>
    ${list.length ? `<ul class="plain-list tf-list">${list.map(row).join('')}</ul>` : '<p class="grp-empty">Még nincs bekapcsolt ügytípus.</p>'}
    <p class="hint">${off.length ? 'Bekapcsolható még: ' + esc(off.join(', ')) + '. ' : ''}<a href="${base}${profs.length > 1 ? '?profil=' + prof : ''}">Az összes ügytípus: bekapcsolás, plusz adatok</a></p></section>`;
}
/* A ritkább beállítások: egy-egy sor arról, mi most a beállítás, és egy kattintással ott vagy */
function rareLinks(prof, q) {
  const vs = cfg.variants[prof], meets = Object.keys(cfg.series).filter(k => cfg.series[k].profile === prof), own = T.state().types.filter(t => t.profile === prof).length;
  const on = cfg.catalog.filter(k => k.type === 'meeting' ? meets.length : vs[k.type] && vs[k.type].on).length;
  const areas = cfg.areaOrder[prof], views = areas.reduce((n, a) => n + areaViews(a).length, 0), hidden = areas.reduce((n, a) => n + readyViews(a).length - areaViews(a).length, 0);
  const d = T.state().duties.find(x => x.id === prof) || { merge: [], audit: [] }, names = l => l.map(userName).join(', ') || 'senki';
  const items = [
    ['megbeszelesek', 'Megbeszélések', meets.length ? meets.map(k => vlabel(prof, k) + ': ' + DAY_ON[cfg.series[k].dow]).join(' · ') : 'még nincs megbeszélés'],
    ['emlekeztetok', 'Emlékeztetők', 'engedély ' + T.remindOf(prof, 'engedely') + ' hét · vizsgálat ' + T.remindOf(prof, 'vizsgalat') + ' hét · átadás ' + T.remindOf(prof, 'atadas') + ' hónap'],
    ['nezetek', 'Közös nézetek', areas.length ? areas.length + ' área, ' + views + ' nézet' + (hidden ? ', ' + hidden + ' elrejtve' : '') : 'még nincs área'],
    ['feladatkorok', 'Kijelölt feladatkörök', 'összevonás: ' + names(d.merge) + ' · napló: ' + names(d.audit)]
  ];
  return `<section class="group set-rare" aria-labelledby="h-ritkabban"><h2 class="group-title" id="h-ritkabban">Ritkábban kell</h2>
    <ul class="side-list set-links">${items.map(x => `<li class="side-item"><a class="side-title" href="#/beallitasok/${x[0]}${q}" data-k="set-${x[0]}">${esc(x[1])}</a><p class="side-meta">${esc(x[2])}</p></li>`).join('')}</ul></section>`;
}
function fixedNote() {
  return `<section class="group" aria-labelledby="h-kotott"><h2 class="group-title" id="h-kotott">${ico('lock')}Kötött a klinika szintjén</h2>
    <p class="group-note">Az ügytípus-katalógus, az öt státuszkategória, a közös adatok, a szerepkörök és a láthatóság, az ügyelet és az emlékeztetők alapszabálya (K2.6). A profil ezeken belül állítja a sajátját.</p>
    <p class="group-note">A klinika szerkezetét (részlegek) és az új profilt az üzemeltető hozza létre.</p></section>`;
}
/* Jóváhagyásra váró regisztrációk (K9.13): a profil adminja szerepkörrel hagyja jóvá; az osztályvezetői és a vezetői kérést a fő admin */
function requestsSection(R, prof) {
  const roles = prof ? cfg.profileRoles.filter(r => !T.toMainAdmin(r)) : null;
  const seq = a => Number(a.id.replace(/\D/g, ''));
  const kept = R.decided.filter(a => ui.undo['req:' + a.id]), open = R.pending.concat(kept).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : seq(a) - seq(b))), done = R.decided.filter(a => !ui.undo['req:' + a.id]);
  const row = a => {
    const key = 'req:' + a.id, rq = a.req;
    let acts;
    if (ui.undo[key]) acts = undoHtml(key);
    else {
      if (roles && roles.indexOf(ui.f['rq-' + a.id]) === -1) ui.f['rq-' + a.id] = roles.indexOf(rq.role) > -1 ? rq.role : roles[0];
      const role = roles ? ui.f['rq-' + a.id] : rq.role;
      const sel = roles ? `<div class="field"><label class="field-label" for="f-rq-${a.id}">Szerepkör a profilban${sr(', ' + a.name)}</label><select class="select" id="f-rq-${a.id}" data-f="rq-${a.id}" data-k="f-rq-${a.id}">${roles.map(r => `<option value="${esc(r)}"${r === role ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></div>` : '';
      acts = `${sel}<div class="act-pair"><button class="btn-sm btn-fill" type="button" data-act="req-approve" data-id="${a.id}" data-k="act:${key}">${ico('check')}Jóváhagyom: ${esc(role)}${sr(', ' + a.name)}</button><button class="btn-sm" type="button" data-act="req-reject" data-id="${a.id}" data-k="rej:${key}">Elutasítom${sr(': ' + a.name)}</button></div>`;
    }
    return `<li class="req"><div class="li-main"><span class="req-name">${esc(a.name)}</span><span class="muted">kérte: ${esc(T.relAt(a.at))}</span></div>
      <p class="li-sub">${esc(cap(rq.role))} · ${esc(whereOf(rq))}${a.email ? ' · ' + esc(a.email) : ''}</p><div class="req-acts">${acts}</div></li>`;
  };
  const drow = a => `<li><div class="li-main"><span class="req-name">${esc(a.name)}</span><span class="muted">${esc(T.relAt(a.decided.at))}</span></div>
    <p class="li-sub">${a.status === 'approved' ? 'Jóváhagyta: ' + esc(userName(a.decided.by)) + ' · ' + esc(a.decided.role) : 'Elutasította: ' + esc(userName(a.decided.by)) + ' · nem került a profilba'} · ${esc(whereOf(a.req))}</p></li>`;
  const note = prof ? 'Aki maga regisztrált, és ehhez a profilhoz kéri, hogy rendeljék. Jóváhagyásig betegadatot nem lát. Osztályvezetői, főnővéri és vezetői kérést a fő admin bírál el.'
    : 'Osztályvezetői, főnővéri és vezetői szerepkörű kérések az egész klinikáról. Jóváhagyásig a fiók betegadatot nem lát.';
  return `<section class="section" aria-labelledby="h-jovahagy"><div class="section-head"><h2 id="h-jovahagy">Jóváhagyásra vár <span class="count">${open.length}</span></h2></div>
    <p class="group-note">${esc(note)}</p>
    ${open.length ? `<ul class="plain-list">${open.map(row).join('')}</ul>` : '<p class="grp-empty">Most nincs jóváhagyásra váró kérés.</p>'}
    ${done.length ? `<h3 class="sub-head">Elbírálva <span class="count">${done.length}</span></h3><ul class="plain-list">${done.map(drow).join('')}</ul>` : ''}</section>`;
}
/* Tagok (K9.9, K9.12): szerepkör, eltávolítás és adminjog. Új tag a regisztrációval jön; az osztályvezetői szerepkört a fő admin kezeli. */
function membersSection(prof) {
  const uid = T.me(), grant = T.canGrant(uid, prof), heads = T.headOf(prof), members = T.membersOf(prof);
  const open = ui.panel && ui.panel.kind === 'member' ? ui.panel.id : null;
  const inAreas = k => cfg.areaOrder[prof].map(a => cfg.areas[a]).filter(a => a.members.indexOf(k) > -1 || a.owner === k || a.deputy === k).map(a => a.name + (a.owner === k ? ' (felelős)' : a.deputy === k ? ' (helyettes)' : ''));
  /* Az épp eltávolított tag sora a visszavonás idejére a helyén marad */
  const gone = Object.keys(ui.undo).filter(x => x.indexOf('member:') === 0).map(x => x.slice(7)).filter(k => cfg.users[k] && cfg.users[k].removed && cfg.users[k].removed.from === prof && members.indexOf(k) === -1);
  const row = k => {
    const m = cfg.users[k], src = T.adminSource(k, prof), key = 'admin:' + k, mkey = 'member:' + k;
    if (m.removed) return `<li class="is-gone"><div class="li-main"><span><span class="member-name">${esc(m.name)}</span> <span class="muted">kikerült a profilból</span></span><span class="member-act">${undoHtml(mkey)}</span></div></li>`;
    const how = !src ? '' : src.kind === 'head' ? 'alapból, osztályvezetőként' : src.kind === 'leader' ? 'alapból, ' + src.role + 'ként' : src.kind === 'first' ? 'az üzemeltető jelölte ki, a profil létrehozásakor' : userName(src.by) + ' adta, ' + T.relAt(src.at);
    let act = '';
    if (ui.undo[key]) act = undoHtml(key);
    else if (ui.undo[mkey]) act = undoHtml(mkey);
    /* Az osztályvezetői és a főnővéri szerepkört a fő admin kezeli; a főnővérnek az osztályvezető ettől még adhat adminjogot.
       A saját szerepkörét és tagságát senki nem módosítja (a prototípus bírálata, 1.): a sorában nincs „Módosítás” */
    else if (open !== k && k !== uid && (!T.toMainAdmin(m.role) || (!m.head && grant && !src))) act = `<button class="btn-sm" type="button" data-act="member-open" data-id="${k}" data-k="mod:${k}">Módosítás${sr(': ' + m.name)}</button>`;
    const selfNote = k === uid && !T.toMainAdmin(m.role) ? 'A saját szerepkörödet és tagságodat a profil másik adminja módosíthatja' : '';
    const ar = inAreas(k), sub = [how ? 'Admin: ' + esc(how) : '', T.toMainAdmin(m.role) ? cap(art(m.role)) + ' ' + m.role + 'i szerepkört a fő admin kezeli' : '', selfNote, ar.length ? 'Áreák: ' + esc(ar.join(', ')) : ''].filter(Boolean).join(' · ');
    return `<li${open === k ? ' class="is-open"' : ''}><div class="li-main"><span><span class="member-name">${esc(m.name)}</span> <span class="muted">${esc(m.role)}</span></span><span class="member-act">${src ? '<span class="tag">admin</span>' : ''}${act}</span></div>
      ${sub ? `<p class="li-sub">${sub}</p>` : ''}${open === k ? memberEditor(k, prof) : ''}</li>`;
  };
  const note = grant ? 'Az admin elbírálja a profilhoz érkező regisztrációt, és beállítja a profilt. Adminjogot csak az osztályvezető ad, a tag „Módosítás” gombjával.'
    : heads.length ? 'Adminjogot a profil osztályvezetője ad: ' + heads.map(userName).join(', ') + '.' : 'Adminjogot a profil osztályvezetője ad; a profilnak most nincs osztályvezetője.';
  return `<section class="section" aria-labelledby="h-tagok"><div class="section-head"><h2 id="h-tagok">Tagok <span class="count">${members.length}</span></h2></div>
    <p class="group-note">${esc(note)} Alapból admin a profil osztályvezetője és a vezetőség. Új tag a regisztrációval kerül a profilba: a kérése fent, a „Jóváhagyásra vár” részben jelenik meg.</p>
    ${members.length + gone.length ? `<ul class="plain-list members">${members.concat(gone).map(row).join('')}</ul>` : '<p class="grp-empty">A profilnak még nincs tagja.</p>'}</section>`;
}
/* A névelő a szó elejéhez igazodik: „az osztályvezetői”, „a főnővéri” */
/* A névelő: magánhangzóval kezdődő szó előtt „az”; a magánhangzóval ejtett betűszó előtt is („az MR-előjegyzés”) */
const art = w => /^[aáeéiíoóöőuúüű]/i.test(w) || /^[FLMNRSX](?=[A-ZÁÉÍÓÖŐÚÜŰ0-9-])/.test(w) ? 'az' : 'a';
function outText(L) {
  const items = [L.cases.length ? L.cases.length + ' nyitott ügye' : '', L.tasks.length ? L.tasks.length + ' teendője' : ''].filter(Boolean);
  const own = L.owner.map(a => a.name);
  return (items.length ? 'Ha eltávolítod: ' + items.join(' és ') + ' felelős nélkül marad, és az área munkalistáján a „Felelős nélkül” részben áll.' : 'Ha eltávolítod: nyitott ügye és teendője nincs.')
    + (own.length ? ' A(z) ' + own.join(', ') + ' új ügyei felelős nélkül indulnak.' : '') + (L.admin ? ' Az adminjoga is megszűnik.' : '') + ' Betegadatot ezután nem lát. 10 másodpercig visszavonható.';
}
function memberEditor(k, prof) {
  const f = ui.f, m = cfg.users[k], roles = cfg.profileRoles.filter(r => !T.toMainAdmin(r)), self = k === T.me(), fixed = T.toMainAdmin(m.role);
  if (self) return '';
  if (f._mrinit !== prof + ':' + k) { f._mrinit = prof + ':' + k; f.mrole = m.role; }
  /* A főnővéri szerepkört a profil adminja nem adhatja és nem veheti el (K9.12): itt csak az adminjog kiadása marad */
  if (fixed) return `<form class="inline-form member-edit" data-form="member" data-uid="${k}" data-prof="${prof}" novalidate aria-label="${esc(m.name)}: adminjog">
    <p class="hint member-out" style="margin:0">${esc(cap(art(m.role)))} ${esc(m.role)}i szerepkört a fő admin adja és veszi el; a profil adminja nem módosíthatja, és a profilból sem veheti ki.</p>
    ${T.canGrant(T.me(), prof) && !T.adminSource(k, prof) ? `<div class="member-out"><p class="hint">Adminjog: elbírálja a profilhoz érkező regisztrációt, és beállítja a profilt. 10 másodpercig visszavonható.</p><button class="btn-sm" type="button" data-act="admin-grant" data-id="${k}" data-prof="${prof}" data-k="act:admin:${k}">Adminjogot adok${sr(': ' + m.name)}</button></div>` : ''}
    <div class="form-actions"><button class="btn-sm" type="button" data-act="member-close" data-id="${k}">Mégse</button></div></form>`;
  return `<form class="inline-form member-edit" data-form="member" data-uid="${k}" data-prof="${prof}" novalidate aria-label="${esc(m.name)}: szerepkör és tagság">
    <div class="field"><label class="field-label" for="f-mrole">Szerepkör a profilban</label><select class="select" id="f-mrole" data-f="mrole" data-k="f-mrole" data-rerender="1">${roles.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select></div>
    <div class="form-actions"><button class="btn-sm btn-fill" type="submit" data-k="m-save">${f.mrole && f.mrole !== m.role ? 'Mentés: ' + esc(f.mrole) : 'Mentés'}</button><button class="btn-sm" type="button" data-act="member-close" data-id="${k}">Mégse</button></div>
    ${T.canGrant(T.me(), prof) && !T.adminSource(k, prof) ? `<div class="member-out"><p class="hint">Adminjog: elbírálja a profilhoz érkező regisztrációt, és beállítja a profilt. 10 másodpercig visszavonható.</p><button class="btn-sm" type="button" data-act="admin-grant" data-id="${k}" data-prof="${prof}" data-k="act:admin:${k}">Adminjogot adok${sr(': ' + m.name)}</button></div>` : ''}
    <div class="member-out">${self ? '<p class="hint">Saját magadat nem veheted ki a profilból.</p>' : `<p class="hint">${esc(outText(T.memberLoad(k, prof)))}</p><button class="btn-sm" type="button" data-act="member-remove" data-id="${k}" data-prof="${prof}" data-k="m-remove">Eltávolítom a profilból${sr(': ' + m.name)}</button>`}</div></form>`;
}
/* Áreák (K2.3): név, tagok (ki dolgozik itt), alapértelmezett felelős és helyettes */
function typesIn(prof, aid) {
  const vs = cfg.variants[prof] || {};
  return Object.keys(vs).filter(t => vs[t].on && cfg.defaultArea[prof][t] === aid && (!T.isMeet(t) || cfg.series[t])).map(t => vlabel(prof, t))
    .concat(T.state().types.filter(t => t.profile === prof && t.area === aid).map(t => t.name));
}
function areasSection(prof) {
  const ids = cfg.areaOrder[prof], open = ui.panel && ui.panel.kind === 'area' ? ui.panel.id : null;
  const row = aid => {
    const a = cfg.areas[aid], key = 'area:' + aid, ty = typesIn(prof, aid);
    const act = ui.undo[key] ? undoHtml(key) : open === aid ? '' : `<button class="btn-sm" type="button" data-act="area-open" data-id="${aid}" data-k="mod:${aid}">Módosítás${sr(': ' + a.name)}</button>`;
    return `<li${open === aid ? ' class="is-open"' : ''}><div class="li-main"><h3 class="area-name" id="ar-${aid}" tabindex="-1" data-k="ar-${aid}">${esc(a.name)}</h3><span class="member-act">${act}</span></div>
      <p class="li-sub">${[a.owner ? 'Felelős: ' + esc(userName(a.owner)) : '<strong>Nincs felelős</strong>', a.deputy ? 'helyettes: ' + esc(userName(a.deputy)) : '', a.members.length ? 'tagok: ' + esc(a.members.map(userName).join(', ')) : 'nincs tagja'].filter(Boolean).join(' · ')}</p>
      <p class="li-sub">${ty.length ? 'Ügytípus: ' + esc(ty.join(', ')) : 'Még nem fut itt ügytípus.'}</p>${open === aid ? areaForm(prof, aid) : ''}</li>`;
  };
  return `<section class="section" aria-labelledby="h-areak"><div class="section-head"><h2 id="h-areak">Áreák <span class="count">${ids.length}</span></h2>${open === 'new' ? '' : `<button class="link-btn lg" type="button" data-act="area-open" data-id="new" data-k="area-new">${ico('plus')} Új área</button>`}</div>
    <p class="group-note">Az área a profilon belüli feladatcsomag, saját munkalistával. Az új ügy az área felelősét kapja; ha nincs felelős, a munkalistán a „Felelős nélkül” részben áll.</p>
    ${open === 'new' ? areaForm(prof, null) : ''}
    ${ids.length ? `<ul class="plain-list areas">${ids.map(row).join('')}</ul>` : open === 'new' ? '' : '<p class="grp-empty">A profilnak még nincs áreája. Vedd fel az elsőt; utána bekapcsolhatod az ügytípusokat.</p>'}</section>`;
}
function areaForm(prof, aid) {
  const f = ui.f, a = aid ? cfg.areas[aid] : null, mem = people(T.membersOf(prof)), ik = prof + ':' + (aid || 'new');
  if (f._ainit !== ik) { f._ainit = ik; f.aname = a ? a.name : ''; f.amem = a ? a.members.slice() : []; f.aowner = a ? a.owner || '' : ''; f.adeputy = a ? a.deputy || '' : ''; }
  const E = f._ae || {}, en = E.name && !((f.aname || '').trim() && !E.dup) ? E.name : '';
  return `<form class="set-form" data-form="area" data-id="${aid || ''}" data-prof="${prof}" novalidate aria-labelledby="af-h">
    <h3 class="form-h" id="af-h" tabindex="-1" data-k="af-h">${a ? esc(a.name) + ': módosítás' : 'Új área'}</h3>
    <div class="field"><label class="field-label" for="f-aname">Az área neve</label><input class="text-input" id="f-aname" data-f="aname" data-k="f-aname" maxlength="60" autocomplete="off"${en ? ' aria-invalid="true" aria-describedby="aname-err"' : ''}>${en ? `<p class="err" id="aname-err" role="alert">${ico('alert')}<span>${esc(en)}</span></p>` : ''}</div>
    ${mem.length ? peopleField('amem', 'Kik dolgoznak itt?', mem, 'Írd be a nevét', true, { hint: 'A nővér és az asszisztens a Teendőim alatt azoknak az áreáknak a munkalistáját is látja, ahol dolgozik.' }) : '<p class="hint">A profilnak még nincs tagja.</p>'}
    <div class="fields-2">${personField('aowner', 'Alapértelmezett felelős', mem, 'Írd be a nevét', null, true, { empty: 'nincs' })}${personField('adeputy', 'Helyettes', mem, 'Írd be a nevét', null, true, { empty: 'nincs' })}</div>
    <p class="field-hint" style="margin-top:.5rem">Az új ügy a felelőst kapja; aki létrehozza, másnak is adhatja. A helyettes a felelős távollétében viszi az área tételeit. Mindketten magától az área tagjai lesznek.</p>
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="af-save">${ico('check')}${a ? 'Mentés' : 'Létrehozom az áreát'}</button><button class="btn btn-quiet" type="button" data-act="area-close" data-id="${aid || 'new'}">Mégse</button></div></form>`;
}
/* Ügytípusok és lépések (státuszok) (K4.1, K4.2): a hat általános ügytípus a profilban, és a saját ügytípusok (K4.17) */
function stepTrack(prof, type) {
  const t = cfg.types[type], fake = { type, profileId: prof, data: {} };
  return `<ol class="track type-track" aria-label="${esc(vlabel(prof, type))}: lépések">${t.steps.concat(t.closeSteps || []).map(s => `<li><span class="dot" aria-hidden="true"></span>${esc(T.stepLabel(fake, s.id))}<span class="cat">${esc(T.catWord[s.cat])}${s.cat === 'V' && s.wait ? ': ' + esc(s.wait) : ''}</span></li>`).join('')}</ol>`;
}
function typesPage(prof, q) {
  const items = cfg.catalog.map(k => k.type === 'meeting' ? meetCatalogItem(prof, k, q) : variantItem(prof, k)).join('');
  return `<section class="section" aria-labelledby="h-altalanos"><div class="section-head"><h2 id="h-altalanos">A hat általános ügytípus</h2></div>
    <p class="group-note">${ico('lock')} Kötött: a lépések kategóriája, a közös adatok és a fő adatok, így a profilok összevethetők. A profil a nevet, az áreát, a lépések nevét, a plusz adatokat és a listaelemeket állítja; az emlékeztetők idejét az <a href="#/beallitasok/emlekeztetok${q}">Emlékeztetők</a> oldalon.</p>
    <ul class="plain-list vars">${items}</ul></section>${typesSection(prof)}`;
}
function meetCatalogItem(prof, k, q) {
  const ms = Object.keys(cfg.series).filter(s => cfg.series[s].profile === prof);
  return `<li class="var-item"><div class="li-main"><h3 class="type-name">${esc(k.name)}</h3><span class="member-act"><a class="btn-sm" href="#/beallitasok/megbeszelesek${q}">Megbeszélések</a></span></div>
    <p class="li-sub">${esc(k.about)}</p><p class="li-sub">${ms.length ? 'Változatai: ' + esc(ms.map(s => vlabel(prof, s) + ' (' + DAY_ON[cfg.series[s].dow] + ')').join(', ')) : 'Még nincs megbeszélés; újat a Megbeszélések oldalon veszel fel.'}</p></li>`;
}
function variantItem(prof, k) {
  const v = T.variant(prof, k.type); if (!v) return '';
  const key = 'var:' + k.type, open = ui.panel && ui.panel.kind === 'variant' && ui.panel.type === k.type, areas = cfg.areaOrder[prof];
  const h = act => `<div class="li-main"><h3 class="type-name" id="vt-${k.type}" tabindex="-1" data-k="vt-${k.type}">${esc(k.name)}</h3><span class="member-act">${act}</span></div>`;
  if (!v.on) {
    /* A gomb és a művelet ugyanabból a céláreából számol: a változat korábbi áreája, ennek híján a profil első áreája (a prototípus bírálata, 8.) */
    const to = T.variantOnArea(prof, k.type);
    const act = ui.undo[key] ? undoHtml(key) : to ? `<button class="btn-sm btn-fill" type="button" data-act="var-on" data-type="${k.type}" data-prof="${prof}" data-area="${to}" data-k="act:${key}">Bekapcsolom: ${esc(T.areaName(to))}${sr(', ' + k.name)}</button>` : '';
    return `<li class="var-item is-off">${h(act)}<p class="li-sub">${esc(k.about)}</p>
      <p class="li-sub"><strong>Nincs bekapcsolva.</strong> ${to ? 'Bekapcsolva az ügyei a(z) ' + esc(T.areaName(to)) + ' munkalistájára kerülnek; a változatban ez is módosítható.' : 'Előbb vegyél fel egy áreát a Beállítások főoldalán: az ügyek egy área munkalistáján állnak.'}</p></li>`;
  }
  const act = ui.undo[key] ? undoHtml(key) : open ? '' : `<button class="btn-sm" type="button" data-act="var-open" data-type="${k.type}" data-k="mod:${k.type}">Módosítás${sr(': ' + k.name)}</button>`;
  const meta = [v.name && v.name !== k.name ? 'A profilban: <strong>' + esc(v.name) + '</strong>' : 'Bekapcsolva', 'área: ' + esc(T.areaName(cfg.defaultArea[prof][k.type])),
    k.list ? 'vizsgálatok: ' + esc(cfg.profiles[prof].exams.join(', ')) : '', (v.extra || []).some(e => !e.archived) ? 'plusz adat: ' + esc(v.extra.filter(e => !e.archived).map(e => e.label).join(', ')) : ''].filter(Boolean).join(' · ');
  return `<li class="var-item${open ? ' is-open' : ''}">${h(act)}<p class="li-sub">${meta}</p>${stepTrack(prof, k.type)}${open ? variantEditor(prof, k, v) : ''}</li>`;
}
/* A lépések neve: átnevezhető, a kategória kötött (K4.2, K4.3; F1 1d) */
function stepNames(prof, type) {
  const t = cfg.types[type], all = t.steps.concat(t.closeSteps || []);
  return `<fieldset class="field"><legend>A lépések (státuszok) neve</legend>
    <p class="field-hint">A lépés (státusz) neve átnevezhető. A kategória kötött, ezért a nézetek, az emlékeztetők és a mutatók az átnevezéstől nem változnak.</p>
    <div class="step-head" aria-hidden="true"><span></span><span>A lépés neve</span><span>Kategória, kötött</span></div>
    <ol class="step-rows names">${all.map((s, i) => `<li><span class="step-n" aria-hidden="true">${i + 1}.</span><div class="field f-name"><label class="sr-only" for="rn-${type}-${s.id}">A lépés neve, ${i + 1}. lépés</label><input class="text-input" type="text" id="rn-${type}-${s.id}" data-f="sl:${s.id}" data-k="rn-${type}-${s.id}" maxlength="80" autocomplete="off"></div>
      <p class="f-cat cat-fixed">${ico('lock')}<span><span class="sr-only">Kategória: </span>${esc(T.catWord[s.cat])}${s.cat === 'V' && s.wait ? ': ' + esc(s.wait) : ''}<span class="sr-only"> (kötött)</span></span></p></li>`).join('')}</ol></fieldset>`;
}
function stepInit(prof, type) { const f = ui.f, t = cfg.types[type], fake = { type, profileId: prof, data: {} }; t.steps.concat(t.closeSteps || []).forEach(s => { f['sl:' + s.id] = T.stepLabel(fake, s.id); }); }
function stepLabels(type) { const f = ui.f, t = cfg.types[type], o = {}; t.steps.concat(t.closeSteps || []).forEach(s => { if (f['sl:' + s.id] !== undefined) o[s.id] = f['sl:' + s.id]; }); return o; }
/* Plusz adatok (K4.2): név és fajta; listánál az elemek */
const kindWord = x => x.kind === 'yn' ? 'igen vagy nem' : x.kind === 'list' ? 'lista: ' + (x.opts || []).join(', ') : 'rövid szöveg';
function plusEditor() {
  const f = ui.f, E = f._pe || '', live = f.xlist.map((x, i) => [x, i]).filter(p => !p[0].archived), gone = f.xlist.filter(x => x.archived);
  return `<fieldset class="field"><legend>Plusz adatok</legend><p class="field-hint">Saját adat az ügyön, a fő adatok mellett: az új ügynél és az ügy adatainál tölthető ki, és a keresés is megtalálja. A már kitöltött adat törléskor archiválódik: a régi ügyeken megmarad.</p>
    ${live.length ? `<ul class="plain-list plus-list">${live.map(p => `<li><div class="li-main"><span><strong>${esc(p[0].label)}</strong> <span class="muted">${esc(kindWord(p[0]))}</span></span><button class="btn-sm btn-icon" type="button" data-act="plus-del" data-i="${p[1]}" data-k="plus-del-${p[1]}">${ico('x')}${sr('Törlés: ' + p[0].label)}</button></div></li>`).join('')}</ul>` : '<p class="hint" style="margin-top:0">Most nincs plusz adat.</p>'}
    ${gone.length ? `<p class="hint plus-gone">Archiválva, mert régi ügyeken ki van töltve: ${esc(gone.map(x => x.label).join(', '))}. Új ügynél nem jelenik meg; a régi ügyeken a neve és az értéke megmarad. Ha ugyanígy újra felveszed, a régi értékek is visszakapcsolódnak.</p>` : ''}
    <div class="inline-add"><div class="field"><label class="field-label" for="f-xname">Új adat neve</label><input class="text-input" type="text" id="f-xname" data-f="xname" data-k="f-xname" maxlength="60" autocomplete="off" data-enter="plus-add"${E ? ' aria-invalid="true" aria-describedby="xname-err"' : ''}></div>
      <div class="field"><label class="field-label" for="f-xkind">Fajtája</label><select class="select" id="f-xkind" data-f="xkind" data-k="f-xkind" data-rerender="1">${cfg.plusKinds.map(o => `<option value="${o[0]}">${esc(o[1])}</option>`).join('')}</select></div>
      ${f.xkind === 'list' ? `<div class="field"><label class="field-label" for="f-xopts">A lista elemei, vesszővel</label><input class="text-input" type="text" id="f-xopts" data-f="xopts" data-k="f-xopts" maxlength="200" autocomplete="off" data-enter="plus-add"></div>` : ''}
      <button class="btn-sm" type="button" data-act="plus-add" data-k="plus-add">${ico('plus')}Hozzáadom</button></div>
    ${E ? `<p class="err" id="xname-err" role="alert">${ico('alert')}<span>${esc(E)}</span></p>` : ''}</fieldset>`;
}
function fixedBox(main) {
  return `<div class="fixed-box"><p class="fixed-h">${ico('lock')}Kötött</p><dl class="dl fixed-dl"><dt>Fő adatok</dt><dd>${esc(main)}</dd><dt>Közös adatok</dt><dd>${esc(cfg.commonData)}</dd><dt>Lépések</dt><dd>a sorrend és a kategória</dd></dl></div>`;
}
function variantEditor(prof, k, v) {
  const f = ui.f, areas = cfg.areaOrder[prof];
  if (f._vinit !== prof + ':' + k.type) { f._vinit = prof + ':' + k.type; f.vname = v.name || k.name; f.varea = cfg.defaultArea[prof][k.type] || ''; f.vexams = (v.exams || cfg.profiles[prof].exams).slice(); f.xlist = JSON.parse(JSON.stringify(v.extra || [])); f.xkind = 'yn'; stepInit(prof, k.type); }
  const nOpen = T.state().cases.filter(c => c.profileId === prof && c.type === k.type && T.isOpen(c)).length, E = f._ve || {};
  return `<form class="set-form var-editor" data-form="variant" data-prof="${prof}" data-type="${k.type}" novalidate aria-labelledby="ve-h">
    <h4 class="form-h" id="ve-h" tabindex="-1" data-k="ve-h">${esc(k.name)}: a profil változata</h4>
    <div class="fields-2"><div class="field"><label class="field-label" for="f-vname">Név a profilban</label><input class="text-input" type="text" id="f-vname" data-f="vname" data-k="f-vname" maxlength="60" autocomplete="off" aria-describedby="vname-h"><span class="field-hint" id="vname-h" style="margin-top:.375rem">Így látszik az „Új ügy” menüben és a listákon.</span></div>
      ${field('varea', 'Melyik área munkalistáján álljanak az ügyei?', inSelect('varea', areas.map(a => [a, cfg.areas[a].name])))}</div>
    ${stepNames(prof, k.type)}
    ${k.list ? `<fieldset class="field"><legend>Vizsgálatok a listán</legend><p class="field-hint">Az új vizsgálati ügynél ebből választanak, és a munkalisták is szerinte szűrnek.</p>
      <ul class="labels">${f.vexams.map((x, i) => `<li><span class="label">${esc(x)}${f.vexams.length > 1 ? `<button class="link-btn" type="button" data-act="exam-del" data-i="${i}" data-k="exam-del-${i}" style="margin-left:.375rem">${ico('x')}${sr('Törlés a listáról: ' + x)}</button>` : ''}</span></li>`).join('')}</ul>
      <div class="inline-add"><div class="field"><label class="field-label" for="f-vexam">Új vizsgálat</label><input class="text-input" type="text" id="f-vexam" data-f="vexam" data-k="f-vexam" maxlength="40" autocomplete="off" placeholder="például EEG" data-enter="exam-add"${E.exam ? ' aria-invalid="true" aria-describedby="vexam-err"' : ''}></div><button class="btn-sm" type="button" data-act="exam-add" data-k="exam-add">${ico('plus')}Hozzáadom a listához</button></div>
      ${E.exam ? `<p class="err" id="vexam-err" role="alert">${ico('alert')}<span>${esc(E.exam)}</span></p>` : ''}</fieldset>` : ''}
    ${plusEditor()}${fixedBox(k.main)}
    <p class="hint">A változás azonnal érvényes az „Új ügy” menüben és a listákon; a meglévő ügyek adatai nem változnak. 10 másodpercig visszavonható.</p>
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ve-save">${ico('check')}Mentés</button><button class="btn btn-quiet" type="button" data-act="var-close" data-type="${k.type}">Mégse</button></div>
    <div class="var-off"><p class="hint">Kikapcsolva új ügy nem indul ebben az ügytípusban${nOpen ? '; a meglévő ' + nOpen + ' nyitott ügy a helyén marad' : ''}.</p><button class="btn-sm" type="button" data-act="var-off" data-type="${k.type}" data-prof="${prof}" data-k="var-off">Kikapcsolom${sr(': ' + k.name)}</button></div></form>`;
}
/* Saját ügytípusok (K4.17): létrehozás az ügytípus-szerkesztővel; utólag a lépések neve változtatható */
function typesSection(prof) {
  const list = T.state().types.filter(t => t.profile === prof), open = !!(ui.panel && ui.panel.kind === 'type-new' && ui.panel.prof === prof), cOpen = ui.panel && ui.panel.kind === 'ctype' ? ui.panel.id : null;
  const item = t => `<li class="type-item"><div class="li-main"><h3 class="type-name" id="ty-${t.id}" tabindex="-1" data-k="ty-${t.id}">${esc(t.name)}</h3><span class="member-act">${ui.undo['ctype:' + t.id] ? undoHtml('ctype:' + t.id) : cOpen === t.id ? '' : `<button class="btn-sm" type="button" data-act="ctype-open" data-id="${t.id}" data-k="mod:${t.id}">A lépések neve${sr(': ' + t.name)}</button>`}</span></div>
    <p class="li-sub">${esc(T.areaName(t.area))} · ${t.steps.length} lépés</p>${stepTrack(prof, t.id)}<p class="li-sub type-meta">Létrehozta: ${esc(userName(t.created.by))}, ${esc(T.relAt(t.created.at))} · az „Új ügy” menüben választható</p>
    ${cOpen === t.id ? `<form class="set-form" data-form="ctype-names" data-prof="${prof}" data-type="${t.id}" novalidate aria-label="${esc(t.name)}: a lépések neve">${stepNames(prof, t.id)}<div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ct-save">${ico('check')}Mentés</button><button class="btn btn-quiet" type="button" data-act="ctype-close" data-id="${t.id}">Mégse</button></div></form>` : ''}</li>`;
  return `<section class="section" aria-labelledby="h-tipusok"><div class="section-head"><h2 id="h-tipusok">Saját ügytípusok <span class="count">${list.length}</span></h2>${open ? '' : `<button class="link-btn lg" type="button" data-act="ty-open" data-prof="${prof}" data-k="ty-open">${ico('plus')} Új ügytípus</button>`}</div>
    <p class="group-note">Ha egy folyamat egyik általános ügytípusra sem képezhető le, a profil saját ügytípust hozhat létre, saját lépésekkel. Minden lépés az öt kategória egyikébe tartozik: ebből tudják a listák, az emlékeztetők és a mutatók, mi a teendő vele.</p>
    ${open ? typeEditor(prof) : ''}
    ${list.length ? `<ul class="plain-list types">${list.map(item).join('')}</ul>` : open ? '' : '<p class="grp-empty">A profilnak még nincs saját ügytípusa.</p>'}</section>`;
}
function typeEditor(prof) {
  const f = ui.f; if (!Array.isArray(f.trows)) f.trows = [{ label: '', cat: '', wait: '' }];
  /* A hiba csak addig látszik, amíg a mező még hiányos; a javítás után a következő újrarajzoláskor eltűnik */
  const E0 = f._te || {}, E = {};
  if (E0.name && !(f.tname || '').trim()) E.name = E0.name;
  if (E0.area && !f.tarea) E.area = E0.area;
  f.trows.forEach((r, i) => { if (E0['n' + i] && !(r.label || '').trim()) E['n' + i] = E0['n' + i]; if (E0['c' + i] && !r.cat) E['c' + i] = E0['c' + i]; if (E0['w' + i] && r.cat === 'V' && !r.wait) E['w' + i] = E0['w' + i]; });
  if (E0.steps && !f.trows.some(r => (r.label || '').trim() && r.cat && r.cat !== 'L')) E.steps = E0.steps;
  const err = (k, id) => E[k] ? `<p class="err" id="${id}" role="alert">${ico('alert')}<span>${esc(E[k])}</span></p>` : '';
  const inv = (k, id) => E[k] ? ` aria-invalid="true" aria-describedby="${id}"` : '';
  const rows = f.trows.map((r, i) => {
    const n = i + 1, nth = sr(', ' + n + '. lépés');
    return `<li><span class="step-n" aria-hidden="true">${n}.</span>
      <div class="field f-name"><label class="field-label" for="ty-n-${i}">A lépés neve${nth}</label><input class="text-input" type="text" id="ty-n-${i}" data-trow="${i}" data-rf="label" data-k="ty-n-${i}" value="${esc(r.label)}" maxlength="80" autocomplete="off"${inv('n' + i, 'ty-ne-' + i)}>${err('n' + i, 'ty-ne-' + i)}</div>
      <div class="field f-cat"><label class="field-label" for="ty-c-${i}">Kategória${nth}</label><select class="select" id="ty-c-${i}" data-trow="${i}" data-rf="cat" data-k="ty-c-${i}"${inv('c' + i, 'ty-ce-' + i)}><option value="">Válaszd ki</option>${cfg.cats.map(c => `<option value="${c[0]}"${r.cat === c[0] ? ' selected' : ''}>${esc(c[1])}</option>`).join('')}</select>${err('c' + i, 'ty-ce-' + i)}</div>
      <div class="field f-wait">${r.cat === 'V' ? `<label class="field-label" for="ty-w-${i}">Kire várunk?${nth}</label><select class="select" id="ty-w-${i}" data-trow="${i}" data-rf="wait" data-k="ty-w-${i}"${inv('w' + i, 'ty-we-' + i)}><option value="">Válaszd ki</option>${cfg.waitFor.map(w => `<option value="${esc(w)}"${r.wait === w ? ' selected' : ''}>${esc(w)}</option>`).join('')}</select>${err('w' + i, 'ty-we-' + i)}` : ''}</div>
      <button class="btn-sm btn-icon" type="button" data-act="ty-row-del" data-i="${i}">${ico('x')}${sr('Törlés: ' + n + '. lépés')}</button></li>`;
  }).join('');
  return `<form class="panel type-editor" data-form="type-new" data-prof="${prof}" novalidate aria-labelledby="ty-title">
    <h3 id="ty-title">Új ügytípus</h3><p class="panel-note">${esc(T.profileName(prof))}: a profil saját ügytípusa. Mentés után azonnal választható az „Új ügy” menüben.</p>
    <div class="fields-2">
      <div class="field"><label class="field-label" for="f-tname">Az ügytípus neve</label><input class="text-input" type="text" id="f-tname" data-f="tname" data-k="f-tname" maxlength="80" autocomplete="off"${inv('name', 'tname-err')}>${err('name', 'tname-err')}</div>
      <div class="field"><label class="field-label" for="f-tarea">Melyik área munkalistáján álljanak az ügyei?</label><select class="select" id="f-tarea" data-f="tarea" data-k="f-tarea"${inv('area', 'tarea-err')}><option value="">Válaszd ki az áreát</option>${cfg.areaOrder[prof].map(a => `<option value="${a}">${esc(cfg.areas[a].name)}</option>`).join('')}</select>${err('area', 'tarea-err')}</div>
    </div>
    <p class="field-hint" style="margin-top:.5rem">Az összesítő is ennél az áreánál számolja az ügyeit. Új áreát a Beállítások főoldalán, az Áreák részben veszel fel.</p>
    <fieldset class="field steps-field"${E.steps ? ' aria-describedby="tsteps-err"' : ''}><legend>Lépések (státuszok)</legend>
      <p class="field-hint">Abban a sorrendben, ahogy az ügy halad; az új ügy az első lépésben indul. Lépést csak kategóriával lehet menteni.</p>
      ${f.trows.length ? `<ol class="step-rows">${rows}</ol>` : ''}${err('steps', 'tsteps-err')}
      <button class="btn-sm" type="button" data-act="ty-row-add" data-k="ty-row-add">${ico('plus')}Lépés hozzáadása</button></fieldset>
    <p class="cat-legend-h">Mit jelent a kategória?</p>
    <dl class="cat-legend">${cfg.cats.map(c => `<div><dt>${esc(c[1])}</dt><dd>${esc(c[2])}</dd></div>`).join('')}</dl>
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="ty-save">${ico('check')}Létrehozom az ügytípust</button><button class="btn btn-quiet" type="button" data-act="ty-close">Mégse</button></div></form>`;
}
/* Megbeszélések (K5.9): az esetmegbeszélés változatai a sorozatukkal; a működés (konzílium vagy D2T) a felvételkor dől el */
const everyWord = n => n === 2 ? 'kéthetente' : 'hetente';
function meetingsPage(prof) {
  const ms = Object.keys(cfg.series).filter(k => cfg.series[k].profile === prof), open = ui.panel && ui.panel.kind === 'meeting' ? ui.panel.id : null;
  return `<section class="section" aria-labelledby="h-megb"><div class="section-head"><h2 id="h-megb">Megbeszélések <span class="count">${ms.length}</span></h2>${open === 'new' || !cfg.areaOrder[prof].length ? '' : `<button class="link-btn lg" type="button" data-act="meet-open" data-id="new" data-k="meet-new">${ico('plus')} Új megbeszélés</button>`}</div>
    ${!cfg.areaOrder[prof].length ? '<p class="grp-empty">Előbb vegyél fel egy áreát a Beállítások főoldalán: a megbeszélés esetei egy área munkalistáján állnak.</p>' : ''}
    ${open === 'new' ? meetingForm(prof, null) : ''}
    ${ms.length ? `<ul class="plain-list vars">${ms.map(k => meetingItem(prof, k, open)).join('')}</ul>` : open === 'new' || !cfg.areaOrder[prof].length ? '' : '<p class="grp-empty">A profilnak még nincs megbeszélése.</p>'}</section>`;
}
function meetingItem(prof, k, open) {
  const S = cfg.series[k], v = cfg.variants[prof][k], key = 'meet:' + k, next = T.meetingsAhead(k, 3), dl = T.meetingDeadline(k, next[0]);
  const act = ui.undo[key] ? undoHtml(key) : open === k ? '' : `<button class="btn-sm" type="button" data-act="meet-open" data-id="${k}" data-k="mod:${k}">Módosítás${sr(': ' + v.name)}</button>`;
  return `<li class="var-item${open === k ? ' is-open' : ''}"><div class="li-main"><h3 class="type-name" id="mt-${k}" tabindex="-1" data-k="mt-${k}">${esc(v.name)}</h3><span class="member-act">${act}</span></div>
    <p class="li-sub"><strong>${esc(cap(everyWord(S.every)))}, ${esc(DAY_ON[S.dow])}</strong> · bejelentés az előző munkanap ${esc(S.deadline)}-ig · ${S.remind && v.flow === 'konz' ? 'emlékeztető a hiányos bejelentésről a határidő napján ' + esc(D.hm(D.at(today(), S.remind))) + '-kor' : 'a hiányos bejelentésről nincs külön emlékeztető'}</p>
    <p class="li-sub">Área: ${esc(T.areaName(S.area))} · ${esc(cfg.flows[v.flow].label)} · résztvevők: ${S.participants.length ? esc(S.participants.map(userName).join(', ')) : 'még nincs megadva'}</p>
    <p class="li-sub">Következő alkalmak: ${esc(next.map(d => fmtDate(d)).join(', '))} · a legközelebbi bejelentési határidő: ${esc(D.dayName(dl.slice(0, 10)) + ', ' + fmtDate(dl.slice(0, 10)) + ' ' + D.hm(dl))}</p>
    ${stepTrack(prof, k)}${open === k ? meetingForm(prof, k) : ''}</li>`;
}
/* Az új megbeszélés áreája: az első, ahol még nem fut ügytípus; ennek híján a profil első áreája */
function meetDefaultArea(prof) { const ids = cfg.areaOrder[prof]; return ids.find(a => !typesIn(prof, a).length) || ids.find(a => meetsIn(a).length) || ''; }
function meetingForm(prof, k) {
  const f = ui.f, S = k ? cfg.series[k] : null, v = k ? cfg.variants[prof][k] : null, docs = profPeople(prof, [], true), E = f._me || {};
  if (f._minit !== prof + ':' + (k || 'new')) {
    f._minit = prof + ':' + (k || 'new'); f.mname = v ? v.name : ''; f.mflow = v ? v.flow : 'konz'; f.marea = v ? cfg.defaultArea[prof][k] : meetDefaultArea(prof);
    f.mdow = S ? String(S.dow) : undefined; f.mevery = S ? String(S.every) : '1'; f.mpart = S ? S.participants.slice() : []; f.mdl = S ? S.deadline : '17:00';
    f.mrem = S ? (S.remind ? 'igen' : 'nem') : 'igen'; f.mremt = S && S.remind ? S.remind : '09:00';
    if (v) { f.xlist = JSON.parse(JSON.stringify(v.extra || [])); f.xkind = 'yn'; stepInit(prof, k); }
  }
  const err = (key, id) => E[key] ? `<p class="err" id="${id}" role="alert">${ico('alert')}<span>${esc(E[key])}</span></p>` : '';
  const dow = Number(f.mdow), every = Number(f.mevery) || 1;
  let preview = '';
  if (dow) { const first = D.nextDow(today(), dow, true), dl = D.at(D.prevWorkday(first), f.mdl || '17:00'); preview = `${k ? 'Az új rend szerint a' : 'Az'} első alkalom: <strong>${esc(D.dayName(first) + ', ' + fmtDate(first))}</strong>; a bejelentési határidő: ${esc(D.dayName(dl.slice(0, 10)) + ', ' + fmtDate(dl.slice(0, 10)) + ' ' + D.hm(dl))}.${k ? ' A már bejelentett esetek az alkalmukon maradnak.' : ''}`; }
  const btn = !k ? (dow ? 'Felveszem: ' + everyWord(every) + ' ' + DAY_ON[dow] : 'Felveszem a megbeszélést') : 'Mentés';
  return `<form class="set-form meet-form" data-form="meeting" data-id="${k || ''}" data-prof="${prof}" novalidate aria-labelledby="mf-h">
    <h3 class="form-h" id="mf-h" tabindex="-1" data-k="mf-h">${v ? esc(v.name) + ': módosítás' : 'Új megbeszélés'}</h3>
    <div class="fields-2"><div class="field"><label class="field-label" for="f-mname">A megbeszélés neve</label><input class="text-input" type="text" id="f-mname" data-f="mname" data-k="f-mname" maxlength="60" autocomplete="off" placeholder="például Radiológiai konzílium"${E.name ? ' aria-invalid="true" aria-describedby="mname-err"' : ''}>${err('name', 'mname-err')}</div>
      <div class="field"><label class="field-label" for="f-marea">Melyik área munkalistáján álljanak az esetei?</label>${inSelect('marea', cfg.areaOrder[prof].map(a => [a, cfg.areas[a].name]), k ? null : 'Válaszd ki az áreát').replace('<select ', E.area ? '<select aria-invalid="true" aria-describedby="marea-err" ' : '<select ')}${err('area', 'marea-err')}</div></div>
    ${k ? `<p class="hint">${ico('lock')} Működése: ${esc(cfg.flows[v.flow].label)} (${esc(cfg.flows[v.flow].about)}); a felvétel után kötött.</p>`
      : `<fieldset class="field"><legend>Hogyan működik?</legend><div class="chips">${Object.keys(cfg.flows).map(fl => `<label class="chip"><input type="radio" name="c-mflow" value="${fl}" data-f="mflow" data-rerender="1"><span>${esc(cfg.flows[fl].label)}</span></label>`).join('')}</div><p class="field-hint" style="margin-top:.5rem">${esc(cap(cfg.flows[f.mflow || 'konz'].about))}. A felvétel után kötött.</p></fieldset>`}
    <fieldset class="field"${E.dow ? ' aria-describedby="mdow-err"' : ''}><legend>Melyik napon?</legend><div class="chips">${cfg.weekdays.map((w, i) => `<label class="chip"><input type="radio" name="c-mdow" value="${w[0]}" data-f="mdow" data-rerender="1"${i === 0 ? ' data-k="mdow-first"' : ''}><span>${esc(w[1])}</span></label>`).join('')}</div>${err('dow', 'mdow-err')}</fieldset>
    <fieldset class="field"><legend>Milyen gyakran?</legend><div class="chips"><label class="chip"><input type="radio" name="c-mevery" value="1" data-f="mevery" data-rerender="1"><span>hetente</span></label><label class="chip"><input type="radio" name="c-mevery" value="2" data-f="mevery" data-rerender="1"><span>kéthetente</span></label></div></fieldset>
    ${docs.length ? peopleField('mpart', 'Résztvevők', docs, 'Írd be a nevét', true, { hint: 'Az alkalom napirendjén látszik, kik ülnek a megbeszélésen.' }) : '<fieldset class="field"><legend>Résztvevők <span class="opt">(nem kötelező)</span></legend><p class="hint">A profilnak még nincs orvos tagja.</p></fieldset>'}
    <div class="field"><label class="field-label" for="f-mdl">Bejelentési határidő: a megbeszélés előtti munkanap, eddig:</label><input class="text-input short" type="time" id="f-mdl" data-f="mdl" data-k="f-mdl" aria-describedby="mdl-h"${E.dl ? ' aria-invalid="true"' : ''}><span class="field-hint" id="mdl-h" style="margin-top:.375rem">Alapérték: a munkanap vége, 17:00. A hiányos bejelentés is a napirendre kerül, a hiány jelölésével.</span>${err('dl', 'mdl-err')}</div>
    ${(k ? v.flow : f.mflow) === 'konz' ? `<fieldset class="field"><legend>Emlékeztető a hiányos bejelentésről</legend><div class="chips"><label class="chip"><input type="radio" name="c-mrem" value="igen" data-f="mrem" data-rerender="1"><span>a határidő napján</span></label><label class="chip"><input type="radio" name="c-mrem" value="nem" data-f="mrem" data-rerender="1"><span>nincs</span></label></div>
      ${f.mrem === 'igen' ? `<div class="field"><label class="field-label" for="f-mremt">Hánykor?</label><input class="text-input short" type="time" id="f-mremt" data-f="mremt" data-k="f-mremt"></div>` : ''}<p class="field-hint" style="margin-top:.5rem">A bejelentőnek szól, ha a minimum adatokból hiányzik valami.</p></fieldset>`
      : '<p class="hint">A D2T működésű megbeszélésnél nincs külön emlékeztető, hiányos bejelentésre sem.</p>'}
    ${k ? stepNames(prof, k) + plusEditor() + fixedBox(cfg.meetMain[v.flow]) : ''}
    ${preview ? `<p class="preview" aria-live="polite">${preview}</p>` : ''}
    <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="mf-save">${ico('check')}${esc(btn)}</button><button class="btn btn-quiet" type="button" data-act="meet-close" data-id="${k || 'new'}">Mégse</button></div></form>`;
}
/* Emlékeztetők (K7.3): az időzítés változatonként; az alapszabály kötött (K2.6, K7.1) */
function remindersPage(prof, q) {
  const f = ui.f, vs = cfg.variants[prof], E = f._re2 || {}, key = 'rem:' + prof;
  const timed = cfg.catalog.filter(k => k.remind && vs[k.type] && vs[k.type].on);
  timed.forEach(k => { if (f['rm-' + k.type] === undefined) f['rm-' + k.type] = String(T.remindOf(prof, k.type)); });
  const meets = Object.keys(cfg.series).filter(s => cfg.series[s].profile === prof);
  const row = k => `<li><div class="rm-row"><span class="rm-name">${esc(vlabel(prof, k.type))}</span><span class="rm-when"><label class="sr-only" for="f-rm-${k.type}">${esc(vlabel(prof, k.type))}: hány ${esc(k.remind.text)}</label><input class="text-input num" type="number" min="1" max="${k.remind.max}" step="1" inputmode="numeric" id="f-rm-${k.type}" data-f="rm-${k.type}" data-k="f-rm-${k.type}"${E[k.type] ? ` aria-invalid="true" aria-describedby="rm-${k.type}-err"` : ''}> <span aria-hidden="true">${esc(k.remind.text)}</span></span></div>
    <p class="li-sub">${esc(cap(k.remind.to))} · alapérték: ${k.remind.def} ${esc(k.remind.unit)}</p>${E[k.type] ? `<p class="err" id="rm-${k.type}-err" role="alert">${ico('alert')}<span>${esc(E[k.type])}</span></p>` : ''}</li>`;
  const fixed = cfg.catalog.filter(k => k.fixedRemind && vs[k.type] && vs[k.type].on).map(k => `<li><div class="rm-row"><span class="rm-name">${esc(vlabel(prof, k.type))}</span><span class="rm-when muted">${esc(k.fixedRemind)}</span></div></li>`)
    .concat(meets.map(s => { const S = cfg.series[s], v = vs[s]; return `<li><div class="rm-row"><span class="rm-name">${esc(v.name)}</span><span class="rm-when muted">${S.remind && v.flow === 'konz' ? 'a bejelentési határidő napján ' + esc(D.hm(D.at(today(), S.remind))) + '-kor, ha a bejelentés hiányos' : 'nincs külön emlékeztető'} · <a href="#/beallitasok/megbeszelesek${q}">a Megbeszéléseknél állítható</a></span></div></li>`; })).join('');
  return `<section class="section" aria-labelledby="h-rm"><div class="section-head"><h2 id="h-rm">Mikor szóljon?</h2></div>
    ${timed.length ? `<form data-form="reminders" data-prof="${prof}" novalidate><ul class="plain-list remind-list">${timed.map(row).join('')}</ul>
      <p class="hint">Az új időzítés a még ki nem küldött emlékeztetőkre érvényes; egy eseményre továbbra is egy emlékeztető szól.</p>
      <div class="form-actions">${ui.undo[key] ? undoHtml(key) : `<button class="btn btn-primary" type="submit" data-k="act:${key}">${ico('check')}Mentés</button>`}</div></form>` : '<p class="grp-empty">Még nincs bekapcsolva olyan ügytípus, amelynek emlékeztetője állítható.</p>'}
    ${fixed ? `<h3 class="sub-head">Más ügytípusok és a megbeszélések</h3><ul class="plain-list remind-list">${fixed}</ul>` : ''}</section>
    <section class="section" aria-labelledby="h-rm-kot"><div class="section-head"><h2 id="h-rm-kot">${ico('lock')} Kötött: az emlékeztetők alapszabálya</h2></div>
    <p class="group-note">Emlékeztető csak dátumhoz kötve szól, klinikai értékhez soha. Egy eseményre egy emlékeztető; a lejárt tételről nincs ismétlés, a munkalistán elöl áll. Csak a rendszeren belül, e-mail és telefon nélkül (K7.1, K7.5).</p></section>`;
}
/* Közös nézetek (K6.6, K6.7): áreánként a kész nézetek; a pipa azonnal érvényes a profil minden tagjánál */
function viewsPage(prof) {
  const ids = cfg.areaOrder[prof];
  if (!ids.length) return '<p class="grp-empty">Előbb vegyél fel egy áreát a Beállítások főoldalán.</p>';
  return ids.map(aid => {
    const a = cfg.areas[aid], ready = readyViews(aid).filter(v => v[0] !== 'munkalista'), hide = a.hide || [];
    return `<section class="section view-set" aria-labelledby="vw-${aid}"><div class="section-head"><h2 id="vw-${aid}">${esc(a.name)}</h2><span class="sort">${esc(typesIn(prof, aid).join(', ') || 'még nem fut itt ügytípus')}</span></div>
      <p class="li-sub">Munkalista: mindig látszik.</p>
      ${ready.length ? `<fieldset class="field" style="margin-top:.75rem"><legend class="sr-only">${esc(a.name)}: kész nézetek</legend><div class="checks">${ready.map(v => `<label class="check"><input type="checkbox" data-view-toggle="1" data-area="${aid}" data-view="${v[0]}" data-label="${esc(v[1])}" data-k="vw-${aid}-${v[0]}"${hide.indexOf(v[0]) === -1 ? ' checked' : ''}><span>${esc(v[1])}</span></label>`).join('')}</div></fieldset>` : '<p class="hint">Ehhez az áreához most nincs kész nézet; a munkafolyamata adja őket.</p>'}</section>`;
  }).join('');
}
/* Kijelölt feladatkörök a profilban: betegrekordok összevonása (K3.6) és naplólekérdezés (K12.2) */
const DUTY = { merge: ['Betegrekordok összevonása', 'Ha ugyanaz a beteg két rekordon szerepel, csak a kijelölt munkatárs vonhatja össze, a két rekord összevetése után, megerősítéssel.'],
  audit: ['Naplólekérdezés („Ki nézte meg?”)', 'A szülő vagy a hatóság kérdésére ő kérdezheti le, ki és mikor nyitotta meg egy beteg adatait.'] };
function dutiesPage(prof) {
  const d = T.state().duties.find(x => x.id === prof) || { merge: [], audit: [] }, open = ui.panel && ui.panel.kind === 'duty' ? ui.panel.id : null, f = ui.f;
  const mem = people(T.membersOf(prof));
  return `<ul class="plain-list vars">${Object.keys(DUTY).map(kind => {
    const key = 'feladat:' + kind, cur = d[kind].filter(k => T.U(k).profile === prof);
    if (open === kind && f._dinit2 !== prof + ':' + kind) { f._dinit2 = prof + ':' + kind; f.dmem = cur.slice(); }
    const act = ui.undo[key] ? undoHtml(key) : open === kind ? '' : `<button class="btn-sm" type="button" data-act="feladat-open" data-id="${kind}" data-k="mod:${kind}">Módosítás${sr(': ' + DUTY[kind][0])}</button>`;
    const sel = (f.dmem || []).filter(k => mem.some(m => m.v === k));
    return `<li class="var-item"><div class="li-main"><h3 class="type-name" id="fk-${kind}" tabindex="-1" data-k="fk-${kind}">${esc(DUTY[kind][0])}</h3><span class="member-act">${act}</span></div>
      <p class="li-sub">${esc(DUTY[kind][1])}</p><p class="li-sub"><strong>Kijelölve:</strong> ${cur.length ? esc(cur.map(userName).join(', ')) : 'senki'}</p>
      ${open === kind ? `<form class="set-form" data-form="feladat" data-kind="${kind}" data-prof="${prof}" novalidate aria-label="${esc(DUTY[kind][0])}: kijelölés">${peopleField('dmem', 'Kik végezhetik?', mem, 'Írd be a nevét', false)}
        <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="fk-save">${ico('check')}${sel.length ? 'Kijelölöm: ' + esc(sel.map(userName).join(', ')) : 'Mentés: senki sincs kijelölve'}</button><button class="btn btn-quiet" type="button" data-act="feladat-close" data-id="${kind}">Mégse</button></div></form>` : ''}</li>`;
  }).join('')}</ul>`;
}

/* ---------------- Nézet: regisztráció (K9.13) – kijelentkezve, a belépőlapról ---------------- */
function vRegisztracio() {
  ui.title = 'Regisztráció'; const f = ui.f, E0 = f._re || {}, E = {};
  const leader = cfg.regLeaderRoles.indexOf(f.rrole) > -1;
  /* A hiba csak addig látszik, amíg a mező még hiányos; a cím hibája a mostani értékhez igazodik */
  if (E0.name && !(f.rname || '').trim()) E.name = E0.name;
  if (E0.mail) { const m = T.checkMail(f.remail); if (m) E.mail = m; }
  if (E0.role && !f.rrole) E.role = E0.role;
  if (E0.prof && f.rrole && !leader && !f.rprof) E.prof = E0.prof;
  const chipsR = (name, opts) => opts.map((o, i) => `<label class="chip"><input type="radio" name="c-${name}" value="${esc(o[0])}" data-f="${name}"${i === 0 ? ` data-k="${name}-first"` : ''}><span>${esc(o[1])}</span></label>`).join('');
  const err = (k, id) => E[k] ? `<p class="err" id="${id}" role="alert">${ico('alert')}<span>${esc(E[k])}</span></p>` : '';
  const toMain = f.rrole && T.toMainAdmin(f.rrole);
  const btn = !f.rrole ? 'Elküldöm a kérést' : toMain ? 'Elküldöm a kérést a fő adminnak' : 'Elküldöm a kérést a profil adminjának';
  const who = !f.rrole ? '' : toMain ? 'Osztályvezetői, főnővéri és vezetői kérést a fő admin hagy jóvá.' : 'A kérésedet a kért profil adminja hagyja jóvá, általában az osztályvezető.';
  const roleOpts = r => r.map(x => [x, x]);
  return `<nav class="crumbs" aria-label="Hol vagy"><a href="index.html">Belépés</a><span aria-hidden="true">/</span><span aria-current="page">Regisztráció</span></nav>
    <div class="reg"><h1 tabindex="-1" data-k="h1">Regisztráció</h1>
    <p class="lede">Új munkatársként itt kéred, hogy egy profilhoz rendeljenek. Amíg a kérésedet jóvá nem hagyják, beléphetsz, de betegadatot nem látsz.</p>
    <form data-form="reg" novalidate style="margin-top:2rem">
      <div class="field"><label class="field-label" for="f-rname">A neved</label><span class="field-hint" id="rname-h">Ahogy a listákon látszani fog; orvosként a „dr.” előtaggal.</span><input class="text-input" type="text" id="f-rname" data-f="rname" data-k="f-rname" autocomplete="name" maxlength="80" aria-describedby="rname-h${E.name ? ' rname-err' : ''}"${E.name ? ' aria-invalid="true"' : ''}>${err('name', 'rname-err')}</div>
      <div class="field"><label class="field-label" for="f-remail">Egyetemi e-mail-cím</label><span class="field-hint" id="remail-h">Csak @${esc(cfg.mailDomain)} végű cím; ezzel lépsz be.</span><input class="text-input" type="email" id="f-remail" data-f="remail" data-k="f-remail" autocomplete="email" inputmode="email" spellcheck="false" maxlength="120" placeholder="vezeteknev.keresztnev@${esc(cfg.mailDomain)}" aria-describedby="remail-h${E.mail ? ' remail-err' : ''}"${E.mail ? ' aria-invalid="true"' : ''}>${err('mail', 'remail-err')}</div>
      <fieldset class="field"${E.role ? ' aria-describedby="rrole-err"' : ''}><legend>Szerepkör</legend>
        <p class="chip-sub" id="rr-p">A profilban</p><div class="chips" role="group" aria-labelledby="rr-p">${chipsR('rrole', roleOpts(cfg.profileRoles))}</div>
        <p class="chip-sub" id="rr-v">A vezetőségben</p><div class="chips" role="group" aria-labelledby="rr-v">${roleOpts(cfg.regLeaderRoles).map(o => `<label class="chip"><input type="radio" name="c-rrole" value="${esc(o[0])}" data-f="rrole"><span>${esc(o[1])}</span></label>`).join('')}</div>
        ${err('role', 'rrole-err')}</fieldset>
      ${f.rrole && !leader ? `<fieldset class="field"${E.prof ? ' aria-describedby="rprof-err"' : ''}><legend>Melyik profilhoz kéred, hogy rendeljenek?</legend><div class="chips">${chipsR('rprof', Object.keys(cfg.profiles).map(p => [p, T.profileName(p) + ' · ' + cfg.departments[cfg.profiles[p].dept].name]))}</div>${err('prof', 'rprof-err')}</fieldset>` : ''}
      ${who ? `<p class="hint">${esc(who)}</p>` : ''}
      <div class="form-actions"><button class="btn btn-primary" type="submit" data-k="reg-save">${ico('send')}${esc(btn)}</button><a class="btn btn-quiet" href="index.html">Mégse</a></div>
    </form></div>`;
}
/* ---------------- Nézet: a regisztrált fiók állapota – jóváhagyásig betegadat nélkül (K9.13) ---------------- */
function vFiok() {
  const uid = T.me(), a = T.account(uid), u = T.U(uid); ui.title = 'A fiókod';
  /* A profilból eltávolított tag (K9.9): betegadatot nem lát; ugyanaz a tiltás, mint jóváhagyás előtt */
  if (u.removed) return `<div class="reg"><p class="kicker">A fiókod</p><h1 tabindex="-1" data-k="h1">A fiókod most nem tartozik profilhoz</h1>
    <p class="lede">${esc(userName(u.removed.by))} ${esc(T.relAt(u.removed.at))} kivett a(z) ${esc(T.profileName(u.removed.from))} profilból, ezért betegadatot nem látsz: listát, keresést és betegkártyát sem. Ha tévedésnek gondolod, keresd a profil adminját.</p></div>`;
  if (!a) return noAccess('Ehhez a fiókhoz nem tartozik regisztráció.');
  const rq = a.req;
  const dl = `<dl class="dl acc-dl"><dt>Név</dt><dd>${esc(a.name)}</dd>${a.email ? `<dt>E-mail-cím</dt><dd>${esc(a.email)} <span class="muted">(a belépési neved)</span></dd>` : ''}<dt>Kérted</dt><dd>${esc(whereOf(rq))}, ${esc(rq.role)}ként</dd><dt>Elküldve</dt><dd>${esc(T.relAt(a.at))}</dd><dt>Jóváhagyja</dt><dd>${T.toMainAdmin(rq.role) ? 'a fő admin' : 'a profil adminja'}</dd></dl>`;
  if (a.status === 'approved') return `<div class="reg"><p class="kicker">Regisztráció</p><h1 tabindex="-1" data-k="h1">A kérésedet jóváhagyták</h1>
    <p class="lede">Jóváhagyta: ${esc(userName(a.decided.by))}, ${esc(T.relAt(a.decided.at))}. Mostantól ${esc(a.decided.role)}ként dolgozol: ${esc(whereOf(rq))}.</p>
    <p class="note-line"><a href="${esc(T.startRoute(uid, T.mode()))}">Tovább a kezdőképernyőre</a></p></div>`;
  if (a.status === 'rejected') return `<div class="reg"><p class="kicker">Regisztráció</p><h1 tabindex="-1" data-k="h1">A kérésedet nem hagyták jóvá</h1>
    <p class="lede">Elutasította: ${esc(userName(a.decided.by))}, ${esc(T.relAt(a.decided.at))}. A profilhoz nem rendeltek hozzá, ezért betegadatot továbbra sem látsz. Ha tévedésnek gondolod, keresd a profil adminját.</p>${dl}</div>`;
  return `<div class="reg"><p class="kicker">Regisztráció</p><h1 tabindex="-1" data-k="h1">A kérésed jóváhagyásra vár</h1>
    <p class="lede">Amíg jóvá nem hagyják, betegadatot nem látsz: listát, keresést és betegkártyát sem. Ha jóváhagyták, a következő belépéskor a kezdőképernyőd nyílik.</p>${dl}</div>`;
}

/* ---------------- Megjelenítés ---------------- */
const ROUTES = { sajat: vSajat, ugyelet: vUgyelet, osszesito: vOsszesito, munkalistak: vMunkalistak, archivum: vArchivum, beteg: vBeteg, ugy: vUgy, 'uj-beteg': vUjBeteg, osszevonas: vOsszevonas, naplo: vNaplo, beallitasok: vBeallitasok, csatolmany: vCsatolmany, regisztracio: vRegisztracio, fiok: vFiok };
function routeAllowed(name) {
  const uid = T.me(), u = T.U(uid), md = T.mode();
  if (name === 'regisztracio') return false;
  /* Jóváhagyásig a regisztrált fiók csak a saját kérését látja: egyetlen betegadatos nézet sem nyílik meg, közvetlen címről sem (K9.13) */
  if (!T.isActive(uid)) return name === 'fiok' && !!(u.registered || u.removed);
  if (name === 'fiok') return false;
  if (u.mainAdmin) return name === 'beallitasok';
  if (md === 'leader') return name === 'osszesito' || name === 'beallitasok';
  if (name === 'ugyelet') return !!u.duty;
  if (name === 'osszesito') return !!T.leaderScope();
  return true;
}
function renderAll() {
  const r = parseHash(), anon = !T.me();
  if (anon && r.name !== 'regisztracio') { location.href = 'index.html'; return; }
  /* Ha a belépett fiók közben megszűnt (például egy másik fülben visszaállították a próbát), vissza a belépőlapra */
  if (!anon && !cfg.users[T.me()]) { T.logout(); location.href = 'index.html'; return; }
  if (!anon && (!ROUTES[r.name] || !routeAllowed(r.name))) { location.replace(T.startRoute(T.me(), T.mode())); return; }
  const changed = ui.entered !== location.hash;
  if (changed && ui.draftKey) flushDraft();
  ui.r = r;
  if (changed) {
    ui.panel = null; ui.f = {}; ui.prompt = null; ui.decide = r.q.dontes ? r.args[0] : null; ui.conflict = null; ui.edit = null; ui.hist = false; ui.undo = {}; ui.cb = null; ui.kids = {};
    ui.entered = location.hash; ui.dirtyNote = false; ui.draftKey = routeKey();
    loadUiDraft();
    if (r.name === 'csatolmany') { const c = T.Cs(r.args[0]), x = c && c.files[Number(r.args[1])]; if (x && ['write', 'read'].indexOf(T.caseAccess(c)) > -1 && T.mode() !== 'leader') T.ops.openFile(c.id, x.name); }
    if (r.name === 'beteg' && T.patientAccess(r.args[0]) !== 'none') T.ops.openCard(r.args[0]);
    if (r.name === 'ugy' && T.Cs(r.args[0]) && ['write', 'read'].indexOf(T.caseAccess(T.Cs(r.args[0]))) > -1) T.ops.openCase(r.args[0]);
    if (r.name === 'naplo' && T.canAudit()) T.ops.auditQuery(r.args[0]);
    if (['sajat', 'ugyelet', 'osszesito', 'munkalistak', 'archivum'].indexOf(r.name) > -1) { T.rememberView(location.hash); ui.lastMain = r.name; }
  }
  const nyit = changed && !anon && r.name === 'beallitasok' && r.q.nyit ? openFromLink(r) : null;
  document.getElementById('fejlec').innerHTML = anon ? anonHeader() : header();
  renderMain(changed);
  if (nyit) { const el = document.querySelector('#tartalom [data-k="' + CSS.escape(nyit) + '"]'); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); } }
  /* A kiinduló ügy lenyitott listájából a teendő az ügy teendői közé visz: oda kerül a fókusz */
  if (changed && !anon && r.name === 'ugy' && r.q.teendo) { const el = document.querySelector('#tartalom [data-k="tli:' + CSS.escape(r.q.teendo) + '"]'); if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); } }
}
/* A főoldal „Lépések és adatok” és „Új ügytípus” linkje a szerkesztőt nyitja meg: a változatét, a saját ügytípus lépéseiét, a megbeszélését, vagy az újat */
function openFromLink(r) {
  const k = r.q.nyit, prof = curProf(); if (!prof) return null;
  if (r.args[0] === 'ugytipusok') {
    if (k === 'uj') { ui.panel = { kind: 'type-new', prof }; ui.f = { trows: [{ label: '', cat: '', wait: '' }] }; return 'f-tname'; }
    if (cfg.types[k] && cfg.types[k].custom && cfg.types[k].profile === prof) { ui.panel = { kind: 'ctype', id: k }; ui.f = {}; stepInit(prof, k); return 'rn-' + k + '-s1'; }
    if (T.variant(prof, k) && T.variant(prof, k).on && !T.isMeet(k)) { ui.panel = { kind: 'variant', type: k }; ui.f = {}; return 'f-vname'; }
  }
  if (r.args[0] === 'megbeszelesek' && cfg.series[k] && cfg.series[k].profile === prof) { ui.panel = { kind: 'meeting', id: k }; ui.f = {}; return 'f-mname'; }
  return null;
}
/* Az űrlapállapot és a látható kiválasztás mindig egyezik: a lenyíló lista látható (alapértelmezett) eleme
   akkor is az állapotba kerül, ha a felhasználó nem nyúlt hozzá; a beküldés mindig azt menti, ami látszik */
function restoreForm(root) {
  root.querySelectorAll('[data-f]').forEach(el => {
    const name = el.getAttribute('data-f'), v = ui.f[name];
    if (el.type === 'radio') el.checked = v !== undefined && el.value === String(v);
    else if (el.type === 'checkbox') el.checked = el.getAttribute('data-multi') ? (Array.isArray(v) && v.indexOf(el.value) > -1) : !!v;
    else if (el.tagName === 'SELECT') {
      if (v !== undefined && v !== null) el.value = v;
      if (v === undefined || v === null || el.value !== String(v)) ui.f[name] = el.value;
    }
    else if (v !== undefined && v !== null) el.value = v;
  });
  root.querySelectorAll('select[data-row]').forEach(el => {
    const r = (ui.f.rows || [])[Number(el.getAttribute('data-row'))], k = el.getAttribute('data-rf');
    if (r && (r[k] === undefined || r[k] === null || String(r[k]) !== el.value)) r[k] = el.value;
  });
}
/* A fókusz megőrzése újrarajzoláskor: data-k, ennek híján id, rádiógombnál név és érték (bírálat 26.) */
function focusKey(a) {
  if (!a || !a.getAttribute) return null;
  if (a.getAttribute('data-k')) return { k: a.getAttribute('data-k') };
  if (a.id) return { id: a.id };
  if (a.name && a.type === 'radio') return { name: a.name, value: a.value };
  return null;
}
function findFocus(main, fk) {
  if (!fk) return null;
  if (fk.k) return main.querySelector('[data-k="' + CSS.escape(fk.k) + '"]') || (fk.k === 'h1' ? main.querySelector('h1') : null);
  if (fk.id) return document.getElementById(fk.id);
  if (fk.name) return main.querySelector('input[name="' + CSS.escape(fk.name) + '"][value="' + CSS.escape(fk.value) + '"]');
  return null;
}
function renderMain(entered) {
  if (T.me() && ui.hdrSig !== undefined && ui.hdrSig !== headerSig()) document.getElementById('fejlec').innerHTML = header();
  const main = document.getElementById('tartalom');
  const a = document.activeElement, inMain = a && main.contains(a);
  const fk = ui.focus ? { k: ui.focus } : (inMain ? focusKey(a) : null);
  const sel = inMain && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  const y = window.scrollY;
  const v = ROUTES[ui.r.name];
  ui.cbSpec = {}; ui.kidSeq = 0;
  main.innerHTML = v.apply(null, ui.r.args);
  if (ui.cb && !ui.cbSpec[ui.cb.key]) ui.cb = null;
  restoreForm(main);
  document.title = ui.title + ' – Fonal';
  if (entered) { window.scrollTo(0, 0); const h1 = main.querySelector('h1'); if (h1 && ui.entered && document.activeElement !== document.getElementById('kereso')) h1.focus({ preventScroll: true }); }
  else window.scrollTo(0, y);
  if (fk && !entered) {
    const el = findFocus(main, fk);
    if (el) { el.focus({ preventScroll: !ui.focus }); if (sel && el.setSelectionRange && !ui.focus) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* nem szöveg */ } } }
  }
  ui.focus = null;
  /* A kapcsolt ügy előnézete élő régió: az ügytípus választásakor a tartalma újra beíródik, hogy a képernyőolvasó felolvassa */
  if (ui.sayPrev) { ui.sayPrev = false; const pv = document.getElementById('lk-prev'); if (pv && pv.innerHTML) { const h = pv.innerHTML; pv.innerHTML = ''; setTimeout(() => { if (pv.isConnected) pv.innerHTML = h; }, 80); } }
  stickyStrip();
  saveUiDraft();
}
/* A félbehagyott munka teljes állapota felhasználónként, a rekordhoz (az oldalhoz) kötve (bírálat 6.; K11.6) */
/* A kulcsban a profil is (a prototípus bírálata, 2.): a vezető profilváltásakor az előző profil félbehagyott szerkesztője nem töltődik be a másikba */
function routeKey() { const prof = parseHash().q.profil; return (location.hash || '#/').split('?')[0] + (prof ? '?profil=' + prof : ''); }
function flushDraft() { clearTimeout(saveUiDraft.tm); saveUiDraft(); }
function saveUiDraft() {
  if (!T.me() || !ui.draftKey) return;
  const key = 'ui:' + ui.draftKey, open = ui.panel || ui.prompt || ui.decide || ui.edit || ui.dirtyNote || ui.f._saveView;
  T.ops.draft(key, open ? JSON.stringify({ panel: ui.panel, prompt: ui.prompt, decide: ui.decide, edit: ui.edit, dirtyNote: !!ui.dirtyNote, f: ui.f }) : '');
}
function loadUiDraft() {
  const raw = T.draftOf('ui:' + routeKey()); if (!raw) return;
  try { const o = JSON.parse(raw); ui.panel = o.panel || null; ui.prompt = o.prompt || null; ui.decide = o.decide || ui.decide; ui.edit = o.edit || null; ui.dirtyNote = !!o.dirtyNote; ui.f = o.f || {}; } catch (e) { /* régi formátum */ }
}
function stickyStrip() {
  const strip = document.getElementById('pstrip'), anchor = document.querySelector('.ident-id');
  if (stickyStrip.obs) { stickyStrip.obs.disconnect(); stickyStrip.obs = null; }
  if (!anchor || ui.r.name !== 'beteg') { strip.hidden = true; return; }
  const p = T.P(ui.r.args[0]); if (!p) return;
  strip.innerHTML = `<div class="pstrip-in"><span class="ps-name">${esc(p.name || T.patientId(p))}</span><span class="taj">${esc(T.patientId(p))}</span><span class="ps-meta">${stateLine(p)}</span></div>`;
  if ('IntersectionObserver' in window) { stickyStrip.obs = new IntersectionObserver(es => { strip.hidden = es[0].isIntersecting || es[0].boundingClientRect.top > 0; }); stickyStrip.obs.observe(anchor); }
}

/* ---------------- Műveletek a felületen ---------------- */
function rowGroup(key) { return 'working'; }
function doStep(id, to, key, extra) {
  const r = T.ops.step(id, to, extra);
  const c = T.Cs(id);
  withUndo(key, 'Lépés: ' + T.stepLabel(c) + '.', r, T.cat(c) === 'V' ? 'waiting' : 'working');
  ui.prompt = null; ui.f = {}; toast('Mentve.'); renderMain();
}
function doClose(id, reason, key, extra) {
  const r = T.ops.close(id, reason, extra);
  withUndo(key, 'Lezárva: ' + reason + '.', r);
  ui.prompt = null; ui.f = {}; toast('Lezárva; az archívumban megtalálod.'); renderMain();
}
const act = {};
act.skip = (el, e) => { e.preventDefault(); const h = document.querySelector('#tartalom h1'); if (h) h.focus(); };
act['switch-user'] = () => { flushDraft(); T.logout(); location.href = 'index.html'; };
window.addEventListener('pagehide', () => { if (T.me()) flushDraft(); });
act.mode = el => { const r = T.setMode(el.getAttribute('data-mode')); ui.entered = ''; location.hash = r; renderAll(); toast('Szerepváltás: ' + roleText(T.me(), T.mode()) + '.'); };
act.undo = el => {
  const key = el.getAttribute('data-key'), u = ui.undo[key]; if (!u) return;
  const res = T.undo(u.tx); delete ui.undo[key];
  if (res === 'conflict') toast('Közben más is módosította; a visszavonás nem lehetséges. Nézd meg az ügyet.');
  else if (res === 'used') toast('Közben már használatba vették (például ügy indult benne), ezért nem vonható vissza.');
  else toast('Visszavonva.');
  ui.focus = 'act:' + key; renderMain();
  /* A beállítások sorainál a visszavonás után a sor „Módosítás” gombja, ennek híján a címsor kapja a fókuszt */
  if (!document.activeElement || document.activeElement === document.body) {
    const id = key.slice(key.indexOf(':') + 1), el = document.querySelector('[data-k="mod:' + CSS.escape(id) + '"]') || document.querySelector('#tartalom h1');
    if (el) el.focus();
  }
};
act['task-done'] = el => { const key = el.getAttribute('data-key') || 'task:' + el.getAttribute('data-id'); const r = T.ops.closeTask(el.getAttribute('data-id')); withUndo(key, 'Lezárva.', r); toast('Kész.'); renderMain(); };
act['task-take'] = el => { T.ops.assignTask(el.getAttribute('data-id'), T.me()); toast('Elvállaltad.'); renderMain(); };
/* Kapcsolt ügyek: a lenyitó (a fókusz a gombon marad), a teendőből indítás űrlapja a sor alatt, és a meglévő ügy kapcsolása */
act.kids = el => { const key = el.getAttribute('data-key'), def = el.getAttribute('data-def') === '1', cur = ui.kids[key] === undefined ? def : ui.kids[key]; ui.kids[key] = !cur; ui.focus = 'kids:' + key; renderMain(); };
act['spawn-open'] = el => { const d = el.closest('details'); if (d) d.open = false; ui.panel = { kind: 'spawn', tid: el.getAttribute('data-id'), key: el.getAttribute('data-key') }; ui.f = {}; ui.cb = null; ui.prompt = null; ui.focus = 'lk-h'; renderMain(); };
act['spawn-cancel'] = el => { const key = el.getAttribute('data-key'); ui.panel = null; ui.f = {}; ui.focus = 'tmenu:' + key; renderMain(); };
act['relate-open'] = el => { ui.panel = { kind: 'relate', cid: el.getAttribute('data-id') }; ui.f = {}; ui.cb = null; ui.focus = 'f-relId'; renderMain(); if (!document.getElementById('f-relId')) { const b = document.querySelector('[data-k="rel-cancel"]'); if (b) b.focus(); } };
act['relate-cancel'] = () => { const cid = ui.panel && ui.panel.cid; ui.panel = null; ui.f = {}; ui.focus = 'act:rel:' + cid; renderMain(); };
act.next = el => {
  const id = el.getAttribute('data-id'), key = el.getAttribute('data-key'), c = T.Cs(id), n = nextOf(c);
  if (!n) return;
  if (n.to) {
    let to = n.to;
    doStep(id, to, key);
  } else if (n.close) doClose(id, n.close, key);
  else if (n.prompt) { ui.prompt = { key, kind: n.prompt, id, step: n.step || null }; ui.f = {}; ui.focus = 'pr-' + ({ sent: 'd1', sentNeak: 'd1', ogyei: 'd1', decision: 'd1', appt: 'd1', examDone: 'his', parent: 'cnote', afterContact: 'cnote', closeStep: 'reason-first' }[n.prompt] || 'save'); renderMain(); }
  else if (n.act === 'renew') { const r = T.ops.renew(id); withUndo(key, 'Hosszabbítás indult.', r); toast('Hosszabbítás indult: új engedélyügy, az előző adataival.'); renderMain(); }
  else if (n.act === 'decide') go('#/ugy/' + id + '?dontes=1');
  else if (n.act === 'open') go('#/ugy/' + id);
};
act.step = el => { const d = el.closest('details'); if (d) d.open = false; doStep(el.getAttribute('data-id'), el.getAttribute('data-to'), el.getAttribute('data-key')); };
act.close = el => { const d = el.closest('details'); if (d) d.open = false; doClose(el.getAttribute('data-id'), el.getAttribute('data-reason'), el.getAttribute('data-key')); };
act['prompt-cancel'] = () => { const k = ui.prompt && ui.prompt.key; ui.prompt = null; ui.f = {}; ui.focus = k ? 'act:' + k : null; renderMain(); };
act.contact = el => { const id = el.getAttribute('data-id'); ui.prompt = { key: 'contact:' + id, kind: 'contact', id }; ui.f = {}; ui.focus = 'pr-cnote'; renderMain(); };
act.reopen = el => { const id = el.getAttribute('data-id'); const r = T.ops.reopen(id); withUndo('case:' + id, 'Újranyitva.', r); toast('Újranyitva.'); renderMain(); };
act['new-from'] = el => { const r = T.ops.newRequestFrom(el.getAttribute('data-id')); toast('Új kérelem indult, az előzőre hivatkozva.'); go('#/ugy/' + r.res); };
act['doc-ready'] = el => { T.ops.update(el.getAttribute('data-id'), { data: { docReady: true }, text: 'Az átadó dokumentum elkészült' }); toast('Mentve: az átadó dokumentum elkészült.'); renderMain(); };
act['duty-accept'] = el => { const id = el.getAttribute('data-id'); const r = T.ops.acceptDuty(id); withUndo('duty:' + id, 'Átvetted.', r); toast('Átvetted.'); renderMain(); };
act['duty-close'] = el => { const id = el.getAttribute('data-id'), note = (ui.f['dn-' + id] || '').trim(); const r = T.ops.closeDuty(id, note); withUndo('duty:' + id, 'Lezárva.', r); toast('Lezárva.'); renderMain(); };
act.dismiss = el => { T.ops.dismiss(el.getAttribute('data-id')); toast('Rendben; ez az emlékeztető nem jön újra.'); ui.focus = 'h1'; renderMain(); };
act.discharge = el => { const pid = el.getAttribute('data-pid'); const r = T.ops.discharge(pid); withUndo('adm:' + pid, 'Hazabocsátva.', r); toast('Hazabocsátás rögzítve: a beteg újra járó. Az ügyei a helyükön maradnak.'); renderMain(); };
act.hist = () => { ui.hist = !ui.hist; ui.focus = 'hist'; renderMain(); };
act.panel = el => {
  const kind = el.getAttribute('data-panel');
  if (ui.panel && ui.panel.kind === kind && kind !== 'task') { ui.panel = null; renderMain(); return; }
  ui.panel = { kind, pid: el.getAttribute('data-pid') || null, cid: el.getAttribute('data-cid') || null }; ui.f = {};
  ui.focus = kind === 'kiutal' ? 'f-mit' : kind === 'ward' ? (ui.panel.pid ? 'f-wmit' : 'f-wpid') : kind === 'taj' ? 'f-taj' : kind === 'name' ? 'f-pname' : kind === 'task' ? 'f-ttext' : 'panel-h';
  renderMain();
};
act['panel-close'] = () => { const ag = ui.panel && ui.panel.from === 'agenda'; ui.panel = null; ui.f = {}; ui.focus = ag ? 'agenda-new' : 'h1'; renderMain(); };
/* Új eset a napirendről: az alkalom előre kitöltve, a beteget a kereső mezőben választod */
act['agenda-new'] = el => { ui.panel = { kind: 'new-case', type: el.getAttribute('data-type'), pid: null, fixed: false, meeting: el.getAttribute('data-meeting'), from: 'agenda' }; ui.f = {}; ui.cb = null; ui.focus = 'f-pq'; renderMain(); };
act['new-case'] = el => {
  const d = el.closest('details'); if (d) d.open = false;
  ui.panel = { kind: 'new-case', type: el.getAttribute('data-type'), pid: el.getAttribute('data-pid') || null, fixed: !!el.getAttribute('data-pid') }; ui.f = {};
  ui.focus = ui.panel.pid ? 'panel-h' : 'f-pq'; renderMain();
};
act.pick = el => { ui.panel.pid = el.getAttribute('data-pid'); ui.focus = 'panel-h'; renderMain(); };
act['pick-clear'] = () => { ui.panel.pid = null; ui.f.pq = ''; ui.focus = 'f-pq'; renderMain(); };
act['absence-clear'] = () => { T.ops.clearAbsence(); toast('A távollétet töröltük.'); renderMain(); };
act.edit = el => { ui.edit = el.getAttribute('data-id'); ui.f = {}; ui.focus = 'ed-save'; renderMain(); const first = document.querySelector('form[data-form="edit"] input, form[data-form="edit"] select'); if (first) first.focus(); };
act['edit-cancel'] = () => { ui.edit = null; ui.f = {}; ui.conflict = null; ui.focus = 'edit'; renderMain(); };
act.decide = el => { ui.decide = el.getAttribute('data-id'); ui.f = {}; ui.focus = 'f-dec'; renderMain(); };
act['decide-cancel'] = () => { ui.decide = null; ui.f = {}; ui.conflict = null; ui.focus = 'decide'; renderMain(); };
act['row-add'] = () => { ui.f.rows = (ui.f.rows || []).concat([{ text: '', owner: '', due: '', spawn: '' }]); ui.focus = 'r-t-' + (ui.f.rows.length - 1); renderMain(); };
act['row-del'] = el => { ui.f.rows.splice(Number(el.getAttribute('data-i')), 1); Object.keys(ui.f).filter(k => /^_(q|cbE):rows\./.test(k)).forEach(k => { delete ui.f[k]; }); ui.focus = 'row-add'; renderMain(); };
act.triage = el => { T.ops.triage(el.getAttribute('data-id'), el.getAttribute('data-val')); toast(el.getAttribute('data-val') === 'tudomásul' ? 'Áttéve: csak tudomásul vesszük.' : 'Áttéve: megbeszéljük.'); renderMain(); };
act.ack = el => { const id = el.getAttribute('data-id'); const r = T.ops.acknowledge(id); withUndo('case:' + id, 'Tudomásul vették; elintézve.', r); toast('Elintézve.'); renderMain(); };
act.attach = el => { const d = el.closest('details'); if (d) d.open = false; T.ops.attach(el.getAttribute('data-id'), el.getAttribute('data-name')); toast('Csatolva: ' + el.getAttribute('data-name')); ui.focus = 'attach'; renderMain(); };
act['open-file'] = el => { T.ops.openFile(el.getAttribute('data-id'), el.getAttribute('data-name')); toast('A próbában a fájl nem nyílik meg; a megnyitás a naplóba került.'); };
act['label-add'] = el => { T.ops.addLabel(el.getAttribute('data-id'), el.getAttribute('data-label')); toast('Címke hozzáadva.'); ui.focus = 'f-label'; renderMain(); };
act['label-del'] = el => { T.ops.removeLabel(el.getAttribute('data-id'), el.getAttribute('data-label')); toast('A címkét töröltük.'); ui.focus = 'f-label'; renderMain(); };
act['arch-reason'] = el => { ui.arch.reason = el.getAttribute('data-reason'); ui.archLimit = 60; ui.focus = 'ar-text'; renderMain(); };
act['arch-more'] = () => { const before = ui.archLimit || 60; ui.archLimit = before + 60; renderMain(); const rows = document.querySelectorAll('#tartalom ul.rows > li'); const first = rows[before]; if (first) { const l = first.querySelector('a, button'); if (l) l.focus(); } };
act['save-view-open'] = () => { ui.f._saveView = true; ui.focus = 'f-vname'; renderMain(); };
act['view-delete'] = el => { T.ops.deleteView(el.getAttribute('data-id')); toast('A nézetet töröltük.'); go('#/munkalistak'); };
act['add-care'] = el => { const pid = el.getAttribute('data-pid'); T.ops.addCare(pid); toast('A beteg a gondozásodba került.'); go('#/beteg/' + pid); };
act['merge-ask'] = () => {
  const r = parseHash(), A = r.args[0], B = r.args[1], keepId = T.P(A).taj ? A : T.P(B).taj ? B : A, goneId = keepId === A ? B : A;
  const miss = T.mergeConflicts(keepId, goneId).filter(x => !ui.f['mc:' + x.k]);
  if (miss.length) { ui.f._mErr = true; ui.focus = null; renderMain(); const first = document.querySelector('input[data-f="mc:' + miss[0].k + '"]'); if (first) first.focus(); return; }
  ui.f._mErr = false; const d = document.getElementById('merge-dlg'); if (d && d.showModal) d.showModal();
};
act['merge-cancel'] = () => { const d = document.getElementById('merge-dlg'); if (d) d.close(); };
act['merge-do'] = el => {
  const k = el.getAttribute('data-keep'), g = el.getAttribute('data-gone'), choice = {};
  Object.keys(ui.f).filter(x => x.indexOf('mc:') === 0).forEach(x => { choice[x.slice(3)] = ui.f[x]; });
  const r = T.ops.merge(k, g, choice);
  if (r && r.blocked) { const d = document.getElementById('merge-dlg'); if (d) d.close(); toast(r.blocked); return; }
  ui.f = {}; toast('Összevonva: egy rekord maradt.'); go('#/beteg/' + k);
};
/* A saját ügytípus „lezárt” kategóriájú lépése: a lezárás okát kéri (K4.6) */
act['close-step'] = el => { const d = el.closest('details'); if (d) d.open = false; ui.prompt = { key: el.getAttribute('data-key'), kind: 'closeStep', id: el.getAttribute('data-id'), step: el.getAttribute('data-step') }; ui.f = {}; ui.focus = 'pr-reason-first'; renderMain(); };
/* Beállítások: ügytípus-szerkesztő (K4.17) */
act['ty-open'] = el => { ui.panel = { kind: 'type-new', prof: el.getAttribute('data-prof') }; ui.f = { trows: [{ label: '', cat: '', wait: '' }] }; ui.focus = 'f-tname'; renderMain(); };
act['ty-close'] = () => { ui.panel = null; ui.f = {}; ui.focus = 'ty-open'; renderMain(); };
act['ty-row-add'] = () => { ui.f.trows = (ui.f.trows || []).concat([{ label: '', cat: '', wait: '' }]); ui.focus = 'ty-n-' + (ui.f.trows.length - 1); renderMain(); };
act['ty-row-del'] = el => { ui.f.trows.splice(Number(el.getAttribute('data-i')), 1); ui.f._te = {}; ui.focus = 'ty-row-add'; renderMain(); };
/* Beállítások: a regisztrációk elbírálása (K9.13) és az adminjog (K9.12), 10 másodperces visszavonással */
act['req-approve'] = el => {
  const id = el.getAttribute('data-id'), a = T.account(id), role = ui.f['rq-' + id] || a.req.role;
  const r = T.ops.decideRequest(id, true, role); if (!r || r.denied) { toast('Ezt a kérést nem te bírálod el.'); return; }
  withUndo('req:' + id, 'Jóváhagyva: ' + role + '.', r); toast('Jóváhagyva: ' + a.name + ', ' + role + '. A következő belépéskor a kezdőképernyője nyílik.'); renderMain();
};
act['req-reject'] = el => {
  const id = el.getAttribute('data-id'), a = T.account(id);
  const r = T.ops.decideRequest(id, false); if (!r || r.denied) { toast('Ezt a kérést nem te bírálod el.'); return; }
  withUndo('req:' + id, 'Elutasítva.', r); toast('Elutasítva: ' + a.name + '. Nem került a profilba, betegadatot nem lát.'); renderMain();
};
act['admin-grant'] = el => {
  const uid = el.getAttribute('data-id'), prof = el.getAttribute('data-prof');
  const r = T.ops.grantAdmin(uid, prof); if (!r || r.denied) { toast('Adminjogot a profil osztályvezetője ad.'); return; }
  ui.panel = null; ui.f = {}; withUndo('admin:' + uid, 'Adminjog kiadva.', r); toast(userName(uid) + ' admin lett a(z) ' + T.profileName(prof) + ' profilban.'); renderMain();
};
/* Beállítások: tagok, áreák, változatok, megbeszélések, kijelölések; egyszerre egy szerkesztő nyitott, a mentés 10 másodpercig visszavonható */
const setPanel = (kind, id, extra, focus) => { ui.panel = Object.assign({ kind, id }, extra || {}); ui.f = {}; ui.focus = focus; renderMain(); };
const setClose = focus => { ui.panel = null; ui.f = {}; ui.focus = focus; renderMain(); };
const curProf = () => { const profs = T.adminProfiles(T.me()), q = parseHash().q.profil, own = T.U(T.me()).profile; return profs.indexOf(q) > -1 ? q : profs.indexOf(own) > -1 ? own : profs[0]; };
act['member-open'] = el => { const k = el.getAttribute('data-id'); setPanel('member', k, null, T.toMainAdmin(T.U(k).role) ? 'act:admin:' + k : 'f-mrole'); };
act['member-close'] = el => setClose('mod:' + el.getAttribute('data-id'));
act['member-remove'] = el => {
  const uid = el.getAttribute('data-id'), prof = el.getAttribute('data-prof'), name = userName(uid), L = T.memberLoad(uid, prof);
  const r = T.ops.removeMember(uid, prof); if (!r || r.denied) { toast('Ezt a tagot nem te veheted ki a profilból.'); return; }
  ui.panel = null; ui.f = {}; withUndo('member:' + uid, 'Eltávolítva.', r);
  toast(name + ' kikerült a profilból' + (L.cases.length + L.tasks.length ? '; ' + (L.cases.length + L.tasks.length) + ' nyitott tétele felelős nélkül maradt.' : '.')); renderMain();
};
act['area-open'] = el => { const id = el.getAttribute('data-id'); setPanel('area', id, null, 'f-aname'); };
act['area-close'] = el => { const id = el.getAttribute('data-id'); setClose(id === 'new' ? 'area-new' : 'mod:' + id); };
act['var-on'] = el => {
  const type = el.getAttribute('data-type'), prof = el.getAttribute('data-prof'), r = T.ops.setVariantOn(prof, type, true, el.getAttribute('data-area'));
  if (!r || r.denied) { toast('Ügytípust a profil adminja kapcsol be.'); return; }
  withUndo('var:' + type, 'Bekapcsolva.', r); toast('Bekapcsolva: ' + vlabel(prof, type) + '. Az „Új ügy” menüben már választható; az ügyei a(z) ' + T.areaName(cfg.defaultArea[prof][type]) + ' munkalistáján állnak.'); renderMain();
};
act['var-off'] = el => {
  const type = el.getAttribute('data-type'), prof = el.getAttribute('data-prof'), r = T.ops.setVariantOn(prof, type, false);
  if (!r || r.denied) { toast('Ügytípust a profil adminja kapcsol ki.'); return; }
  ui.panel = null; ui.f = {}; withUndo('var:' + type, 'Kikapcsolva.', r); toast('Kikapcsolva: ' + vlabel(prof, type) + '. Új ügy nem indul benne; a meglévők a helyükön maradnak.'); renderMain();
};
act['var-open'] = el => setPanel('variant', null, { type: el.getAttribute('data-type') }, 'f-vname');
act['var-close'] = el => setClose('mod:' + el.getAttribute('data-type'));
act['exam-add'] = () => {
  const f = ui.f, x = (f.vexam || '').trim(); f._ve = {};
  if (!x) { f._ve = { exam: 'Írd be a vizsgálat nevét.' }; ui.focus = 'f-vexam'; renderMain(); return; }
  if (f.vexams.some(y => T.norm(y) === T.norm(x))) { f._ve = { exam: 'Ez a vizsgálat már a listán van.' }; ui.focus = 'f-vexam'; renderMain(); return; }
  f.vexams = f.vexams.concat([x]); f.vexam = ''; ui.focus = 'f-vexam'; renderMain(); toast('A listára került: ' + x + '. A mentéssel lesz érvényes.');
};
act['exam-del'] = el => { ui.f.vexams.splice(Number(el.getAttribute('data-i')), 1); ui.focus = 'f-vexam'; renderMain(); };
act['plus-add'] = () => {
  const f = ui.f, name = (f.xname || '').trim(), kind = f.xkind || 'yn', opts = (f.xopts || '').split(',').map(x => x.trim()).filter(Boolean); f._pe = '';
  const old = f.xlist.find(x => x.archived && T.norm(x.label) === T.norm(name));
  if (!name) f._pe = 'Írd be az adat nevét.';
  else if (f.xlist.some(x => !x.archived && T.norm(x.label) === T.norm(name))) f._pe = 'Ilyen nevű plusz adat már van.';
  /* Az archivált, azonos nevű mező a régi azonosítójával tér vissza, így a régi ügyek értékei is visszakapcsolódnak (a prototípus bírálata, 6.) */
  else if (old && old.kind !== kind) f._pe = 'Ilyen nevű plusz adat korábban már volt, más fajtával (' + kindWord(old) + '), és régi ügyeken ki van töltve. Válaszd ugyanezt a fajtát, vagy adj más nevet.';
  else if (!old && kind === 'list' && opts.length < 2) f._pe = 'A listához adj meg legalább két elemet, vesszővel elválasztva.';
  if (f._pe) { ui.focus = !name || old || kind !== 'list' || opts.length >= 2 ? 'f-xname' : 'f-xopts'; renderMain(); return; }
  if (old) { delete old.archived; if (kind === 'list' && opts.length) old.opts = Array.from(new Set((old.opts || []).concat(opts))); f.xname = ''; f.xopts = ''; ui.focus = 'f-xname'; renderMain(); toast('Visszakerült: ' + old.label + '; a régi ügyeken kitöltött értékei is. A mentéssel lesz érvényes.'); return; }
  f.xlist = f.xlist.concat([Object.assign({ id: 'x' + Date.now().toString(36), label: name, kind }, kind === 'list' ? { opts } : {})]); f.xname = ''; f.xopts = ''; ui.focus = 'f-xname'; renderMain();
};
/* A már kitöltött plusz adat törléskor archiválódik; a kitöltetlen törlődik */
act['plus-del'] = el => {
  const form = el.closest('form'), prof = form.getAttribute('data-prof'), type = form.getAttribute('data-type') || form.getAttribute('data-id'), i = Number(el.getAttribute('data-i')), x = ui.f.xlist[i];
  if (x && T.plusUsed(prof, type, x.id)) { x.archived = true; toast('Archiválva: ' + x.label + '. Új ügynél nem jelenik meg; a régi ügyeken megmarad. A mentéssel lesz érvényes.'); }
  else ui.f.xlist.splice(i, 1);
  ui.focus = 'f-xname'; renderMain();
};
act['ctype-open'] = el => { const id = el.getAttribute('data-id'); ui.panel = { kind: 'ctype', id }; ui.f = {}; stepInit(curProf(), id); ui.focus = 'rn-' + id + '-s1'; renderMain(); };
act['ctype-close'] = el => setClose('mod:' + el.getAttribute('data-id'));
act['meet-open'] = el => { const id = el.getAttribute('data-id'); setPanel('meeting', id, null, 'f-mname'); };
act['meet-close'] = el => { const id = el.getAttribute('data-id'); setClose(id === 'new' ? 'meet-new' : 'mod:' + id); };
act['feladat-open'] = el => setPanel('duty', el.getAttribute('data-id'), null, 'fk-' + el.getAttribute('data-id'));
act['feladat-close'] = el => setClose('mod:' + el.getAttribute('data-id'));
act['cf-mine'] = el => saveConflict(el.getAttribute('data-id'), 'mine');
act['cf-theirs'] = el => saveConflict(el.getAttribute('data-id'), 'theirs');
act['cf-merge'] = el => saveConflict(el.getAttribute('data-id'), 'merge');
function saveConflict(id, how) {
  const k = ui.conflict, c = T.Cs(id); if (!k) return;
  const f = ui.f;
  if (k.kind === 'decision') {
    if (how === 'theirs') { ui.conflict = null; f.dec = c.decision; f._dbase = c.ver; f._dtext = c.decision; T.ops.draft('dec:' + id, ''); toast('Az övé maradt; a saját változatodat elvetetted.'); renderMain(); return; }
    if (how === 'merge') { f.dec = c.decision + '\n\n' + k.mine; f._dbase = c.ver; f._dtext = c.decision; ui.conflict = null; ui.focus = 'f-dec'; toast('A két szöveget egymás alá tettük; javítsd, majd mentsd.'); renderMain(); return; }
    f._dbase = c.ver; f._dtext = c.decision; ui.conflict = null; submitDecision(id); return;
  }
  if (k.kind === 'note') {
    if (how === 'theirs') { ui.conflict = null; f.note = c.note; f._nbase = c.note; ui.dirtyNote = false; T.ops.draft('note:' + id, ''); toast('Az övé maradt; a saját változatodat elvetetted.'); renderMain(); return; }
    if (how === 'merge') { f.note = (c.note ? c.note + '\n' : '') + k.mine; f._nbase = c.note; ui.conflict = null; ui.focus = 'f-note'; toast('A két szöveget egymás alá tettük; javítsd, majd mentsd.'); renderMain(); return; }
    f._nbase = c.note; ui.conflict = null; forms.note(document.querySelector('form[data-form="note"]')); return;
  }
  if (k.kind === 'data') {
    const F = editFields(c);
    if (how === 'theirs') { ui.edit = null; ui.f = {}; ui.conflict = null; toast('Az övé maradt; a saját módosításaidat elvetetted.'); ui.focus = 'edit'; renderMain(); return; }
    if (how === 'merge') {
      F.forEach(x => {
        const base = f._snap[x.k], mine = mineVal(x, f), theirs = x.get(c);
        let v = mine !== base ? mine : theirs;
        if (mine !== base && theirs !== base && mine !== theirs) {
          if (x.type === 'multi') v = Array.from(new Set((mine ? mine.split(',') : []).concat(theirs ? theirs.split(',') : []))).sort().join(',');
          else if (x.type === 'text' || x.type === 'area') v = theirs + '; ' + mine;
        }
        f['e_' + x.k] = x.type === 'multi' ? (v ? v.split(',') : []) : v; f._snap[x.k] = theirs;
      });
      ui.conflict = null; ui.focus = 'ed-save'; toast('Összefésültük: nézd át, és mentsd.'); renderMain(); return;
    }
    /* Csak az általam módosított mezők mennek (az eredeti alaphoz mérve); a másik fél többi módosítása megmarad */
    ui.conflict = null; f._force = true; forms.edit(document.querySelector('form[data-form="edit"]')); return;
  }
}
/* ---------------- Űrlapok beküldése ---------------- */
const forms = {};
forms.prompt = form => {
  const id = form.getAttribute('data-id'), key = form.getAttribute('data-key'), c = T.Cs(id), k = ui.prompt.kind, f = ui.f;
  if (k === 'sent') return doStep(id, c.data.offLabel === false ? 'neak' : 'ogyei', key, { data: { sentOn: f.d1 }, text: 'beküldve: ' + fmtDate(f.d1) });
  if (k === 'sentNeak') return doStep(id, 'neak', key, { data: { neakSentOn: f.d1 }, text: 'beküldve: ' + fmtDate(f.d1) });
  if (k === 'ogyei') return doStep(id, 'neakk', key, { data: { ogyeiOn: f.d1 }, text: 'OGYÉI-engedély: ' + fmtDate(f.d1) });
  if (k === 'decision') {
    if (!f.d2) { ui.f._err = 1; toast('Add meg, meddig érvényes az engedély.'); ui.focus = 'pr-d2'; renderMain(); return; }
    const r = T.ops.step(id, 'erv', { data: { decidedOn: f.d1, expiresOn: f.d2 }, text: 'határozat: ' + fmtDate(f.d1) + ', érvényes: ' + fmtDate(f.d2) });
    if (f.attachDecision) T.ops.attach(id, 'kitalalt-hatarozat.pdf');
    withUndo(key, 'Érvényes.', r); ui.prompt = null; ui.f = {}; toast(c.prev ? 'Mentve: az új engedély érvényes; az előző „megújítva” okkal lezárult.' : 'Mentve: az engedély érvényes.'); renderMain(); return;
  }
  if (k === 'appt') { if (!f.d1) { toast('Add meg a vizsgálat napját.'); return; } return doStep(id, 'ert', key, { data: { appointment: f.d1 }, text: 'időpont: ' + fmtDate(f.d1) }); }
  if (k === 'examDone') return doClose(id, 'teljesült', key, f.his ? { his: { kind: 'lelet', ref: f.his.trim() } } : null);
  if (k === 'parent') return doStep(id, 'vizs', key, { contact: { whom: f.whom || 'szülő', how: f.how || 'telefon', note: f.cnote || '' }, text: 'a szülő értesítve' });
  if (k === 'afterContact') return doClose(id, 'teljesült', key, { contact: { whom: f.whom || 'fogadó csapat', how: f.how || 'levél', note: f.cnote || '', after: true } });
  if (k === 'contact') { T.ops.addContact(id, { whom: f.whom || 'szülő', how: f.how || 'telefon', note: f.cnote || '', after: !!f.after }); ui.prompt = null; ui.f = {}; toast('Kapcsolatfelvétel rögzítve.'); ui.focus = 'contact'; renderMain(); }
  if (k === 'closeStep') {
    if (!f.reason) { f._eReason = 'Válaszd ki, miért zárul le az ügy.'; ui.focus = 'pr-reason-first'; renderMain(); return; }
    return doClose(id, f.reason, key, { step: ui.prompt.step });
  }
};
/* Új ügytípus (K4.17): név, área, lépések; a lépés kategória nélkül nem menthető, a hiba a mezőnél */
forms['type-new'] = form => {
  const prof = form.getAttribute('data-prof'), f = ui.f, E = {}, name = (f.tname || '').trim(), steps = [];
  if (!name) E.name = 'Írd be az ügytípus nevét.';
  if (!f.tarea) E.area = 'Válaszd ki, melyik área munkalistáján álljanak az ügyei.';
  (f.trows || []).forEach((r, i) => {
    const label = (r.label || '').trim();
    if (!label && !r.cat) return;
    if (!label) E['n' + i] = 'Írd be a lépés nevét.';
    if (!r.cat) E['c' + i] = 'Válaszd ki a kategóriát: kategória nélkül a lépés nem menthető.';
    else if (r.cat === 'V' && !r.wait) E['w' + i] = 'Válaszd ki, kire várunk ebben a lépésben.';
    steps.push({ label, cat: r.cat, wait: r.cat === 'V' ? r.wait : '' });
  });
  if (!Object.keys(E).some(k => /^[ncw]\d/.test(k)) && !steps.some(s => s.cat !== 'L'))
    E.steps = steps.length ? 'Kell legalább egy lépés, amely nem lezárt: ebben indul az új ügy.' : 'Adj meg legalább egy lépést, a kategóriájával.';
  f._te = E;
  const keys = Object.keys(E);
  if (keys.length) {
    const rowKey = keys.filter(k => /^[ncw]\d/.test(k)).sort((a, b) => (Number(a.slice(1)) - Number(b.slice(1))) || ('ncw'.indexOf(a[0]) - 'ncw'.indexOf(b[0])))[0];
    ui.focus = E.name ? 'f-tname' : E.area ? 'f-tarea' : rowKey ? { n: 'ty-n-', c: 'ty-c-', w: 'ty-w-' }[rowKey[0]] + rowKey.slice(1) : 'ty-row-add';
    renderMain(); return;
  }
  const r = T.ops.createType({ profile: prof, name, area: f.tarea, steps });
  if (!r || r.denied) { toast((r && r.err) || 'Ügytípust a profil adminja hozhat létre.'); return; }
  ui.panel = null; ui.f = {}; toast('Létrehozva: ' + name + '. Az „Új ügy” menüben már választható.'); ui.focus = 'ty-' + r.res; renderMain();
};
/* Beállítások: szerepkör (K9.9) */
forms.member = form => {
  const uid = form.getAttribute('data-uid'), prof = form.getAttribute('data-prof'), role = ui.f.mrole, old = T.U(uid).role;
  if (!role || role === old) { setClose('mod:' + uid); toast('Nem változott semmi.'); return; }
  const r = T.ops.setRole(uid, prof, role); if (!r || r.denied) { toast('Ezt a szerepkört nem te módosíthatod.'); return; }
  ui.panel = null; ui.f = {}; withUndo('member:' + uid, 'Szerepkör: ' + role + '.', r); toast(userName(uid) + ' szerepköre: ' + role + '.'); renderMain();
};
/* Beállítások: área (K2.3); a név kötelező, és a profilban egyedi */
forms.area = form => {
  const id = form.getAttribute('data-id') || null, prof = form.getAttribute('data-prof'), f = ui.f, name = (f.aname || '').trim();
  const dup = cfg.areaOrder[prof].some(a => a !== id && T.norm(cfg.areas[a].name) === T.norm(name));
  f._ae = !name ? { name: 'Írd be az área nevét.' } : dup ? { name: 'Ilyen nevű área már van a profilban.', dup: true } : {};
  if (f._ae.name) { ui.focus = 'f-aname'; renderMain(); return; }
  const o = { profile: prof, name, members: (f.amem || []).slice(), owner: f.aowner || null, deputy: f.adeputy || null };
  const r = id ? T.ops.saveArea(id, o) : T.ops.createArea(o); if (!r || r.denied) { toast('Áreát a profil adminja állít be.'); return; }
  const aid = id || r.res; ui.panel = null; ui.f = {}; withUndo('area:' + aid, id ? 'Mentve.' : 'Létrehozva.', r);
  toast((id ? 'Mentve: ' : 'Létrehozva: ') + name + (o.owner ? '. Az új ügyei felelőse: ' + userName(o.owner) + '.' : '. Felelős nélkül: az új ügyei a „Felelős nélkül” részben állnak.')); renderMain();
};
/* Beállítások: a változat (K4.2): név, área, lépésnevek, vizsgálatlista, plusz adatok */
forms.variant = form => {
  const prof = form.getAttribute('data-prof'), type = form.getAttribute('data-type'), f = ui.f, k = cfg.catalog.find(x => x.type === type);
  if ((f.vexam || '').trim()) { act['exam-add'](); if ((ui.f._ve || {}).exam) return; }
  const name = (f.vname || '').trim() || k.name;
  const r = T.ops.saveVariant(prof, type, { name, area: f.varea, exams: k.list ? f.vexams : null, extra: f.xlist, labels: stepLabels(type) });
  if (!r || r.denied) { toast('A változatot a profil adminja állítja be.'); return; }
  ui.panel = null; ui.f = {}; if (r.res) withUndo('var:' + type, 'Mentve.', r); ui.focus = r.res ? ui.focus : 'mod:' + type; toast(r.res ? 'Mentve: ' + name + '. Az új ügyekre és a listákra azonnal érvényes.' : 'Nem változott semmi.'); renderMain();
};
forms['ctype-names'] = form => {
  const prof = form.getAttribute('data-prof'), type = form.getAttribute('data-type'), r = T.ops.renameTypeSteps(prof, type, stepLabels(type));
  if (!r || r.denied) { toast('A lépéseket a profil adminja nevezi át.'); return; }
  ui.panel = null; ui.f = {}; if (r.res) withUndo('ctype:' + type, 'Átnevezve.', r); else ui.focus = 'mod:' + type; toast(r.res ? 'Átnevezve. A kategória, az emlékeztetők és a mutatók nem változtak.' : 'Nem változott semmi.'); renderMain();
};
/* Beállítások: megbeszélés (K5.9): név, área, nap és gyakoriság kötelező; a bejelentési határidő alapértéke a megbeszélés előtti munkanap vége */
forms.meeting = form => {
  const key = form.getAttribute('data-id') || null, prof = form.getAttribute('data-prof'), f = ui.f, name = (f.mname || '').trim(), E = {};
  const taken = Object.keys(cfg.variants[prof]).some(t => t !== key && T.norm(vlabel(prof, t)) === T.norm(name)) || T.state().types.some(t => t.profile === prof && T.norm(t.name) === T.norm(name));
  if (!name) E.name = 'Írd be a megbeszélés nevét.'; else if (taken) E.name = 'Ilyen nevű ügytípus már van a profilban.';
  if (!f.marea || !cfg.areas[f.marea]) E.area = 'Válaszd ki, melyik área munkalistáján álljanak az esetei.';
  if (!f.mdow) E.dow = 'Válaszd ki, melyik napon tartjátok.';
  if (!/^\d{2}:\d{2}$/.test(f.mdl || '')) E.dl = 'Add meg a határidő idejét, például 17:00.';
  f._me = E;
  if (Object.keys(E).length) { ui.focus = E.name ? 'f-mname' : E.area ? 'f-marea' : E.dow ? 'mdow-first' : 'f-mdl'; renderMain(); return; }
  const o = { profile: prof, name, flow: f.mflow || 'konz', area: f.marea, dow: Number(f.mdow), every: Number(f.mevery) || 1, participants: (f.mpart || []).slice(), deadline: f.mdl, remind: f.mrem === 'igen' ? (f.mremt || '09:00') : null };
  if (key) { o.extra = f.xlist; o.labels = stepLabels(key); }
  const r = key ? T.ops.saveMeeting(key, o) : T.ops.createMeeting(o); if (!r || r.denied) { toast('Megbeszélést a profil adminja vesz fel.'); return; }
  const k2 = key || r.res, first = T.nextMeeting(k2);
  ui.panel = null; ui.f = {}; withUndo('meet:' + k2, key ? 'Mentve.' : 'Felvéve.', r);
  toast((key ? 'Mentve: ' : 'Felvéve: ') + cfg.series[k2].name + '. A legközelebbi alkalom: ' + D.dayName(first) + ', ' + fmtDate(first) + '.' + (key ? '' : ' Az „Új ügy” menüben már választható.')); renderMain();
};
/* Beállítások: emlékeztető-időzítés (K7.3) */
forms.reminders = form => {
  const prof = form.getAttribute('data-prof'), f = ui.f, E = {}, map = {};
  cfg.catalog.filter(k => k.remind && T.variant(prof, k.type) && T.variant(prof, k.type).on).forEach(k => {
    const n = Number(f['rm-' + k.type]);
    if (!Number.isInteger(n) || n < 1 || n > k.remind.max) E[k.type] = 'Írj be egy egész számot 1 és ' + k.remind.max + ' között (' + k.remind.unit + ').'; else map[k.type] = n;
  });
  f._re2 = E;
  if (Object.keys(E).length) { ui.focus = 'f-rm-' + Object.keys(E)[0]; renderMain(); return; }
  const r = T.ops.saveReminders(prof, map); if (!r || r.denied) { toast('Az emlékeztetőket a profil adminja állítja be.'); return; }
  f._re2 = {}; Object.keys(map).forEach(t => { f['rm-' + t] = undefined; }); if (r.res) withUndo('rem:' + prof, 'Mentve.', r); toast(r.res ? 'Mentve. Az új időzítés a még ki nem küldött emlékeztetőkre érvényes.' : 'Nem változott semmi.'); renderMain();
};
/* Beállítások: kijelölt feladatkörök */
forms.feladat = form => {
  const kind = form.getAttribute('data-kind'), prof = form.getAttribute('data-prof'), list = (ui.f.dmem || []).slice(), r = T.ops.setDuty(prof, kind, list);
  if (!r || r.denied) { toast('A kijelölést a profil adminja végzi.'); return; }
  ui.panel = null; ui.f = {}; withUndo('feladat:' + kind, 'Mentve.', r); toast('Mentve: ' + DUTY[kind][0].toLowerCase() + ': ' + (list.map(userName).join(', ') || 'senki') + '.'); renderMain();
};
/* Regisztráció (K9.13): a kérés a profil adminjához, osztályvezetőnél és a vezetőségnél a fő adminhoz kerül; utána a fiók belép */
forms.reg = () => {
  const f = ui.f, E = {}, name = (f.rname || '').trim(), role = f.rrole || '', leader = cfg.regLeaderRoles.indexOf(role) > -1, mail = T.checkMail(f.remail);
  if (!name) E.name = 'Írd be a neved.';
  if (mail) E.mail = mail;
  if (!role) E.role = 'Válaszd ki a szerepköröd.';
  else if (!leader && !f.rprof) E.prof = 'Válaszd ki, melyik profilhoz kéred, hogy rendeljenek.';
  f._re = E;
  if (Object.keys(E).length) { ui.focus = E.name ? 'f-rname' : E.mail ? 'f-remail' : E.role ? 'rrole-first' : 'rprof-first'; renderMain(); return; }
  const r = T.ops.register({ name, email: f.remail, role, profile: leader ? null : f.rprof });
  if (!r || r.denied) { f._re = { mail: r && r.err || 'Ezzel a címmel nem lehet regisztrálni.' }; ui.focus = 'f-remail'; renderMain(); return; }
  const start = T.login(r.res); ui.f = {};
  toast(T.toMainAdmin(role) ? 'Elküldve a fő adminnak. A kérésed jóváhagyásra vár.' : 'Elküldve a profil adminjának. A kérésed jóváhagyásra vár.');
  location.hash = start;
};
forms['new-case'] = () => {
  const p = ui.panel, f = ui.f, type = p.type;
  if (!p.pid && type !== 'altalanos') { f._err = 'Válaszd ki a beteget.'; ui.focus = 'f-pq'; renderMain(); return; }
  if (type === 'altalanos' && !(f.what || '').trim()) { f._err = 'Írd be röviden, mit kell tenni.'; ui.focus = 'f-what'; renderMain(); return; }
  const yn = v => v === 'igen' ? true : v === 'nem' ? false : undefined;
  const his = f.his ? [{ kind: T.flowOf(type) === 'konz' ? 'felvétel' : T.flowOf(type) === 'd2t' ? 'irat' : 'kérés', ref: f.his.trim() }] : [];
  const o = { type, patientId: p.pid, his, appearance: f.app || null };
  if (f.owner === 'other' && !f.ownerId) { f._eOwner = 'Válaszd ki, kinek adod.'; ui.focus = 'f-ownerId'; renderMain(); return; }
  f._eOwner = '';
  /* A felelősök pontosan azok, amelyeket a mentőgomb kimondott; aki másnak adja, figyelőként követi (mint az MR kérő orvosa) */
  const owners = ncOwners(p, f);
  if (owners && owners.length) { o.owners = owners; if (owners.indexOf(T.me()) === -1) o.watchSelf = true; } else if (owners) o.noOwner = true;
  if (type === 'vizsgalat') o.data = { exam: f.exam || 'MR', region: f.region || '', from: f.from || '', to: f.to || '', anesthesia: yn(f.anesthesia) };
  if (type === 'labor') o.data = { test: f.test || '', requestedOn: f.requestedOn || '', expectedOn: f.expectedOn || '', notify: f.notify || '' };
  if (type === 'engedely') { o.data = { drug: f.drug || '', indication: f.indication || '', reqType: f.reqType || 'új', offLabel: yn(f.offLabel), sentOn: f.sentOn || '', decidedOn: f.decidedOn || '', expiresOn: f.expiresOn || '' }; o.step = f.step || 'elok'; o.initial = o.step !== 'elok'; }
  if (T.isMeet(type)) { o.meeting = f.meeting || null; o.data = { question: f.question || '', region: f.region || '', summary: f.summary || '' }; if (T.flowOf(type) === 'd2t') o.due = f.due || null; if (f.link) o.relate = f.link; }
  if (type === 'atadas') o.data = { institution: f.institution || '', recvDoctor: f.recvDoctor || '', contact: f.contact || '', plannedOn: f.plannedOn || '', coordinator: owners[0], docReady: false };
  if (cfg.types[type].custom) o.due = f.due || null;
  const plus = plusData(T.U(T.me()).profile, type, f); if (Object.keys(plus).length) o.data = Object.assign(o.data || {}, plus);
  if (type === 'altalanos') {
    if (f.owner === 'duty') { const due = whenValue('when'); f._e2when = !due ? 'Válaszd ki, mikorra kell.' : due === 'hiányos' ? 'Add meg a napot és az időt.' : ''; if (f._e2when) { ui.focus = due === 'hiányos' ? 'f-whenD' : 'when-first'; renderMain(); return; } const r = T.ops.assignDuty({ patientId: p.pid, text: f.what.trim(), due }); ui.panel = null; ui.f = {}; withUndo('duty:' + r.res, 'Kiutalva.', r); toast('Kiutalva az ügyeletnek.'); ui.focus = 'h1'; renderMain(); return; }
    o.title = f.what.trim(); o.due = f.due || null;
  }
  const r = T.ops.createCase(o), c = T.Cs(r.res), ag = p.from === 'agenda';
  ui.panel = null; ui.f = {};
  const mine = c.owners.indexOf(T.me()) > -1, when = c.meeting ? ' Alkalom: ' + D.dayName(c.meeting) + ', ' + fmtDate(c.meeting) + '.' : '';
  toast(mine || !c.owners.length ? 'Mentve: ' + T.caseTitle(c) + (c.owners.length ? '.' : '; felelős még nincs.') + when : 'Kiadva: ' + c.owners.map(userName).join(', ') + ' viszi. A figyelt ügyeid között követed.' + when);
  ui.focus = ag ? 'agenda-new' : 'h1'; renderMain();
};
forms.kiutal = () => {
  const p = ui.panel, f = ui.f, text = (f.mit || '').trim(), due = whenValue('mikor');
  f._e1 = !text; f._e2mikor = !due ? 'Válaszd ki, mikorra kell.' : due === 'hiányos' ? 'Add meg a napot és az időt.' : '';
  if (f._e1 || f._e2mikor) { ui.focus = f._e1 ? 'f-mit' : due === 'hiányos' ? 'f-mikorD' : 'mikor-first'; renderMain(); return; }
  const r = T.ops.assignDuty({ patientId: p.pid || null, caseId: p.cid || null, text, due });
  T.ops.draft('kiutal:' + (p.cid || p.pid), '');
  ui.panel = null; ui.f = {}; withUndo('duty:' + r.res, 'Kiutalva.', r); toast('Kiutalva az ügyeletnek.'); renderMain();
};
forms.ward = () => {
  const p = ui.panel, f = ui.f, pid = p.pid || f.wpid, text = (f.wmit || '').trim(), due = whenValue('wmikor');
  f._e0 = !pid; f._e1 = !text; f._e2wmikor = due === 'hiányos' ? 'Add meg a napot és az időt, vagy válaszd: nincs határidő.' : '';
  if (f._e0 || f._e1 || f._e2wmikor) { ui.focus = f._e0 ? 'f-wpid' : f._e1 ? 'f-wmit' : 'f-wmikorD'; renderMain(); return; }
  const r = T.ops.leaveForWard({ patientId: pid, text, due: due || null, profileId: f.wprof || null });
  ui.panel = null; ui.f = {}; withUndo('duty:' + r.res, 'Az osztálynak hagyva.', r); toast('Az osztálynak hagyva: ' + T.profileName(T.Dy(r.res).profileId) + '.'); renderMain();
};
forms.absence = () => {
  const f = ui.f;
  f._eDep = f.adep ? '' : 'Válaszd ki, ki helyettesít.';
  if (!f.afrom || !f.ato) { f._err = 'Add meg a távollét kezdetét és végét.'; ui.focus = !f.afrom ? 'f-afrom' : 'f-ato'; renderMain(); return; }
  f._err = '';
  if (f._eDep) { ui.focus = 'f-adep'; renderMain(); return; }
  if (f.ato < f.afrom) { f._err = 'A távollét vége nem lehet a kezdete előtt.'; renderMain(); return; }
  T.ops.setAbsence({ from: f.afrom, to: f.ato, deputy: f.adep }); ui.panel = null; ui.f = {}; toast('Mentve: a távollét alatt ' + userName(f.adep) + ' is látja a nyitott tételeidet.'); renderMain();
};
forms.taj = form => {
  const p = ui.panel, f = ui.f, r = T.checkTaj(f.taj);
  f._err = r.err || ''; f._exists = r.exists ? r.exists.id : null;
  if (r.err || r.exists) { ui.focus = 'f-taj'; renderMain(); return; }
  T.ops.setTaj(p.pid, r.taj); ui.panel = null; ui.f = {}; toast('A TAJ bekerült; ugyanaz az ellenőrzés futott, mint felvételkor.'); renderMain();
};
forms.name = () => { const p = ui.panel; if (!(ui.f.pname || '').trim()) return; T.ops.setName(p.pid, ui.f.pname); ui.panel = null; ui.f = {}; toast('Mentve.'); renderMain(); };
forms['new-patient'] = () => {
  const f = ui.f; f._err = ''; f._exists = null;
  if (f.noTaj) {
    if (!(f.pname || '').trim()) { f._err = 'TAJ nélkül a név kötelező, mert más nem azonosítja a beteget.'; ui.focus = 'f-pname'; renderMain(); return; }
    if (!f.reason) { f._err = 'Jelöld, miért nincs TAJ.'; renderMain(); return; }
    const r = T.ops.createPatient({ noTaj: true, tempReason: f.reason, name: f.pname }); toast('Felvéve ideiglenes azonosítóval.'); ui.entered = ''; go('#/beteg/' + r.res); return;
  }
  const c = T.checkTaj(f.taj);
  if (c.err) { f._err = c.err; ui.focus = 'f-taj'; renderMain(); return; }
  if (c.exists) { f._exists = c.exists.id; ui.focus = 'f-taj'; renderMain(); return; }
  const r = T.ops.createPatient({ taj: c.taj, name: f.pname || '' }); toast('Felvéve.'); go('#/beteg/' + r.res);
};
/* Csak a ténylegesen módosított mezők mennek; ha ugyanazt a mezőt közben más is másra módosította, a mentő dönt (K12.3) */
forms.edit = form => {
  const id = form.getAttribute('data-id'), c = T.Cs(id), f = ui.f, F = editFields(c);
  const changed = F.filter(x => mineVal(x, f) !== f._snap[x.k]);
  const clash = changed.filter(x => x.get(c) !== f._snap[x.k] && x.get(c) !== mineVal(x, f));
  if (clash.length && !f._force) { ui.conflict = { id, kind: 'data', fields: clash.map(x => ({ label: x.label, theirs: fieldShow(x, x.get(c)), mine: fieldShow(x, mineVal(x, f)) })) }; ui.focus = 'conflict'; renderMain(); return; }
  if (!changed.length && !(f.e_his || '').trim()) { ui.edit = null; ui.f = {}; ui.conflict = null; toast('Nem változott semmi.'); ui.focus = 'edit'; renderMain(); return; }
  const patch = { data: {}, text: changed.length ? 'Adatok módosítva: ' + changed.map(x => x.label.toLowerCase()).join(', ') : 'Új HIS-hivatkozás' };
  changed.forEach(x => x.put(patch, mineVal(x, f)));
  if ((f.e_his || '').trim()) patch.hisAdd = { kind: c.type === 'vizsgalat' || c.type === 'labor' ? 'lelet' : 'irat', ref: f.e_his.trim() };
  T.ops.update(id, patch);
  ui.edit = null; ui.f = {}; ui.conflict = null; toast('Mentve.'); ui.focus = 'edit'; renderMain();
};
function submitDecision(id) {
  const f = ui.f, c = T.Cs(id);
  const rows = (f.rows || []).filter(r => (r.text || '').trim()).map(r => ({ text: r.text.trim(), owner: r.owner || null, due: r.due || null, spawn: r.spawn || null }));
  const res = T.ops.decide(id, { decision: (f.dec || '').trim(), participants: T.flowOf(c.type) === 'd2t' ? (f.part || []) : null, tasks: rows, baseText: f._dtext }, f._dbase);
  if (res.conflict) { ui.conflict = { id, kind: 'decision', mine: (f.dec || '').trim() }; ui.focus = 'conflict'; renderMain(); return; }
  T.ops.draft('dec:' + id, '');
  ui.decide = null; ui.f = {}; ui.conflict = null;
  const n = rows.length, sp = rows.filter(r => r.spawn).length;
  toast('A döntés mentve' + (n ? ', ' + n + ' teendővel' + (sp ? '; ' + sp + ' új ügy indult belőle' : '') : '') + '.');
  if (location.hash.indexOf('dontes=1') > -1) { ui.entered = '#/ugy/' + id; location.replace('#/ugy/' + id); }
  ui.focus = 'h1'; renderMain();
}
forms.decide = form => submitDecision(form.getAttribute('data-id'));
/* Kapcsolt ügy a teendőből: egy művelet, egy visszavonással; a felhasználó a helyén marad (a terv 3.4) */
forms.spawn = () => {
  const pn = ui.panel, f = ui.f, t = pn ? T.Tk(pn.tid) : null, c = t ? T.Cs(t.caseId) : null; if (!t || !c) return;
  const type = f.ltype, prof = c.profileId, title = (f.ltitle || '').trim();
  f._eType = ''; f._eOwner = ''; f._err = '';
  if (!type) { f._eType = 'Válaszd ki, milyen ügy lesz belőle.'; ui.focus = 'lk-type-first'; renderMain(); return; }
  if (type === 'altalanos' && !title) { f._err = 'Írd be röviden, mit kell tenni.'; ui.focus = 'f-ltitle'; renderMain(); return; }
  if (f.lowner === 'other' && !f.lownerId) { f._eOwner = 'Válaszd ki, kinek adod.'; ui.focus = 'f-lownerId'; renderMain(); return; }
  const owners = spawnOwners(t, c, f);
  const r = T.ops.spawnFromTask(t.id, { type, title: T.isMeet(type) || !T.titleFromTask(type) ? '' : title, due: f.ldue || null, owners, data: spawnData(type, f, prof, owners), meeting: T.isMeet(type) ? f.meeting || null : null });
  if (!r || r.denied) { toast('Ebből a teendőből most nem indítható kapcsolt ügy.'); return; }
  const n = T.Cs(r.res), an = T.areaName(n.areaId);
  ui.panel = null; ui.f = {};
  withUndo(pn.key, (T.spawnClosesTask ? 'Kapcsolt ügy lett belőle: ' : 'Kapcsolt ügy indult belőle: ') + T.caseTitle(n) + ' (' + typeName(n) + ').', r, 'working', { href: '#/ugy/' + n.id, name: T.caseTitle(n) });
  toast('Kapcsolt ügy indult ' + art(an) + ' ' + an + ' munkalistáján' + (n.owners.length ? ', ' + n.owners.map(userName).join(', ') + ' viszi' : ', felelős nélkül') + '.' + (T.spawnClosesTask ? ' A teendő kész.' : ''));
  renderMain();
};
forms.relate = form => {
  const id = form.getAttribute('data-id'), f = ui.f;
  if (!f.relId) { f._eRel = 'Válaszd ki az ügyet a listából.'; ui.focus = 'f-relId'; renderMain(); return; }
  const x = T.Cs(f.relId), r = T.ops.relate(id, f.relId);
  if (!r || r.denied) { toast('Ezt az ügyet nem kapcsolhatod.'); return; }
  ui.panel = null; ui.f = {}; withUndo('rel:' + id, 'Kapcsolva: ' + T.caseTitle(x) + '.', r);
  toast('Kapcsolva: ' + T.caseTitle(x) + '. Mindkét ügy listájában ott a másik.'); renderMain();
};
forms.task = form => {
  const id = form.getAttribute('data-id'), f = ui.f;
  if (!(f.ttext || '').trim()) { f._err = 'Írd be röviden, mit kell tenni.'; ui.focus = 'f-ttext'; renderMain(); return; }
  T.ops.addTask(id, { text: f.ttext.trim(), owner: f.towner || null, due: f.tdue || null }); ui.panel = null; ui.f = {}; toast('Új teendő mentve.'); ui.focus = 'new-task'; renderMain();
};
forms.note = form => {
  const id = form.getAttribute('data-id'), c = T.Cs(id), f = ui.f, mine = (f.note || '').trim();
  if ((c.note || '') !== (f._nbase || '') && (c.note || '') !== mine) { ui.conflict = { id, kind: 'note', mine }; ui.focus = 'conflict'; renderMain(); return; }
  T.ops.saveNote(id, mine); toast('A megjegyzés mentve.'); ui.f.note = undefined; ui.dirtyNote = false; ui.conflict = null; ui.focus = 'f-note'; renderMain();
};
forms.label = form => { const id = form.getAttribute('data-id'), l = (ui.f.label || '').trim(); if (!l) return; T.ops.addLabel(id, l); ui.f.label = ''; toast('Címke hozzáadva.'); ui.focus = 'f-label'; renderMain(); };
forms['save-view'] = () => {
  const name = (ui.f.vname || '').trim(); if (!name) return;
  const r = parseHash(); let area = r.args[0] || 'profil', view = r.args[1] || 'munkalista';
  if (area.indexOf('n-') === 0) { const v = T.state().views.find(x => x.id === area.slice(2)); area = v.spec.area; view = v.spec.view; }
  const res = T.ops.saveView(name, { area, view, q: r.q }); ui.f = {}; toast('Mentve: „' + name + '”. Csak neked látszik; a közös menü nem bővült.');
  go('#/munkalistak/n-' + T.state().views[T.state().views.length - 1].id);
};
forms.arch = () => {};

/* ---------------- Eseménykezelés ---------------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && act[el.getAttribute('data-act')]) { if (el.tagName !== 'A' || el.getAttribute('data-act') === 'skip') e.preventDefault(); act[el.getAttribute('data-act')](el, e); }
  const box = document.getElementById('talalatok'); if (box && !e.target.closest('.search')) box.hidden = true;
  document.querySelectorAll('details.menu[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details.menu') || !d.open) return; document.querySelectorAll('details.menu[open]').forEach(o => { if (o !== d) o.open = false; }); }, true);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (e.target.hasAttribute && e.target.hasAttribute('data-cb')) return;
  const open = document.querySelectorAll('details.menu[open]');
  if (open.length) { open.forEach(d => { d.open = false; d.querySelector('summary').focus(); }); return; }
  if (ui.prompt) { act['prompt-cancel'](); return; }
});
let draftTm = null;
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'kereso') { renderSearch(); return; }
  if (el.hasAttribute('data-cb')) { cbInput(el); return; }
  if (el.hasAttribute('data-arch')) { ui.arch[el.getAttribute('data-arch')] = el.value; ui.archLimit = 60; clearTimeout(draftTm); draftTm = setTimeout(() => { ui.focus = el.getAttribute('data-k'); renderMain(); }, 250); return; }
  if (el.hasAttribute('data-row')) { ui.f.rows[Number(el.getAttribute('data-row'))][el.getAttribute('data-rf')] = el.value; clearTimeout(saveUiDraft.tm); saveUiDraft.tm = setTimeout(saveUiDraft, 300); return; }
  /* Az ügytípus-szerkesztő lépéssorai: a kategória választása újrarajzol (a várakozó lépésnél jön a „Kire várunk?”), és eltünteti a sor kategóriahibáját */
  if (el.hasAttribute('data-trow')) {
    const i = Number(el.getAttribute('data-trow')), rf = el.getAttribute('data-rf'), row = (ui.f.trows || [])[i]; if (!row) return;
    row[rf] = el.value;
    if (el.tagName === 'SELECT') {
      if (rf === 'cat' && el.value !== 'V') row.wait = '';
      if (ui.f._te) { delete ui.f._te[(rf === 'cat' ? 'c' : 'w') + i]; if (rf === 'cat') delete ui.f._te['w' + i]; }
      ui.focus = el.getAttribute('data-k'); renderMain();
    }
    clearTimeout(saveUiDraft.tm); saveUiDraft.tm = setTimeout(saveUiDraft, 300); return;
  }
  if (el.hasAttribute('data-act-change') && el.tagName === 'INPUT') { clearTimeout(draftTm); draftTm = setTimeout(() => wlFilterChange(el), 400); return; }
  if (!el.hasAttribute('data-f')) return;
  const name = el.getAttribute('data-f');
  if (el.type === 'checkbox' && el.getAttribute('data-multi')) { const v = ui.f[name] || []; ui.f[name] = el.checked ? v.concat([el.value]).filter((x, i, a) => a.indexOf(x) === i) : v.filter(x => x !== el.value); }
  else if (el.type === 'checkbox') ui.f[name] = el.checked;
  else if (el.type === 'radio') { if (el.checked) ui.f[name] = el.value; }
  else ui.f[name] = el.value;
  /* Az alkalomválasztó: a legközelebbiek egyike, vagy a „későbbi alkalom” listájából */
  const mk = el.getAttribute('data-meet'); if (mk) { const v = ui.f[mk + 'Chip']; ui.f[mk] = v === 'later' ? ui.f[mk + 'Later'] : v; }
  if (name === 'ltype') { ui.f._eType = ''; ui.sayPrev = true; }
  const dk = el.getAttribute('data-draft'); if (dk) { clearTimeout(draftTm); draftTm = setTimeout(() => T.ops.draft(dk, el.value), 300); }
  if (name === 'mit') { const pv = document.getElementById('prev-mit'); if (pv) { pv.textContent = el.value.trim() ? '„' + el.value.trim() + '”' : '(még üres)'; pv.className = el.value.trim() ? '' : 'empty-val'; } }
  if (name === 'wmit') { const pv = document.getElementById('prev-wmit'); if (pv) { pv.textContent = el.value.trim() ? '„' + el.value.trim() + '”' : '(még üres)'; pv.className = el.value.trim() ? '' : 'empty-val'; } }
  if (name === 'pq') { clearTimeout(draftTm); draftTm = setTimeout(() => { ui.focus = 'f-pq'; renderMain(); }, 200); }
  if (name === 'note') ui.dirtyNote = true;
  clearTimeout(saveUiDraft.tm); saveUiDraft.tm = setTimeout(saveUiDraft, 300);
  if (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT') { if (['owner', 'noTaj', 'mikor', 'wmikor', 'wpid', 'wprof', 'when', 'ownerId', 'coordinator', 'owners', 'towner', 'rrole', 'rprof', 'rdept'].indexOf(name) > -1 || name.indexOf('mc:') === 0 || name.indexOf('rq-') === 0 || el.hasAttribute('data-rerender')) { ui.focus = el.getAttribute('data-k') || null; if (el.type === 'radio') ui.focusRadio = name; renderMain(); if (el.type === 'radio') { const r = document.querySelector('input[data-f="' + name + '"]:checked'); if (r) r.focus(); } } }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.hasAttribute('data-view-toggle')) {
    const r = T.ops.setViewShown(el.getAttribute('data-area'), el.getAttribute('data-view'), el.checked, el.getAttribute('data-label'));
    if (!r || r.denied) { toast('A közös nézeteket a profil adminja állítja be.'); el.checked = !el.checked; return; }
    toast((el.checked ? 'Látszik: ' : 'Elrejtve: ') + el.getAttribute('data-label') + ' (' + T.areaName(el.getAttribute('data-area')) + '). A profil minden tagjánál.'); ui.focus = el.getAttribute('data-k'); renderMain(); return;
  }
  if (el.hasAttribute('data-arch')) { ui.arch[el.getAttribute('data-arch')] = el.value; ui.archLimit = 60; ui.focus = el.getAttribute('data-k'); renderMain(); return; }
  if (el.hasAttribute('data-row')) { ui.f.rows[Number(el.getAttribute('data-row'))][el.getAttribute('data-rf')] = el.value; flushDraft(); return; }
  if (el.getAttribute('data-act-change') === 'os-type') { const q = Object.assign({}, ui.r.q); if (el.value) q.tipus = el.value; else delete q.tipus; const qs = Object.keys(q).map(k => k + '=' + encodeURIComponent(q[k])).join('&'); ui.entered = '#/osszesito' + (qs ? '?' + qs : ''); history.replaceState(null, '', ui.entered); ui.r = parseHash(); ui.focus = 'os-tipus'; renderMain(); return; }
  if (el.hasAttribute('data-act-change')) wlFilterChange(el);
});
function wlFilterChange(el) {
  const r = parseHash(), q = Object.assign({}, r.q); const name = el.getAttribute('data-name'), v = el.value;
  if (v) q[name] = v; else delete q[name];
  const qs = Object.keys(q).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&');
  const base = '#/munkalistak' + (r.args.length ? '/' + r.args.join('/') : '');
  ui.entered = base + (qs ? '?' + qs : ''); ui.focus = el.getAttribute('data-k');
  history.replaceState(null, '', ui.entered); ui.r = parseHash(); renderMain();
}
document.addEventListener('keydown', e => { const el = e.target; if (e.key !== 'Enter' || !el.getAttribute || !el.getAttribute('data-enter')) return; const fn = act[el.getAttribute('data-enter')]; if (fn) { e.preventDefault(); fn(el, e); } });
document.addEventListener('submit', e => { const form = e.target; const k = form.getAttribute('data-form'); if (!k) return; e.preventDefault(); if (!cbCheck(form)) return; if (forms[k]) forms[k](form); });
/* A személyválasztó billentyűi (WAI-ARIA combobox): le- és felnyíl, Enter, Esc, Tab; Alt+le nyit */
document.addEventListener('keydown', e => {
  const el = e.target; if (!el.hasAttribute || !el.hasAttribute('data-cb')) return;
  const key = el.getAttribute('data-cb'), spec = ui.cbSpec[key]; if (!spec) return;
  const open = !!(ui.cb && ui.cb.key === key);
  if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) cbOpen(key); else if (!e.altKey) cbMove(key, 1); return; }
  if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) cbOpen(key, true); else cbMove(key, -1); return; }
  if (e.key === 'Enter') {
    if (!open) return;
    const vis = cbVisible(spec, cbQ(key)), o = vis.find(x => x.v === ui.cb.act);
    if (o) { e.preventDefault(); cbPick(key, o.v); }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation();
    if (open) { cbClose(key); return; }
    /* Csukott listánál az Esc elveti a beírt, még nem választott szöveget */
    if (cbQ(key)) { cbQ(key, ''); delete ui.f['_cbE:' + key]; ui.focus = spec.id; renderMain(); cbFocusEnd(spec.id); }
    return;
  }
  if (e.key === 'Tab' && open) cbClose(key);
});
document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.cb-list, [data-cb-toggle]')) e.preventDefault(); });
document.addEventListener('click', e => {
  const t = e.target.closest ? e.target : null; if (!t) return;
  const opt = t.closest('[data-cb-opt]'); if (opt) { cbPick(opt.getAttribute('data-cb-opt'), opt.getAttribute('data-v')); return; }
  const tg = t.closest('[data-cb-toggle]'); if (tg) { const key = tg.getAttribute('data-cb-toggle'), spec = ui.cbSpec[key]; if (!spec) return; const input = document.getElementById(spec.id); if (input) input.focus(); if (ui.cb && ui.cb.key === key) cbClose(key); else cbOpen(key); return; }
  const del = t.closest('[data-cb-del]'); if (del) { cbRemove(del.getAttribute('data-cb-del'), del.getAttribute('data-v')); return; }
  /* Kattintásra lenyílik; ha már van választott név, a szöveg kijelölődik, így a gépelés lecseréli */
  const inp = t.closest('input[data-cb]'); if (inp && !(ui.cb && ui.cb.key === inp.getAttribute('data-cb'))) { const k = inp.getAttribute('data-cb'), sp = ui.cbSpec[k]; cbOpen(k); if (sp && !sp.multi && cbSel(sp, k) && !cbQ(k)) inp.select(); }
});
document.addEventListener('focusout', e => {
  const el = e.target; if (!el.hasAttribute || !el.hasAttribute('data-cb')) return;
  const wrap = el.closest('[data-cb-wrap]'), to = e.relatedTarget;
  if (to && wrap && wrap.contains(to)) return;
  cbClose(el.getAttribute('data-cb'));
});
document.addEventListener('keydown', e => {
  const input = document.getElementById('kereso'), box = document.getElementById('talalatok'); if (!input || !box) return;
  if (e.target === input) {
    if (e.key === 'ArrowDown') { const f = box.querySelector('a'); if (f) { e.preventDefault(); f.focus(); } }
    if (e.key === 'Escape') { input.value = ''; renderSearch(); }
  } else if (box.contains(e.target)) {
    const links = [].slice.call(box.querySelectorAll('a')), i = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
    if (e.key === 'Escape') { input.focus(); input.value = ''; renderSearch(); }
  }
});
document.addEventListener('focusin', e => { if (e.target.id === 'kereso' && e.target.value.trim()) renderSearch(); });
window.addEventListener('hashchange', () => { renderAll(); const box = document.getElementById('talalatok'); if (box) box.hidden = true; });
T.on(kind => {
  if (kind === 'külső' || kind === 'óra' || kind === 'reset') {
    if (T.me() && !cfg.users[T.me()]) { renderAll(); return; }
    /* Ha a fiók állapota máshol változott (például jóváhagyták a regisztrációt), a fejléc is frissül */
    if (T.me() && ui.hdrSig !== headerSig()) document.getElementById('fejlec').innerHTML = header();
    if (!document.activeElement || !document.activeElement.matches('input, textarea, select')) renderMain();
  }
});

/* ---------------- Indulás ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  T.init();
  /* A próba indítólapja a címben adja át, ki lép be ebben a fülben (betegut.html?belepes=...) */
  const m = /[?&]belepes=([a-z0-9]+)/.exec(location.search);
  if (m && cfg.users[m[1]]) {
    const start = T.login(m[1]);
    history.replaceState(null, '', location.pathname + (location.hash && location.hash.length > 2 ? location.hash : start));
  }
  renderAll();
});
})();
