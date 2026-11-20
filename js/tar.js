/* Fonal prototípus – a tár: állapot, mentés, jogosultság, listák, műveletek, emlékeztetők, napló.
   Minden a böngésző helyi tárában él (localStorage), internet nélkül; két fül ugyanazt az állapotot látja.
   A belépett felhasználó és a szerep fülenként külön (sessionStorage), mint két gépen. */
(function () {
'use strict';
const BT = window.BT, cfg = BT.cfg, D = BT.d;
const KEY = 'betegut-proto-allapot', SKEY = 'betegut-proto-belepes';
const OPEN = { Ny: 1, F: 1, V: 1 };
let st = null, ses = null;
const subs = [];
const clone = o => JSON.parse(JSON.stringify(o));
/* A klinika rögzített katalógusa és munkatársai; a profil beállításai (áreák, változatok, megbeszélések, tagok szerepköre, kijelölt feladatkörök),
   a saját ügytípusai (K4.17) és a regisztrált fiókok (K9.13) az állapotból kerülnek melléjük */
const BASE_TYPES = Object.assign({}, cfg.types), BASE_USERS = {};
Object.keys(cfg.users).forEach(k => { BASE_USERS[k] = Object.assign({}, cfg.users[k]); });
function typeDef(t) {
  const step = s => Object.assign({ id: s.id, label: s.label, cat: s.cat }, s.cat === 'V' ? { wait: s.wait } : {});
  /* Más profil fejlécében is a saját ügytípus neve látszik, mint bármelyik ügytípusé (K9.4) */
  return { name: t.name, short: t.name, general: t.name, custom: true, profile: t.profile,
    steps: t.steps.filter(s => s.cat !== 'L').map(step), closeSteps: t.steps.filter(s => s.cat === 'L').map(step),
    reasons: cfg.allReasons.slice(), end: { _: 'lezárt' } };
}
function accountUser(a) {
  const u = { id: a.id, name: a.name, email: a.email || '', registered: true, status: a.status };
  if (a.status !== 'approved') return u;
  const role = (a.decided && a.decided.role) || a.req.role;
  if (cfg.leaderRoles.indexOf(role) > -1) { u.leader = { role, scope: role === 'igazgató' || role === 'igazgatóhelyettes' ? 'klinika' : a.req.dept }; return u; }
  u.profile = a.req.profile; u.role = role; u.doctor = cfg.doctorRoles.indexOf(role) > -1;
  if (role === 'osztályvezető') u.head = true;
  return u;
}
const clear = o => { Object.keys(o).forEach(k => { delete o[k]; }); };
const lowerFirst = s => s && s.length > 1 && s[1] === s[1].toLowerCase() && /[a-záéíóöőúüű]/.test(s[1]) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
/* A sorozat neve a gyakoriságból és a változat nevéből: „Heti radiológiai konzílium” */
const seriesName = (name, every) => (every === 2 ? 'Kétheti ' : 'Heti ') + lowerFirst(name);
/* Az „Új ügy” menü alsora: a közös ügytípus neve, ha a változat másként szól; az általános nevű vizsgálatnál a vizsgálatlista */
function menuSub(p, t, v) {
  const gen = cfg.types[t] ? cfg.types[t].general : '';
  if (v.flow) return 'Esetmegbeszélés';
  if (gen && v.name !== gen) return gen;
  return t === 'vizsgalat' ? cfg.profiles[p].exams.join(', ') : '';
}
function applyMember(m) {
  const u = cfg.users[m.id]; if (!u) return;
  if (m.removed) { u.removed = m.removed; delete u.profile; delete u.role; u.doctor = false; u.head = false; return; }
  if (m.role) { u.role = m.role; u.doctor = cfg.doctorRoles.indexOf(m.role) > -1; u.head = m.role === 'osztályvezető'; }
}
function applyState() {
  Object.keys(cfg.types).forEach(k => { if (!BASE_TYPES[k]) delete cfg.types[k]; });
  [cfg.areas, cfg.areaOrder, cfg.defaultArea, cfg.newMenu, cfg.series, cfg.variants].forEach(clear);
  const profs = Object.keys(cfg.profiles);
  profs.forEach(p => { cfg.areaOrder[p] = []; cfg.defaultArea[p] = {}; cfg.newMenu[p] = []; cfg.variants[p] = {}; });
  (st.areas || []).forEach(a => { if (!cfg.areaOrder[a.profile]) return; cfg.areas[a.id] = a; cfg.areaOrder[a.profile].push(a.id); });
  (st.variants || []).forEach(v => {
    if (!cfg.variants[v.profile]) return;
    cfg.variants[v.profile][v.type] = v;
    /* A felületen felvett megbeszélés saját változat-kulcsot kap; a lépései a választott működés mintájából jönnek */
    if (v.flow && !BASE_TYPES[v.type]) cfg.types[v.type] = cfg.meetType(v.type, v.name, v.flow);
  });
  profs.forEach(p => {
    const first = cfg.areaOrder[p][0] || null, vs = cfg.variants[p];
    /* Ha a változat áreája nincs (új profil), az ügyei a profil első áreájára kerülnek */
    Object.keys(vs).forEach(t => { const a = vs[t].area; cfg.defaultArea[p][t] = a && cfg.areas[a] && cfg.areas[a].profile === p ? a : first; });
    cfg.profiles[p].exams = vs.vizsgalat && vs.vizsgalat.exams && vs.vizsgalat.exams.length ? vs.vizsgalat.exams.slice() : ['MR'];
  });
  (st.series || []).forEach(s => {
    const v = cfg.variants[s.profile] && cfg.variants[s.profile][s.id]; if (!v) return;
    cfg.series[s.id] = Object.assign({}, s, { name: seriesName(v.name, s.every), area: cfg.defaultArea[s.profile][s.id] });
  });
  /* Az „Új ügy” menü: a bekapcsolt változatok a katalógus sorrendjében, a megbeszélés csak sorozattal; áreák nélkül üres */
  profs.forEach(p => {
    if (!cfg.areaOrder[p].length) return;
    const vs = cfg.variants[p], list = cfg.newMenu[p];
    const push = t => { const v = vs[t]; if (!v || !v.on || (v.flow && !cfg.series[t])) return; list.push([t, v.name || cfg.types[t].name, menuSub(p, t, v)]); };
    ['vizsgalat', 'labor', 'engedely'].forEach(push); Object.keys(vs).filter(t => vs[t].flow).forEach(push); ['atadas', 'altalanos'].forEach(push);
  });
  (st.types || []).forEach(t => { cfg.types[t.id] = typeDef(t); if (cfg.areaOrder[t.profile] && cfg.areaOrder[t.profile].length) cfg.newMenu[t.profile].push([t.id, t.name, 'a profil saját ügytípusa']); cfg.defaultArea[t.profile][t.id] = t.area; });
  /* Munkatársak: a rögzítettek, a regisztrált fiókok, rajtuk a profil adminjának módosításai (szerepkör, eltávolítás) és a kijelölések */
  clear(cfg.users);
  Object.keys(BASE_USERS).forEach(k => { cfg.users[k] = Object.assign({}, BASE_USERS[k]); });
  (st.accounts || []).forEach(a => { cfg.users[a.id] = accountUser(a); });
  (st.members || []).forEach(applyMember);
  (st.duties || []).forEach(d => {
    d.merge.forEach(k => { const u = cfg.users[k]; if (u && u.profile === d.id) u.merge = true; });
    d.audit.forEach(k => { const u = cfg.users[k]; if (u && u.profile === d.id) u.audit = true; });
  });
}

/* ---------------- Tárolás ---------------- */
function mem() { try { const s = window.localStorage; s.setItem('__bt', '1'); s.removeItem('__bt'); return s; } catch (e) { return null; } }
const LS = mem();
const memStore = {};
function readLS(k) { try { return LS ? LS.getItem(k) : memStore[k]; } catch (e) { return memStore[k]; } }
function writeLS(k, v) { try { if (LS) LS.setItem(k, v); else memStore[k] = v; } catch (e) { memStore[k] = v; } }
function readSS() { try { return JSON.parse(window.sessionStorage.getItem(SKEY) || 'null'); } catch (e) { return ses; } }
function writeSS(v) { ses = v; try { window.sessionStorage.setItem(SKEY, JSON.stringify(v)); } catch (e) { /* csak memóriában */ } }
/* A korábban mentett állapotban az új gyűjtemények még hiányozhatnak */
function migrate(s) { ['types', 'accounts', 'admins', 'areas', 'variants', 'series', 'members', 'duties', 'rels'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; }); return s; }
/* A 2026-11-19-i bővítés óta a profil beállításai is az állapotban vannak (5. változat), este óta a kapcsolatok is egy rekordban (6. változat);
   a korábbi mentés helyett a szabad próba indul */
function load() {
  const raw = readLS(KEY);
  if (raw) { try { const s = JSON.parse(raw); if (s && s.v === 6) { st = migrate(s); applyState(); return; } } catch (e) { /* újraépítjük */ } }
  st = BT.worlds.base(); applyState(); tick(true); persist();
}
function persist() { writeLS(KEY, JSON.stringify(st)); }
function emit(kind) { subs.forEach(f => { try { f(kind); } catch (e) { console.error(e); } }); }
window.addEventListener('storage', e => { if (e.key === KEY && e.newValue) { try { st = migrate(JSON.parse(e.newValue)); applyState(); emit('külső'); } catch (x) { /* nem baj */ } } });

/* ---------------- Óra ---------------- */
const now = () => st.clock;
const today = () => st.clock.slice(0, 10);
function setClock(dt) { st.clock = dt; tick(); persist(); emit('óra'); }

/* ---------------- Keresők ---------------- */
const U = id => cfg.users[id] || { id, name: id === 'rendszer' ? 'a rendszer' : id === 'uzemelteto' ? 'az üzemeltető' : (id || '–') };
const uname = id => U(id).name;
const P = id => st.patients.find(p => p.id === id) || null;
const Cs = id => st.cases.find(c => c.id === id) || null;
const Tk = id => st.tasks.find(t => t.id === id) || null;
const Dy = id => st.duty.find(y => y.id === id) || null;
const typeOf = c => cfg.types[c.type];
function stepDef(c, id) { const t = typeOf(c), sid = id || c.step; return t.steps.find(s => s.id === sid) || (t.closeSteps || []).find(s => s.id === sid); }
/* Az esetmegbeszélés működése (konz vagy d2t); a többi ügytípusnál null */
const flowOf = type => (cfg.types[type] && cfg.types[type].flow) || null;
const isMeet = type => !!flowOf(type);
const variant = (profileId, type) => (cfg.variants[profileId] || {})[type] || null;
/* Az emlékeztető-időzítés a változatból (K7.3); a katalógus alapértéke, ha a profil nem állította át */
function remindOf(profileId, type) { const v = variant(profileId, type), k = cfg.catalog.find(x => x.type === type); return v && v.remind ? v.remind : k && k.remind ? k.remind.def : null; }
function stepLabel(c, id) {
  const sid = id || c.step, r = st.renames[c.profileId + ':' + c.type + ':' + sid];
  if (r) return r; const s = stepDef(c, sid); return s ? s.label : sid;
}
function cat(c) { if (c.closed) return 'L'; const s = stepDef(c); return s ? s.cat : 'Ny'; }
const isOpen = c => !!OPEN[cat(c)];
const catWord = { Ny: 'nyitott', F: 'folyamatban', V: 'várakozik', K: 'kész', L: 'lezárt' };
function caseTitle(c) {
  if (c.title) return c.title;
  const d = c.data || {};
  if (isMeet(c.type)) return d.question || 'Bejelentett eset';
  switch (c.type) {
    case 'engedely': return cap(d.drug || 'Gyógyszer még nincs megadva') + (d.reqType && d.reqType !== 'új' ? ' – ' + d.reqType : '') + '-engedély';
    case 'vizsgalat': return (d.exam || 'Vizsgálat') + (d.region ? ', ' + d.region : '') + (d.anesthesia === true ? ', altatással' : '');
    case 'labor': return cap(d.test || 'Labor- és leletkövetés');
    case 'atadas': return 'Átadás: ' + (d.institution || 'a fogadó intézmény még nincs megadva');
    default: return c.title || (typeOf(c) ? typeOf(c).name : 'Általános teendő');
  }
}
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
/* A más profilnak mutatott fejléc a közös ügytípusnevet mutatja, nem a profil változatát (a bírálat szerint) */
function commonType(c) { const t = typeOf(c); return t.general || t.name; }
function patientName(p) { return p ? (p.name || '') : ''; }
function patientId(p) { if (!p) return ''; return p.taj ? 'TAJ ' + fmtTaj(p.taj) : 'ideiglenes ' + p.temp; }
function fmtTaj(t) { return t ? t.slice(0, 3) + ' ' + t.slice(3, 6) + ' ' + t.slice(6) : ''; }
function patientLabel(p) { return p ? (p.name || patientId(p)) : ''; }
function caresOf(pid) { return st.cares.filter(g => g.patientId === pid); }
function careIn(pid, profileId) { return st.cares.find(g => g.patientId === pid && g.profileId === profileId) || null; }
function openAdmission(pid) { return st.appearances.find(a => a.patientId === pid && a.kind === 'adm' && !a.end) || null; }
function profileName(id) { return cfg.profiles[id] ? cfg.profiles[id].name : ''; }
function areaName(id) { return cfg.areas[id] ? cfg.areas[id].name : 'área nélkül'; }
function deptOfProfile(id) { return cfg.profiles[id] ? cfg.profiles[id].dept : null; }

/* ---------------- Belépés és szerep ---------------- */
function session() { if (!ses) ses = readSS(); return ses; }
function me() { const s = session(); return s ? s.user : null; }
function mode() { const s = session(); return s ? s.mode : null; }
function modesOf(uid) {
  const u = U(uid), m = [];
  if (u.profile) m.push('work');
  if (u.leader) m.push('leader');
  return m;
}
function defaultMode(uid) {
  const pref = st.prefs[uid], m = modesOf(uid);
  if (pref && pref.mode && m.indexOf(pref.mode) > -1) return pref.mode;
  return U(uid).leader ? 'leader' : 'work';
}
/* Belépés után a saját kezdőképernyő; a kettős szerepű és az ügyeleti tag a legutóbbi nézetében (K11.7) */
function startRoute(uid, md) {
  if (U(uid).mainAdmin) return '#/beallitasok';
  if (!isActive(uid)) return '#/fiok';
  const pref = st.prefs[uid], dual = modesOf(uid).length > 1 || !!U(uid).duty;
  const last = pref && pref.lastBy ? pref.lastBy[md] : null;
  if (dual && last) return last;
  return md === 'leader' ? '#/osszesito' : U(uid).duty ? '#/ugyelet' : '#/sajat';
}
function login(uid) { const md = defaultMode(uid); writeSS({ user: uid, mode: md }); return startRoute(uid, md); }
function logout() { writeSS(null); }
function setMode(md) { const s = session(); if (!s) return; writeSS({ user: s.user, mode: md }); pref(s.user, { mode: md }); return startRoute(s.user, md); }
function pref(uid, patch) { st.prefs[uid] = Object.assign({}, st.prefs[uid] || {}, patch); persist(); }
function rememberView(route) { const u = me(); if (!u) return; const lb = Object.assign({}, (st.prefs[u] || {}).lastBy || {}); lb[mode()] = route; pref(u, { lastBy: lb, mode: mode() }); }

/* ---------------- Jogosultság (K9, részletes terv 5.1) ---------------- */
const isMember = (uid, profileId) => !!uid && U(uid).profile === profileId;
const isDoctor = uid => !!U(uid).doctor;
/* A főnővér úgy dolgozik, mint a nővér (K9.5, K9.8) */
const isNurse = uid => U(uid).role === 'nővér' || U(uid).role === 'főnővér';
/* A profil összesítőjét az osztályvezető és a főnővér látja (K9.8) */
const seesSummary = uid => { const u = U(uid || me()); return !!u.profile && (!!u.head || u.role === 'főnővér'); };
function caseAccess(c, uid, md) {
  uid = uid || me(); md = md || mode();
  if (!uid || md === 'leader') return 'none';
  if (isMember(uid, c.profileId)) return 'write';
  if (!c.patientId || !isDoctor(uid)) return 'none';
  if (openAdmission(c.patientId) && isOpen(c)) return 'read';
  return 'header';
}
/* A nyitott teendő jogosultságát önállóan is vizsgáljuk: lezárt szülőügy alatt sem tűnik el (részletes terv 5.1) */
function taskAccess(t, uid, md) {
  uid = uid || me(); md = md || mode();
  const c = Cs(t.caseId); if (!c || !uid || md === 'leader') return 'none';
  if (isMember(uid, c.profileId)) return 'write';
  if (c.patientId && isDoctor(uid) && openAdmission(c.patientId) && !t.done) return 'read';
  return 'none';
}
function patientAccess(pid, uid, md) {
  uid = uid || me(); md = md || mode();
  const p = P(pid); if (!p || p.merged || !uid || md === 'leader') return 'none';
  if (caresOf(pid).some(g => isMember(uid, g.profileId))) return 'own';
  if (isDoctor(uid)) return 'other';
  return 'none';
}
const canMerge = uid => !!U(uid || me()).merge;
const canAudit = uid => !!U(uid || me()).audit;
/* A profil adminja ugyanaz a jog, mint korábban a profilgazda (K9.9, K9.12): a lépésátnevezés is az övé */
const isProfileOwner = uid => adminProfiles(uid || me()).length > 0;

/* ---------------- Adminok és regisztráció (K9.12, K9.13) ----------------
   Admin: a profil osztályvezetője és a vezetőség alapból (a vezető a hatókörébe tartozó profilokban), mellettük akinek az osztályvezető adminjogot adott.
   Adminjogot csak a profil osztályvezetője ad. A fő admin az osztályvezetői és a vezetői regisztrációt bírálja el.
   Jóváhagyásig a regisztrált fiók belép, de semmilyen betegadatot nem lát: profil és szerepkör nélkül minden jogosultsági kérdésre „nincs” a válasz. */
const isMainAdmin = uid => !!U(uid || me()).mainAdmin;
function isActive(uid) { const u = U(uid || me()); return !!(u.profile || u.leader || u.mainAdmin); }
function adminSource(uid, profileId) {
  const u = U(uid);
  if (u.head && u.profile === profileId) return { kind: 'head' };
  if (u.leader && (u.leader.scope === 'klinika' || deptOfProfile(profileId) === u.leader.scope)) return { kind: 'leader', role: u.leader.role };
  /* Kiadott adminjog: az osztályvezetőtől, vagy az első adminé, akit az üzemeltető a profil létrehozásakor jelölt ki; csak a profil tagjáé */
  const g = u.profile === profileId ? st.admins.find(a => a.user === uid && a.profile === profileId) : null;
  return g ? (g.first ? { kind: 'first', at: g.at } : { kind: 'grant', by: g.by, at: g.at }) : null;
}
const isAdminOf = (uid, profileId) => !!adminSource(uid, profileId);
function adminProfiles(uid) { uid = uid || me(); return Object.keys(cfg.profiles).filter(pid => isAdminOf(uid, pid)); }
const canGrant = (uid, profileId) => { const u = U(uid || me()); return !!u.head && u.profile === profileId; };
const headOf = profileId => Object.keys(cfg.users).filter(k => cfg.users[k].head && cfg.users[k].profile === profileId);
/* Az osztályvezetői, a főnővéri és a vezetői kérés a fő adminhoz kerül, a többi a kért profil adminjaihoz (K9.12) */
const toMainAdmin = role => role === 'osztályvezető' || role === 'főnővér' || cfg.leaderRoles.indexOf(role) > -1;
/* Regisztrálni csak @semmelweis.hu végű címmel lehet; aldomain és más cím nem (K9.13). A cím egyben a belépési név, ezért egyedi. */
function checkMail(raw, exceptId) {
  const s = String(raw || '').trim().toLowerCase(), d = cfg.mailDomain;
  if (!s) return 'Írd be az egyetemi e-mail-címed (…@' + d + ').';
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(s);
  if (!m) return 'Ez nem e-mail-cím. Az egyetemi címed így végződik: @' + d + '.';
  if (m[2] !== d && m[2].slice(-(d.length + 1)) === '.' + d) return 'Aldomainnel (például @phd.' + d + ') nem lehet regisztrálni: csak a @' + d + ' végű cím fogadható el.';
  if (m[2] !== d) return 'Csak @' + d + ' végű egyetemi címmel lehet regisztrálni; más cím, például magáncím, nem fogadható el.';
  const taken = Object.keys(cfg.users).some(k => k !== exceptId && (cfg.users[k].email || '').toLowerCase() === s) || st.accounts.some(a => a.id !== exceptId && (a.email || '').toLowerCase() === s);
  if (taken) return 'Ezzel a címmel már van fiók. Lépj be vele, vagy kérdezd a profil adminját.';
  return '';
}
function requestsFor(uid, profileId) {
  uid = uid || me();
  const mine = a => isMainAdmin(uid) ? toMainAdmin(a.req.role) : (!toMainAdmin(a.req.role) && a.req.profile === profileId && isAdminOf(uid, profileId));
  const list = st.accounts.filter(mine);
  const seq = a => Number(a.id.replace(/\D/g, ''));
  return { pending: list.filter(a => a.status === 'pending').sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : seq(a) - seq(b))),
    decided: list.filter(a => a.status !== 'pending').sort((a, b) => (b.decided.at > a.decided.at ? 1 : b.decided.at < a.decided.at ? -1 : seq(b) - seq(a))) };
}
const account = id => st.accounts.find(a => a.id === id) || null;
/* A függő regisztrációk száma annak, aki elbírálhatja őket (CT kérése, 2026-11-19): jelzés a kezdőképernyőn és a „Beállítások” mellett, amíg van függő kérés */
function pendingFor(uid) {
  uid = uid || me();
  if (isMainAdmin(uid)) return { n: requestsFor(uid).pending.length, prof: null };
  let n = 0, prof = null;
  adminProfiles(uid).forEach(pid => { const k = requestsFor(uid, pid).pending.length; n += k; if (k && !prof) prof = pid; });
  return { n, prof };
}

/* ---------------- Dátum a sorokban ---------------- */
function relDay(iso) {
  const n = D.diff(iso, today());
  if (n === 0) return 'ma'; if (n === 1) return 'holnap'; if (n === -1) return 'tegnap';
  if (n > 1 && n < 7) return D.dayName(iso);
  return D.fmt(iso, today());
}
function relDue(iso) {
  const n = D.diff(iso, today());
  if (n < 0) return (-n) + ' napja késik';
  if (n === 0) return 'ma esedékes'; if (n === 1) return 'holnap esedékes';
  if (n < 7) return D.dayName(iso);
  return D.fmt(iso, today());
}
function relAt(dt) { return relDay(dt.slice(0, 10)) + ' ' + D.hm(dt); }
function waitLen(since) { const n = D.diff(today(), since); return n <= 0 ? 'ma óta' : n + ' napja'; }
function lateBy(dt) {
  const m = D.mins(now()) - D.mins(dt);
  if (m < 60) return m + ' perce késik';
  if (m < 1440) return Math.floor(m / 60) + ' órája késik';
  return Math.floor(m / 1440) + ' napja késik';
}
const dutyLate = y => !y.closed && !!y.due && D.mins(y.due) < D.mins(now());
/* A sor dátuma: kifejezett határidő, különben az ügytípus saját dátuma */
function caseDate(c) {
  const d = c.data || {};
  if (c.type === 'engedely' && c.step === 'erv' && d.expiresOn) return d.expiresOn;
  if (c.due) return c.due;
  if (c.type === 'vizsgalat') return d.appointment || d.to || null;
  if (c.type === 'labor') return d.expectedOn || null;
  if (c.meeting && ['bej', 'nap', 'atg'].indexOf(c.step) > -1) return c.meeting;
  if (c.type === 'atadas') return d.plannedOn || null;
  return null;
}
function permitExpired(c) { return c.type === 'engedely' && !c.closed && c.step === 'erv' && c.data.expiresOn && c.data.expiresOn < today() && !renewalOf(c.id); }
function renewalOf(id) { return st.cases.find(x => x.prev === id) || null; }
function caseLate(c) {
  if (permitExpired(c)) return true;
  if (!isOpen(c) || cat(c) === 'V') return false;
  const dt = caseDate(c); return !!dt && dt < today();
}
const taskOpen = t => !t.done;
const taskLate = t => taskOpen(t) && !!t.due && t.due < today();

/* ---------------- Kapcsolt ügyek (K4.11) ----------------
   Egy kapcsolatrekord: a két ügy és a fajta. Az ebből indult, a hosszabbítás, az új kérelem és az új előjegyzés kiinduló ügye a „from”;
   a kézi kapcsolat („kapcsolódik”) egyenrangú, kiinduló ügye nincs. A kapcsolat nem ad jogot a másik ügyhöz: mindkét ügyet a saját
   jogosultsága védi (K9), ezért a kapcsolatból csak az látszik és csak az számol, amit a néző láthat; a felület ezt a szűrt listát kapja (K9.11). */
const REL_WORD = { ebbol: 'ebből indult', hosszabbitas: 'hosszabbítás', ujkerelem: 'új kérelem', ujeloj: 'új előjegyzés', kapcsolodik: 'kapcsolódik' };
const relWord = r => REL_WORD[r.kind] || r.kind;
const relBetween = (a, b) => st.rels.find(r => (r.from === a && r.to === b) || (r.from === b && r.to === a)) || null;
/* A kiinduló ügy: amelyikből az ügy indult (teendőből vagy folytatásként) */
function originOf(c, uid, md) {
  const r = st.rels.find(x => x.kind !== 'kapcsolodik' && x.to === c.id), x = r ? Cs(r.from) : null;
  if (!x) return null;
  const acc = caseAccess(x, uid, md);
  return acc === 'none' ? null : { rel: r, c: x, acc, word: relWord(r) };
}
/* A kapcsolt ügyek: amelyek ebből indultak, és a kézzel kapcsoltak; a nyitottak elöl, dátum szerint, a lezártak a végén */
function linkedOf(c, uid, md) {
  const dk = x => caseDate(x) || '9999-12-31';
  return st.rels.filter(r => r.from === c.id || (r.kind === 'kapcsolodik' && r.to === c.id))
    .map(r => { const x = Cs(r.from === c.id ? r.to : r.from); return x ? { rel: r, c: x, acc: caseAccess(x, uid, md), word: relWord(r) } : null; })
    .filter(o => o && o.acc !== 'none')
    .sort((a, b) => (!!a.c.closed - !!b.c.closed) || (a.c.closed ? (b.c.closed.at > a.c.closed.at ? 1 : -1) : dk(a.c) < dk(b.c) ? -1 : dk(a.c) > dk(b.c) ? 1 : 0));
}
/* Az ügy nyitott teendői, amelyeket a néző láthat; határidő szerint, a lejártak így elöl */
function openTasksOf(c, uid, md) {
  return st.tasks.filter(t => t.caseId === c.id && !t.done && taskAccess(t, uid, md) !== 'none')
    .sort((a, b) => ((a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : 0));
}

/* ---------------- Helyettesítés (K5.17) ---------------- */
function absenceOf(uid, day) { day = day || today(); return st.absences.find(a => a.user === uid && a.from <= day && a.to >= day) || null; }
function deputiedBy(uid, day) { day = day || today(); return st.absences.filter(a => a.deputy === uid && a.from <= day && a.to >= day).map(a => a.user); }

/* ---------------- Listák ---------------- */
function itemSortKey(it) {
  const late = it.late ? 0 : 1, dt = it.date || '9999-12-31';
  return late + '|' + (it.late ? dt : dt) + '|' + (it.kind === 'task' ? 1 : 0);
}
function caseItem(c, extra) { return Object.assign({ kind: 'case', key: 'case:' + c.id, c, date: caseDate(c), late: caseLate(c) }, extra || {}); }
function taskItem(t, extra) { const c = Cs(t.caseId); return Object.assign({ kind: 'task', key: 'task:' + t.id, t, c, date: t.due, late: taskLate(t) }, extra || {}); }
function sortWorking(arr) { return arr.sort((a, b) => itemSortKey(a) < itemSortKey(b) ? -1 : itemSortKey(a) > itemSortKey(b) ? 1 : 0); }
function sortWaiting(arr) { return arr.sort((a, b) => (a.c.waitSince || '') < (b.c.waitSince || '') ? -1 : 1); }

/* „Saját ügyeim”: ahol a néző felelős vagy helyettes (K6.2), a „keep” halmaz a visszavonható, épp lezárt sorokat tartja helyben */
function myLists(uid, keep) {
  uid = uid || me(); keep = keep || {};
  const deps = deputiedBy(uid), who = [uid].concat(deps);
  const mineCase = c => c.owners.some(o => who.indexOf(o) > -1);
  const depOf = owners => { const d = owners.filter(o => deps.indexOf(o) > -1 && owners.indexOf(uid) === -1); return d.length ? d[0] : null; };
  const working = [], waiting = [];
  st.cases.forEach(c => {
    if (!mineCase(c) || caseAccess(c, uid, 'work') !== 'write') return;
    const k = keep['case:' + c.id];
    if (!(isOpen(c) || permitExpired(c) || k)) return;
    const it = caseItem(c, { deputyOf: depOf(c.owners) });
    if (cat(c) === 'V' && !k) waiting.push(it); else if (k && k.group === 'waiting') waiting.push(it); else working.push(it);
  });
  st.tasks.forEach(t => {
    if (who.indexOf(t.owner) === -1) return;
    if (!taskOpen(t) && !keep['task:' + t.id]) return;
    working.push(taskItem(t, { deputyOf: deps.indexOf(t.owner) > -1 ? t.owner : null }));
  });
  const watched = st.cases.filter(c => c.watchers.indexOf(uid) > -1 && (isOpen(c) || cat(c) === 'K' || (c.closed && D.diff(today(), c.closed.at.slice(0, 10)) <= 7)))
    .sort((a, b) => (lastChange(b) > lastChange(a) ? 1 : -1));
  const assigned = st.duty.filter(y => y.dir === 'to' && y.by === uid && (!y.closed || D.diff(today(), y.closed.at.slice(0, 10)) <= 7 || keep['duty:' + y.id]))
    .sort((a, b) => (b.at > a.at ? 1 : -1));
  const fromDuty = fromDutyFor(uid, keep);
  return { working: sortWorking(working), waiting: sortWaiting(waiting), watched, assigned, fromDuty, deps };
}
function lastChange(c) { const h = c.history[c.history.length - 1]; return h ? h.at : c.created.at; }
/* Az ügyelettől jött tételek: a profil orvosainak, nővéreinek és asszisztenseinek (K8.9; a bírálat 4. pontja) */
function fromDutyFor(uid, keep) {
  keep = keep || {}; const u = U(uid);
  if (!u.profile) return [];
  return st.duty.filter(y => y.dir === 'from' && y.profileId === u.profile && (!y.closed || keep['duty:' + y.id])).sort(dutySort);
}
function dutySort(a, b) { return (dutyLate(b) - dutyLate(a)) || ((a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : (a.at < b.at ? -1 : 1)); }
/* Az área munkalistája (K6.1, K6.4) */
function areaList(areaId, opts) {
  opts = opts || {}; const keep = opts.keep || {}, excl = opts.exclude || {};
  const working = [], waiting = [], unassigned = [];
  st.cases.forEach(c => {
    if (c.areaId !== areaId || caseAccess(c) !== 'write') return;
    const key = 'case:' + c.id;
    if (excl[key]) return;
    if (!(isOpen(c) || permitExpired(c) || keep[key])) return;
    if (opts.filter && !opts.filter(c)) return;
    const it = caseItem(c);
    if (!c.owners.length && isOpen(c)) unassigned.push(it);
    else if (cat(c) === 'V' && !keep[key]) waiting.push(it); else working.push(it);
  });
  st.tasks.forEach(t => {
    const c = Cs(t.caseId); if (!c || c.areaId !== areaId || caseAccess(c) !== 'write') return;
    const key = 'task:' + t.id;
    if (excl[key]) return;
    if (!taskOpen(t) && !keep[key]) return;
    if (opts.filter && !opts.filter(c)) return;
    const it = taskItem(t);
    if (!t.owner) unassigned.push(it); else working.push(it);
  });
  return { working: sortWorking(working), waiting: sortWaiting(waiting), unassigned: sortWorking(unassigned) };
}
/* Ügyeleti lista (K8.1–K8.7) és az osztályoknak hagyott tételek (K8.10) */
function dutyLists(keep) {
  keep = keep || {};
  const open = st.duty.filter(y => y.dir === 'to' && (!y.closed || keep['duty:' + y.id])).sort(dutySort);
  const left = st.duty.filter(y => y.dir === 'from' && (!y.closed || D.diff(today(), y.closed.at.slice(0, 10)) <= 7 || keep['duty:' + y.id]))
    .sort((a, b) => (b.at > a.at ? 1 : -1));
  return { open, left };
}
function patientDuty(pid) {
  const all = st.duty.filter(y => y.patientId === pid);
  const fresh = y => !y.closed || D.diff(today(), y.closed.at.slice(0, 10)) <= 7;
  return { to: all.filter(y => y.dir === 'to' && fresh(y)).sort((a, b) => b.at > a.at ? 1 : -1), from: all.filter(y => y.dir === 'from' && fresh(y)).sort((a, b) => b.at > a.at ? 1 : -1) };
}
function inpatients() {
  return st.appearances.filter(a => a.kind === 'adm' && !a.end).map(a => ({ a, p: P(a.patientId) })).filter(x => x.p && !x.p.merged);
}

/* ---------------- Összesítő (K9.10) és mutatók (M1–M4) ---------------- */
function leaderScope(uid, md) {
  uid = uid || me(); md = md || mode(); const u = U(uid);
  if (md === 'leader' && u.leader) return u.leader.scope === 'klinika' ? { kind: 'klinika' } : { kind: 'dept', id: u.leader.scope };
  if (seesSummary(uid)) return { kind: 'profile', id: u.profile };
  return null;
}
function periodStart(per) {
  const t = today();
  if (per === 'het') { let x = t; while (D.dow(x) !== 1) x = D.add(x, -1); return x; }
  if (per === 'honap') return t.slice(0, 8) + '01';
  if (per === 'negyedev') { const m = Number(t.slice(5, 7)), q = Math.floor((m - 1) / 3) * 3 + 1; return t.slice(0, 5) + (q < 10 ? '0' : '') + q + '-01'; }
  return t.slice(0, 5) + '01-01';
}
const periodNames = { het: 'ez a hét', honap: 'ez a hónap', negyedev: 'ez a negyedév', ev: 'az idei év' };
function inScope(c, sc) {
  if (sc.kind === 'klinika') return true;
  if (sc.kind === 'dept') return deptOfProfile(c.profileId) === sc.id;
  return c.profileId === sc.id;
}
function countArea(cases, tasks, from) {
  const z = () => ({ c: 0, t: 0 });
  const r = { open: z(), late: z(), unassigned: z(), waiting: z(), closed: z() };
  cases.forEach(c => {
    if (isOpen(c)) { r.open.c++; if (!c.owners.length) r.unassigned.c++; if (cat(c) === 'V') r.waiting.c++; }
    if (caseLate(c)) r.late.c++;
    if (c.closed && c.closed.at.slice(0, 10) >= from) r.closed.c++;
  });
  tasks.forEach(t => {
    if (taskOpen(t)) { r.open.t++; if (!t.owner) r.unassigned.t++; }
    if (taskLate(t)) r.late.t++;
    if (t.done && t.done.at.slice(0, 10) >= from) r.closed.t++;
  });
  return r;
}
function addCounts(a, b) { Object.keys(a).forEach(k => { a[k].c += b[k].c; a[k].t += b[k].t; }); return a; }
function summary(sc, per, type) {
  const from = periodStart(per), rows = [], ok = c => !type || c.type === type;
  const total = countArea([], [], from);
  Object.keys(cfg.departments).forEach(did => {
    if (sc.kind === 'dept' && sc.id !== did) return;
    const dsum = countArea([], [], from), prows = [];
    Object.keys(cfg.profiles).filter(pid => cfg.profiles[pid].dept === did).forEach(pid => {
      if (sc.kind === 'profile' && sc.id !== pid) return;
      const psum = countArea([], [], from), arows = [];
      cfg.areaOrder[pid].forEach(aid => {
        const cs = st.cases.filter(c => c.areaId === aid && ok(c));
        const ts = st.tasks.filter(t => { const c = Cs(t.caseId); return c && c.areaId === aid && ok(c); });
        const r = countArea(cs, ts, from); arows.push({ level: 'area', id: aid, name: areaName(aid), r }); addCounts(psum, r);
      });
      prows.push({ level: 'prof', id: pid, name: profileName(pid), r: psum, areas: arows }); addCounts(dsum, psum);
    });
    if (prows.length) { rows.push({ level: 'dept', id: did, name: cfg.departments[did].name, r: dsum, profiles: prows }); addCounts(total, dsum); }
  });
  const dutyOpen = sc.kind === 'klinika' && !type ? st.duty.filter(y => y.dir === 'to' && !y.closed) : [];
  return { rows, total, duty: { open: dutyOpen.length, late: dutyOpen.filter(dutyLate).length, unaccepted: dutyOpen.filter(y => !y.accepted).length }, from };
}
function m4ok(c, point) {
  if (!c.decidedAt || D.mins(c.decidedAt) > D.mins(point)) return false;
  return st.tasks.filter(x => x.caseId === c.id && D.mins(x.created.at) <= D.mins(point)).every(x => x.owner && x.due);
}
function closedByReason(sc, per, type) {
  const from = periodStart(per), out = {};
  st.cases.forEach(c => {
    if (!c.closed || c.closed.at.slice(0, 10) < from || !inScope(c, sc) || (type && c.type !== type)) return;
    const k = typeOf(c).name; out[k] = out[k] || {}; out[k][c.closed.reason] = (out[k][c.closed.reason] || 0) + 1;
  });
  return out;
}
function metrics(sc, per, type) {
  const from = periodStart(per), t = today();
  const cs = st.cases.filter(c => inScope(c, sc) && (!type || c.type === type));
  const m1 = cs.filter(c => c.type === 'engedely' && c.data.expiresOn && c.data.expiresOn >= from && c.data.expiresOn < t &&
    !(c.closed && c.closed.reason === 'okafogyott') && !st.cases.some(x => x.prev === c.id && x.created.at.slice(0, 10) <= c.data.expiresOn)).length;
  const ts = st.tasks.filter(x => { const c = Cs(x.caseId); return c && inScope(c, sc); });
  const m2 = cs.filter(c => isOpen(c) && !c.owners.length).length + ts.filter(x => taskOpen(x) && !x.owner).length;
  const openT = ts.filter(taskOpen), m3 = openT.length ? Math.round(100 * openT.filter(taskLate).length / openT.length) : 0;
  const disc = cs.filter(c => isMeet(c.type) && c.discussedAt && c.triage !== 'tudomásul' && c.discussedAt.slice(0, 10) >= from);
  /* A két munkanapos ponton rögzített állapot számít; a pont előtt (még futó határidőnél) az aktuális állapot */
  const timely = disc.filter(c => c.m4 ? c.m4.ok : m4ok(c, D.at(D.addWorkdays(c.discussedAt.slice(0, 10), 2), '23:59'))).length;
  return { m1, m2, m3, m4: disc.length ? Math.round(100 * timely / disc.length) : null, m4n: disc.length };
}

/* ---------------- Keresés és archívum (K10) ---------------- */
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function searchPatients(q, uid) {
  uid = uid || me(); const nq = norm(q.trim()), dq = q.replace(/\D/g, '');
  if (!nq) return [];
  return st.patients.filter(p => !p.merged && patientAccess(p.id, uid) !== 'none' &&
    (norm(p.name).indexOf(nq) > -1 || (dq.length > 1 && ((p.taj || '').indexOf(dq) > -1 || (p.temp || '').replace(/\D/g, '').indexOf(dq) > -1)) || (p.temp && norm(p.temp).indexOf(nq) > -1)));
}
function caseText(c) {
  const d = c.data || {}, parts = [caseTitle(c), c.decision, c.note, (c.labels || []).join(' ')];
  Object.keys(d).forEach(k => { if (typeof d[k] === 'string') parts.push(d[k]); });
  return norm(parts.join(' '));
}
function search(q) {
  const out = [];
  const nText = norm(q.text || ''), nPat = norm(q.patient || ''), dPat = (q.patient || '').replace(/\D/g, '');
  const from = q.period ? periodStartRel(q.period) : null;
  st.cases.forEach(c => {
    const acc = caseAccess(c); if (acc === 'none') return;
    const detail = acc === 'write' || acc === 'read';
    if (q.type && c.type !== q.type) return;
    if (q.state === 'open' && c.closed) return;
    if (q.state === 'closed' && !c.closed) return;
    if (q.reason && (!detail || !c.closed || c.closed.reason !== q.reason)) return;
    if (from) { const when = c.closed ? c.closed.at.slice(0, 10) : lastChange(c).slice(0, 10); if (when < from && c.created.at.slice(0, 10) < from) return; }
    if (nPat) {
      const p = P(c.patientId); if (!p) return;
      if (!(norm(p.name).indexOf(nPat) > -1 || (dPat.length > 1 && (p.taj || '').indexOf(dPat) > -1) || (p.temp && norm(p.temp).indexOf(nPat) > -1))) return;
    }
    if (nText) { if (!detail) return; if (caseText(c).indexOf(nText) === -1) return; }
    out.push({ c, acc });
  });
  return out.sort((a, b) => ((b.c.closed ? b.c.closed.at : lastChange(b.c)) > (a.c.closed ? a.c.closed.at : lastChange(a.c)) ? 1 : -1));
}
function periodStartRel(per) {
  const t = today();
  if (per === 'honap') return D.add(t, -31);
  if (per === 'negyedev') return D.add(t, -92);
  if (per === 'ev') return D.add(t, -366);
  return null;
}
/* A címkekészlet közös az egész klinikán; a találatokat a keresés szűri jogosultság szerint */
function usedLabels() {
  const set = {}; st.cases.forEach(c => (c.labels || []).forEach(l => { set[l] = 1; }));
  return Object.keys(set).sort((a, b) => a.localeCompare(b, 'hu'));
}
/* Az ügyeleti tételek visszakeresése (mindkét irány): a kiutaló, a forrásprofil tagjai, az ügyeleti csapat, illetve a címzett profil tagjai látják */
function dutyVisible(y, uid) {
  uid = uid || me(); const u = U(uid);
  if (!uid || mode() === 'leader') return false;
  if (y.by === uid) return true;
  if (y.dir === 'to') return !!u.duty || isMember(uid, y.profileId);
  return isMember(uid, y.profileId) || !!u.duty;
}
function searchDuty(q) {
  const nText = norm(q.text || ''), nPat = norm(q.patient || ''), dPat = (q.patient || '').replace(/\D/g, '');
  const from = q.period ? periodStartRel(q.period) : null;
  return st.duty.filter(y => {
    if (!dutyVisible(y)) return false;
    if (q.state === 'open' && y.closed) return false;
    if (q.state === 'closed' && !y.closed) return false;
    if (from && (y.closed ? y.closed.at : y.at).slice(0, 10) < from) return false;
    if (nText && norm(y.text + ' ' + (y.note || '')).indexOf(nText) === -1) return false;
    if (nPat) { const p = P(y.patientId); if (!p || !(norm(p.name).indexOf(nPat) > -1 || (dPat.length > 1 && (p.taj || '').indexOf(dPat) > -1) || (p.temp && norm(p.temp).indexOf(nPat) > -1))) return false; }
    return true;
  }).sort((a, b) => ((b.closed ? b.closed.at : b.at) > (a.closed ? a.closed.at : a.at) ? 1 : -1));
}

/* ---------------- Tranzakció és visszavonás ---------------- */
let cur = null, txSeq = 0;
const txs = {};
function newId(prefix) { st.seq = (st.seq || 100) + 1; return prefix + st.seq; }
function touch(coll, obj) { if (!cur || !obj) return; if (cur.ch.some(x => x.coll === coll && x.id === obj.id)) return; cur.ch.push({ coll, id: obj.id, before: clone(obj) }); }
/* Egy állapot-objektum (a lépésnevek) pillanatképe a visszavonáshoz */
function snap(key) { if (!cur || cur.ch.some(x => x.obj === key)) return; cur.ch.push({ obj: key, before: clone(st[key]) }); }
function mut(coll, obj, fn) { touch(coll, obj); fn(obj); obj.ver = (obj.ver || 1) + 1; return obj; }
function add(coll, obj) { obj.ver = 1; st[coll].push(obj); if (cur) cur.ch.push({ coll, id: obj.id, before: null }); return obj; }
function tx(label, fn) {
  cur = { id: 'x' + (++txSeq), label, ch: [] };
  let res;
  try { res = fn(); } catch (e) { cur = null; throw e; }
  const t = cur; cur = null;
  t.ch.forEach(x => { if (x.obj) { x.after = JSON.stringify(st[x.obj]); return; } const o = st[x.coll].find(y => y.id === x.id); x.afterVer = o ? o.ver : null; });
  txs[t.id] = t; applyState(); tick(); persist(); emit('tx');
  return { tx: t.id, res };
}
/* A visszavonás nem hagyhat árva hivatkozást (a prototípus bírálata, 3. pont): ha az ebben a lépésben létrehozott megbeszélésre, áreára vagy ügytípusra
   közben más már hivatkozik (ügy indult benne, változat került rá), a létrehozás nem vonható vissza */
function createdInUse(t) {
  const own = {}; t.ch.forEach(x => { if (x.before === null && !x.obj) own[x.coll + ':' + x.id] = 1; });
  const other = (coll, o) => !own[coll + ':' + o.id];
  return t.ch.some(x => {
    if (x.obj || x.before !== null) return false;
    const o = st[x.coll].find(y => y.id === x.id); if (!o) return false;
    if (x.coll === 'variants' || x.coll === 'series' || x.coll === 'types') { const k = x.coll === 'variants' ? o.type : o.id; return st.cases.some(c => c.type === k && other('cases', c)); }
    if (x.coll === 'areas') return st.cases.some(c => c.areaId === o.id && other('cases', c)) || st.variants.some(v => v.area === o.id && other('variants', v)) || st.types.some(y => y.area === o.id && other('types', y));
    return false;
  });
}
function undo(id) {
  const t = txs[id]; if (!t) return 'gone';
  for (const x of t.ch) { if (x.obj) { if (JSON.stringify(st[x.obj]) !== x.after) return 'conflict'; continue; } const o = st[x.coll].find(y => y.id === x.id); if (o && x.afterVer !== null && o.ver !== x.afterVer) return 'conflict'; }
  if (createdInUse(t)) return 'used';
  t.ch.slice().reverse().forEach(x => {
    if (x.obj) { st[x.obj] = clone(x.before); return; }
    const arr = st[x.coll], i = arr.findIndex(y => y.id === x.id);
    if (x.before === null) { if (i > -1) arr.splice(i, 1); return; }
    const r = clone(x.before); r.ver = (i > -1 ? arr[i].ver : r.ver) + 1;
    if (i > -1) arr[i] = r; else arr.push(r);
  });
  delete txs[id]; applyState(); audit('visszavonás', null, null, t.label); persist(); emit('undo');
  return 'ok';
}
function audit(act, pid, cid, detail, extra) { st.audit.push(Object.assign({ at: now(), by: me() || 'rendszer', mode: mode(), act, pid: pid || null, cid: cid || null, detail: detail || '' }, extra || {})); }
function hist(c, text, who) { c.history.push({ at: now(), by: who || me(), text }); }

/* ---------------- TAJ (K3.2; a próbában csupa azonos számjegy érvényes) ---------------- */
function checkTaj(raw) {
  const s = String(raw || '').replace(/[\s-]/g, '');
  if (!s) return { err: 'Írd be a TAJ-t, vagy jelöld, hogy a betegnek nincs TAJ-a.' };
  if (/\D/.test(s)) return { err: 'A TAJ csak számjegyekből állhat. Nézd meg újra a számot.' };
  if (s.length !== 9) return { err: 'A TAJ 9 számjegyből áll; most ' + s.length + ' számjegyet írtál.' };
  if (!/^(\d)\1{8}$/.test(s)) return { err: 'Ez a TAJ nem lehet helyes: az utolsó, ellenőrző számjegy nem egyezik. Valamelyik számjegy elírás lehet; nézd meg újra a kártyán.' };
  const ex = st.patients.find(p => p.taj === s && !p.merged);
  if (ex) return { taj: s, exists: ex };
  return { taj: s };
}

/* ---------------- Műveletek ---------------- */
const ops = {};
ops.createPatient = o => tx('Új beteg', () => {
  const uid = me(), prof = U(uid).profile, id = newId('p');
  let taj = null, temp = null;
  if (o.noTaj) temp = 'I-' + (999000 + st.seq);
  else taj = o.taj;
  add('patients', { id, taj, temp, tempReason: o.noTaj ? o.tempReason : '', name: (o.name || '').trim(), age: null, merged: null });
  add('cares', { id: 'g-' + id, patientId: id, profileId: prof, since: today(), doctor: isDoctor(uid) ? uid : null, dx: '', ended: null });
  audit('felvétel', id, null, taj ? 'TAJ-jal' : 'ideiglenes azonosítóval');
  return id;
});
ops.addCare = pid => tx('Gondozásba vétel', () => {
  const uid = me(), prof = U(uid).profile;
  if (!careIn(pid, prof)) add('cares', { id: 'g-' + pid + '-' + prof, patientId: pid, profileId: prof, since: today(), doctor: isDoctor(uid) ? uid : null, dx: '', ended: null });
  audit('gondozásba vétel', pid);
});
ops.setName = (pid, name) => tx('Név', () => { mut('patients', P(pid), p => { p.name = name.trim(); }); audit('név megadása', pid); });
ops.setTaj = (pid, taj) => tx('TAJ beírása', () => { mut('patients', P(pid), p => { p.taj = taj; }); audit('TAJ beírása', pid); });
/* Az összevonás ütköző mezői: mindkét rekordban kitöltött, eltérő értékek */
function mergeConflicts(aId, bId) {
  const A = P(aId), B = P(bId), out = [];
  if (A.name && B.name && A.name !== B.name) out.push({ k: 'name', label: 'Név', a: A.name, b: B.name });
  if (A.age && B.age && A.age !== B.age) out.push({ k: 'age', label: 'Életkor', a: A.age + ' éves', b: B.age + ' éves', av: A.age, bv: B.age });
  caresOf(aId).filter(g => !g.ended && isMember(me(), g.profileId)).forEach(ga => {
    const gb = caresOf(bId).find(g => !g.ended && g.profileId === ga.profileId); if (!gb) return;
    if (ga.doctor && gb.doctor && ga.doctor !== gb.doctor) out.push({ k: 'doctor:' + ga.profileId, label: 'Kezelőorvos (' + profileName(ga.profileId) + ')', a: U(ga.doctor).name, b: U(gb.doctor).name, av: ga.doctor, bv: gb.doctor });
    if (ga.dx && gb.dx && ga.dx !== gb.dx) out.push({ k: 'dx:' + ga.profileId, label: 'Fő diagnózis (' + profileName(ga.profileId) + ')', a: ga.dx, b: gb.dx });
  });
  return out;
}
function mergeBlocked(aId, bId) {
  const A = P(aId), B = P(bId);
  if (A.taj && B.taj && A.taj !== B.taj) return 'A két rekordnak eltérő TAJ-a van; ez két különböző beteg.';
  if (openAdmission(aId) && openAdmission(bId)) return 'Mindkét rekordnak nyitott felvétele van. Előbb az egyiket le kell zárni (hazabocsátás), utána vonható össze.';
  return '';
}
ops.merge = (keepId, goneId, choice) => {
  if (mergeBlocked(keepId, goneId)) return { blocked: mergeBlocked(keepId, goneId) };
  choice = choice || {};
  return tx('Összevonás', () => {
  const keep = P(keepId), gone = P(goneId), pick = (k, a, b) => choice[k] === 'b' ? b : choice[k] === 'a' ? a : (a || b);
  mut('patients', keep, p => { p.name = pick('name', p.name, gone.name); p.taj = p.taj || gone.taj; if (p.taj) p.temp = p.temp || gone.temp; p.tempReason = p.taj ? '' : p.tempReason; p.age = pick('age', p.age, gone.age); });
  mut('patients', gone, p => { p.merged = keepId; });
  caresOf(goneId).forEach(g => {
    const same = careIn(keepId, g.profileId);
    /* A saját profil gondozásánál a kijelölt munkatárs választ; más profil gondozásában a meglévő érték nem íródik felül, csak az üres töltődik */
    const ownP = isMember(me(), g.profileId), val = (k, a, b) => ownP ? pick(k, a, b) : (a || b);
    if (same) { mut('cares', same, x => { x.since = x.since < g.since ? x.since : g.since; x.doctor = val('doctor:' + g.profileId, x.doctor, g.doctor); x.dx = val('dx:' + g.profileId, x.dx, g.dx); }); mut('cares', g, x => { x.patientId = keepId; x.ended = { on: today(), reason: 'összevonva' }; }); }
    else mut('cares', g, x => { x.patientId = keepId; });
  });
  st.cases.filter(c => c.patientId === goneId).forEach(c => mut('cases', c, x => { x.patientId = keepId; hist(x, 'A betegrekord összevonásával átkerült ide'); }));
  st.appearances.filter(a => a.patientId === goneId).forEach(a => mut('appearances', a, x => { x.patientId = keepId; }));
  st.duty.filter(y => y.patientId === goneId).forEach(y => mut('duty', y, x => { x.patientId = keepId; }));
  audit('összevonás', keepId, null, 'összevont rekordok: ' + patientId(gone) + ' → ' + patientId(keep));
  });
};

/* Az új bejelentés a legközelebbi, még meg nem tartott alkalomra kerül; a bejelentő áthelyezheti (a tervbírálat szerint).
   Kéthetente a sorozat első alkalmától számolunk (anchor). */
function nextMeeting(seriesKey, from) {
  const s = cfg.series[seriesKey]; let d = D.nextDow(from || today(), s.dow, true);
  if (s.every > 1 && s.anchor) { let i = 0; while (((D.diff(d, s.anchor) / 7) % s.every + s.every) % s.every !== 0 && i++ < 8) d = D.add(d, 7); }
  return d;
}
function meetingsAhead(seriesKey, n) { const s = cfg.series[seriesKey], out = []; let d = nextMeeting(seriesKey); for (let i = 0; i < (n || 4); i++) { out.push(d); d = D.add(d, 7 * (s.every || 1)); } return out; }
function meetingDeadline(seriesKey, day) { return D.at(D.prevWorkday(day), cfg.series[seriesKey].deadline); }
function missingFields(c) {
  if (!isMeet(c.type)) return [];
  const d = c.data || {}, m = [];
  if (!d.question) m.push('kérdés');
  if (flowOf(c.type) !== 'd2t' && !d.region) m.push('régió vagy terület');
  if (!d.summary) m.push('rövid összefoglaló');
  if (!(c.his || []).length) m.push('HIS-hivatkozás');
  return m;
}
function areaFor(type, profileId, uid) {
  if (type === 'altalanos') { const mine = cfg.areaOrder[profileId].find(a => cfg.areas[a].members.indexOf(uid) > -1); return mine || cfg.defaultArea[profileId].altalanos; }
  return cfg.defaultArea[profileId][type];
}
const t0 = type => cfg.types[type];
/* Az új ügy; a kapcsolt ügy indításakor is ez fut (o.rel: a kiinduló ügy és a fajta; o.relate: a bejelentés „Hivatkozás egy másik ügyre” mezője) */
function createCaseRaw(o) {
  const uid = me(), prof = o.profile || U(uid).profile, type = o.type, id = newId('k');
  const area = o.area || areaFor(type, prof, uid), a = cfg.areas[area];
  /* Az új ügy az área alapértelmezett felelősét kapja; ha nincs, felelős nélkül marad (a bírálat 1. pontja).
     A megbeszélésre bejelentett esetért a bejelentő felel (A fejezet, 6. rész). */
  let owners = o.owners && o.owners.length ? o.owners.slice() : (a && a.owner ? [a.owner] : (t0(type).meeting ? [uid] : []));
  if (type === 'atadas' && o.data && o.data.coordinator) owners = [o.data.coordinator];
  if (o.noOwner) owners = [];
  const watchers = [];
  if (type === 'vizsgalat' && isDoctor(uid) && owners.indexOf(uid) === -1) watchers.push(uid);
  /* Aki másnak ad ügyet, figyelőként követi; a változást a „Figyelt ügyeim” között látja, külön értesítés nélkül */
  if (o.watchSelf && owners.indexOf(uid) === -1 && watchers.indexOf(uid) === -1) watchers.push(uid);
  (o.watchers || []).forEach(w => { if (w && owners.indexOf(w) === -1 && watchers.indexOf(w) === -1) watchers.push(w); });
  const pid = o.patientId || null;
  const adm = pid ? openAdmission(pid) : null;
  let appearance = null, started = adm ? 'fekvő' : 'járó', note = '';
  if (pid && o.appearance === 'adm' && !adm) {
    appearance = newId('a'); started = 'fekvő'; note = '; a felvétellel együtt rögzítve';
    add('appearances', { id: appearance, patientId: pid, profileId: prof, kind: 'adm', start: today(), end: null, caseId: id, place: profileName(prof) + ', ' + cfg.departments[cfg.profiles[prof].dept].name });
  } else if (pid && o.appearance === 'visit') {
    appearance = newId('a'); note = '; az ambuláns vizittel együtt rögzítve';
    add('appearances', { id: appearance, patientId: pid, profileId: prof, kind: 'visit', start: today(), end: null, caseId: id, place: profileName(prof) });
  } else if (adm) appearance = adm.id;
  const t = cfg.types[type];
  const step = o.step || t.steps[0].id;
  const c = {
    id, patientId: pid, profileId: prof, areaId: area, type, title: o.title || '', step, owners, watchers, due: o.due || null,
    his: o.his || [], startedAs: started, appearanceId: appearance, data: o.data || {}, note: o.note || '', prev: o.prev || null,
    closed: null, waitSince: stepDef({ type }, step) && stepDef({ type }, step).cat === 'V' ? today() : null, created: { at: now(), by: uid },
    history: [], contacts: [], files: [], labels: [], meeting: t.meeting ? (o.meeting || nextMeeting(t.meeting)) : null, triage: t.meeting ? 'megbeszéljük' : null,
    decision: '', participants: [], discussedAt: null, decidedAt: null
  };
  c.history.push({ at: now(), by: uid, text: (o.initial ? 'Felvéve a tényleges lépésben (kezdő feltöltés): ' : o.histText ? o.histText + '; lépés: ' : 'Felvéve, lépés: ') + stepLabel(c, step) + note });
  add('cases', c);
  if (o.rel) add('rels', { id: newId('l'), kind: o.rel.kind, from: o.rel.from, to: id, at: now(), by: uid });
  const other = o.relate ? Cs(o.relate) : null;
  if (other && ['write', 'read'].indexOf(caseAccess(other)) > -1) add('rels', { id: newId('l'), kind: 'kapcsolodik', from: id, to: other.id, at: now(), by: uid });
  audit('új ügy', pid, id, t.name);
  return id;
}
ops.createCase = o => tx('Új ügy', () => createCaseRaw(o));
/* Lépésváltás; a lépések között nincs kötött átmenet (K4.4) */
ops.step = (id, stepId, extra) => tx('Lépés', () => {
  const c = Cs(id), before = cat(c), oldStep = c.step;
  mut('cases', c, x => {
    x.step = stepId;
    const nc = cat(x);
    if (nc === 'V' && (before !== 'V' || oldStep !== stepId)) x.waitSince = today();
    if (nc !== 'V') x.waitSince = null;
    if (extra && extra.data) Object.assign(x.data, extra.data);
    if (extra && extra.his) x.his.push(extra.his);
    if (stepId === 'dok' && !x.discussedAt && flowOf(x.type) === 'konz') x.discussedAt = now();
    hist(x, 'Lépés: ' + stepLabel(x, stepId) + (extra && extra.text ? ' (' + extra.text + ')' : ''));
  });
  if (extra && extra.contact) addContactRaw(c, extra.contact);
  if (c.type === 'engedely' && stepId === 'erv' && c.prev) {
    const old = Cs(c.prev);
    if (old && !old.closed) mut('cases', old, x => { x.closed = { reason: 'megújítva', at: now(), by: me() }; hist(x, 'Lezárva: megújítva (az új engedély érvénybe lépett)'); });
  }
  audit('lépés', c.patientId, id, stepLabel(c, stepId));
});
ops.close = (id, reason, extra) => tx('Lezárás', () => {
  const c = Cs(id);
  mut('cases', c, x => {
    if (extra && extra.his) x.his.push(extra.his);
    if (extra && extra.data) Object.assign(x.data, extra.data);
    x.closed = { reason, at: now(), by: me() };
    /* A saját ügytípus „lezárt” kategóriájú lépése: a lezárás oka ugyanúgy kötelező (K4.6), a lépés neve a lépéssáv végére kerül */
    if (extra && extra.step) x.closed.step = extra.step;
    hist(x, 'Lezárva: ' + reason + (extra && extra.step ? ' (' + stepLabel(x, extra.step) + ')' : ''));
  });
  if (extra && extra.contact) addContactRaw(c, extra.contact);
  if (c.type === 'atadas' && reason === 'teljesült') {
    const g = careIn(c.patientId, c.profileId);
    if (g && !g.ended) mut('cares', g, x => { x.ended = { on: today(), reason: 'felnőtt ellátásba adva' }; });
  }
  audit('lezárás', c.patientId, id, reason);
});
/* Felelős csak a profil aktív tagja maradhat: a profilból kikerült munkatárs az újranyitott vagy továbbvitt ügyön nem felelős,
   így az ügy szükség esetén a „Felelős nélkül” részbe kerül (a prototípus bírálata, 4. pont) */
const activeOwners = c => c.owners.filter(o => U(o).profile === c.profileId);
ops.reopen = id => tx('Újranyitás', () => {
  const c = Cs(id), gone = c.owners.filter(o => U(o).profile !== c.profileId);
  mut('cases', c, x => { x.closed = null; x.owners = activeOwners(x); hist(x, 'Újranyitva' + (gone.length ? '; ' + gone.map(uname).join(', ') + ' már nem tagja a profilnak, ezért nem felelős' + (x.owners.length ? '' : ', az ügy felelős nélkül áll') : '')); });
  audit('újranyitás', c.patientId, id);
});
ops.renew = id => tx('Hosszabbítás', () => {
  const c = Cs(id), nid = newId('k');
  const d = Object.assign({}, c.data, { reqType: 'hosszabbítás', sentOn: '', decidedOn: '', expiresOn: '', prevExpires: c.data.expiresOn || '' });
  add('cases', Object.assign(clone(c), { id: nid, step: 'elok', data: d, prev: id, closed: null, waitSince: null, created: { at: now(), by: me() }, owners: activeOwners(c),
    history: [{ at: now(), by: me(), text: 'Hosszabbítás indítva az előző engedélyből; lépés: előkészítendő' }], contacts: [], files: [], labels: c.labels.slice(),
    ver: 1, his: [], due: null, appearanceId: null, note: '', startedAs: openAdmission(c.patientId) ? 'fekvő' : 'járó' }));
  add('rels', { id: newId('l'), kind: 'hosszabbitas', from: id, to: nid, at: now(), by: me() });
  mut('cases', c, x => { hist(x, 'Hosszabbítás indult'); });
  audit('hosszabbítás', c.patientId, nid);
  return nid;
});
ops.newRequestFrom = id => tx('Új kérelem', () => {
  const c = Cs(id), nid = newId('k');
  const d = c.type === 'vizsgalat' ? { exam: c.data.exam, region: c.data.region, anesthesia: c.data.anesthesia } : Object.assign({}, c.data, { sentOn: '', decidedOn: '', expiresOn: '' });
  add('cases', { id: nid, patientId: c.patientId, profileId: c.profileId, areaId: c.areaId, type: c.type, title: c.title, step: cfg.types[c.type].steps[0].id,
    owners: activeOwners(c), watchers: c.watchers.slice(), due: null, his: [], startedAs: openAdmission(c.patientId) ? 'fekvő' : 'járó', appearanceId: null, data: d, note: '',
    prev: null, closed: null, waitSince: null,
    created: { at: now(), by: me() }, history: [{ at: now(), by: me(), text: 'Új kérelem az előzőre hivatkozva; lépés: ' + cfg.types[c.type].steps[0].label }],
    contacts: [], files: [], labels: (c.labels || []).slice(), meeting: null, triage: null, decision: '', participants: [], discussedAt: null, decidedAt: null });
  add('rels', { id: newId('l'), kind: c.type === 'vizsgalat' ? 'ujeloj' : 'ujkerelem', from: id, to: nid, at: now(), by: me() });
  mut('cases', c, x => { hist(x, c.type === 'vizsgalat' ? 'Új előjegyzés indult' : 'Új kérelem indult'); });
  audit('új kérelem', c.patientId, nid);
  return nid;
});
ops.update = (id, patch, baseVer) => {
  const c = Cs(id);
  if (baseVer && c.ver !== baseVer) return { conflict: true, current: clone(c) };
  return tx('Adatok', () => {
    mut('cases', c, x => {
      if (patch.data) Object.assign(x.data, patch.data);
      ['due', 'owners', 'watchers', 'title', 'note', 'meeting'].forEach(k => { if (patch[k] !== undefined) x[k] = patch[k]; });
      if (patch.meeting && x.meeting && ['nap'].indexOf(x.step) > -1 && D.mins(now()) < D.mins(meetingDeadline(typeOf(x).meeting, x.meeting))) x.step = typeOf(x).steps[0].id;
      if (patch.hisAdd) x.his.push(patch.hisAdd);
      hist(x, patch.text || 'Adatok módosítva');
    });
    audit('módosítás', c.patientId, id, patch.text || '');
  });
};
ops.decide = (id, o, baseVer) => {
  const c = Cs(id);
  if (baseVer && c.ver !== baseVer && (c.decision || '') !== (o.baseText || '')) return { conflict: true, current: clone(c) };
  return tx('Döntés', () => {
    mut('cases', c, x => {
      x.decision = o.decision; x.decidedAt = now(); x.discussedAt = x.discussedAt || now();
      if (o.participants) x.participants = o.participants;
      hist(x, 'Döntés rögzítve' + (o.tasks && o.tasks.length ? ', ' + o.tasks.length + ' teendővel' : ', teendő nélkül'));
    });
    /* A teendősor „Kapcsolt ügy indul belőle” mezője: ugyanaz történik, mint a teendő menüjéből, csak egyszerre (a terv 3.4) */
    (o.tasks || []).forEach(r => {
      const tid = newId('t');
      add('tasks', { id: tid, caseId: c.id, text: r.text, owner: r.owner || null, due: r.due || null, done: null, created: { at: now(), by: me() }, spawned: null, note: '' });
      if (!r.spawn || spawnTypes(c.profileId).indexOf(r.spawn) === -1) return;
      const ty = r.spawn, g = careIn(c.patientId, c.profileId), ao = (cfg.areas[areaFor(ty, c.profileId, me())] || {}).owner || null;
      const data = ty === 'engedely' ? { indication: g ? g.dx : '', reqType: 'új' } : ty === 'vizsgalat' ? { exam: 'MR', region: c.data.region || '' } : {};
      spawnRaw(Tk(tid), c, { type: ty, title: titleFromTask(ty) ? r.text : '', due: r.due || null, owners: r.owner ? [r.owner] : ao ? [ao] : [], data,
        watchers: ty === 'vizsgalat' && c.owners[0] ? [c.owners[0]] : [] });
    });
    const hasTasks = st.tasks.some(t => t.caseId === c.id && !t.done), spawnedAll = (o.tasks || []).length > 0;
    if (hasTasks) mut('cases', c, x => { x.step = flowOf(c.type) === 'd2t' ? 'eld' : 'ten'; });
    else mut('cases', c, x => { x.closed = { reason: 'teljesült', at: now(), by: me() }; hist(x, 'Lezárva: ' + (flowOf(c.type) === 'd2t' ? 'teljesült' : 'elintézve') + (spawnedAll ? ' (minden teendőből kapcsolt ügy lett)' : ' (teendő nélkül)')); });
    audit('döntés', c.patientId, id);
  });
};
ops.acknowledge = id => tx('Tudomásul vétel', () => {
  const c = Cs(id);
  mut('cases', c, x => { x.discussedAt = x.discussedAt || now(); x.closed = { reason: 'teljesült', at: now(), by: me() }; hist(x, 'Tudomásul vették; lezárva: elintézve'); });
  audit('tudomásul vétel', c.patientId, id);
});
ops.triage = (id, val) => tx('Előszűrés', () => { const c = Cs(id); mut('cases', c, x => { x.triage = val; hist(x, 'Előszűrés: ' + (val === 'tudomásul' ? 'csak tudomásul vesszük' : 'megbeszéljük')); }); });
ops.addTask = (caseId, o) => tx('Új teendő', () => {
  const id = newId('t'); add('tasks', { id, caseId, text: o.text, owner: o.owner || null, due: o.due || null, done: null, created: { at: now(), by: me() }, spawned: null, note: '' });
  const c = Cs(caseId); if (c) { mut('cases', c, x => { hist(x, 'Új teendő: ' + o.text); }); if (flowOf(c.type) === 'konz' && c.step === 'dok') mut('cases', c, x => { x.step = 'ten'; }); }
  audit('új teendő', c ? c.patientId : null, caseId, o.text);
  return id;
});
/* A konzíliumi és a D2T-eset akkor zárul, amikor minden teendője kész (a kapcsolt üggyé lett teendő is kész) */
function autoClose(c) {
  if (((flowOf(c.type) === 'konz' && c.step === 'ten') || (flowOf(c.type) === 'd2t' && c.step === 'eld')) && !c.closed && st.tasks.filter(x => x.caseId === c.id).every(x => x.done))
    mut('cases', c, x => { x.closed = { reason: 'teljesült', at: now(), by: 'rendszer' }; hist(x, 'Minden teendő kész: az eset ' + (flowOf(c.type) === 'd2t' ? 'lezárult (teljesült)' : 'elintézve'), 'rendszer'); });
}
ops.closeTask = id => tx('Teendő kész', () => {
  const t = Tk(id), c = Cs(t.caseId);
  mut('tasks', t, x => { x.done = { at: now(), by: me() }; });
  if (c) { mut('cases', c, x => { hist(x, 'Teendő kész: ' + t.text); }); autoClose(c); }
  audit('teendő kész', c ? c.patientId : null, t.caseId, t.text);
});
/* Kapcsolt ügy egy teendőből (K4.11; a terv 3.4). Átkerül a beteg, a cím, a határidő és a felelős; az área az ügytípusé; aki indítja,
   figyelőként követi, ha nem ő viszi. Az engedély és az átadás címe a fő adatából jön (gyógyszer, fogadó intézmény), ezért ott a teendő szövege nem cím.
   CT 1. kérdésére a javasolt válasz: a teendő ezzel kész, „kapcsolt ügy lett belőle” jelöléssel; ha CT mást dönt, itt fordítható (a teendő nyitva marad). */
const SPAWN_CLOSES_TASK = true;
const titleFromTask = type => type !== 'engedely' && type !== 'atadas';
/* A teendőből indítható ügytípusok: a profil bekapcsolt ügytípusai; a döntés teendősorából megbeszélés nem, mert ahhoz alkalom is kell */
function spawnTypes(profileId, withMeetings) { return (cfg.newMenu[profileId] || []).map(m => m[0]).filter(t => withMeetings || !isMeet(t)); }
function spawnRaw(t, c, o) {
  const owners = (o.owners || []).filter(Boolean);
  const nid = createCaseRaw({ type: o.type, profile: c.profileId, patientId: c.patientId, title: o.title || '', due: o.due || null, owners, noOwner: !owners.length,
    watchSelf: true, watchers: o.watchers || [], data: o.data || {}, meeting: o.meeting || null, rel: { kind: 'ebbol', from: c.id }, histText: 'Felvéve kapcsolt ügyként, a teendőből: „' + t.text + '”' });
  mut('tasks', t, x => { x.spawned = nid; if (SPAWN_CLOSES_TASK) x.done = { at: now(), by: me() }; });
  mut('cases', c, x => { hist(x, (SPAWN_CLOSES_TASK ? 'Teendő kész, kapcsolt ügy lett belőle: ' : 'Kapcsolt ügy indult a teendőből: ') + t.text); });
  return nid;
}
/* A tár is ellenőrzi (K9.11): a teendő a néző profiljáé és nyitott, még nem indult belőle ügy, és az ügytípus a profilban be van kapcsolva */
ops.spawnFromTask = (tid, o) => {
  const t = Tk(tid), c = t ? Cs(t.caseId) : null;
  if (!t || !c || t.done || t.spawned || taskAccess(t) !== 'write' || !o || spawnTypes(c.profileId, true).indexOf(o.type) === -1) return { denied: true };
  return tx('Kapcsolt ügy', () => { const nid = spawnRaw(t, c, o); autoClose(c); return nid; });
};
/* Meglévő ügy kapcsolása (a terv 3.5): egyenrangú kapcsolat, szabad szöveg nélkül. Csak a saját ügyhöz, és csak olyan ügy, amelyet a néző részletesen láthat */
ops.relate = (aId, bId) => {
  const a = Cs(aId), b = Cs(bId);
  if (!a || !b || a.id === b.id || caseAccess(a) !== 'write' || ['write', 'read'].indexOf(caseAccess(b)) === -1 || relBetween(a.id, b.id)) return { denied: true };
  return tx('Kapcsolás', () => {
    add('rels', { id: newId('l'), kind: 'kapcsolodik', from: a.id, to: b.id, at: now(), by: me() });
    mut('cases', a, x => { hist(x, 'Kapcsolva: ' + caseTitle(b)); });
    audit('kapcsolás', a.patientId, a.id, caseTitle(b));
  });
};
ops.assignTask = (id, owner) => tx('Teendő felelőse', () => { const t = Tk(id); mut('tasks', t, x => { x.owner = owner; }); });
ops.takeCase = id => tx('Elvállalás', () => { const c = Cs(id); mut('cases', c, x => { x.owners = [me()]; hist(x, 'Elvállalta'); }); });
function addContactRaw(c, o) { mut('cases', c, x => { x.contacts.push({ at: o.at || now(), by: me(), whom: o.whom, how: o.how, note: o.note || '', after: !!o.after }); hist(x, 'Kapcsolatfelvétel: ' + o.whom + ', ' + o.how); }); }
ops.addContact = (id, o) => tx('Kapcsolatfelvétel', () => { addContactRaw(Cs(id), o); audit('kapcsolatfelvétel', Cs(id).patientId, id); });
ops.attach = (id, name) => tx('Csatolmány', () => { const c = Cs(id); mut('cases', c, x => { x.files.push({ name, at: now(), by: me() }); hist(x, 'Csatolva: ' + name); }); audit('csatolás', c.patientId, id, name); });
ops.openFile = (id, name) => { const c = Cs(id); audit('csatolmány', c.patientId, id, name); persist(); };
ops.addLabel = (id, label) => tx('Címke', () => { const c = Cs(id); mut('cases', c, x => { if (x.labels.indexOf(label) === -1) x.labels.push(label); hist(x, 'Címke: ' + label); }); });
ops.removeLabel = (id, label) => tx('Címke törlése', () => { const c = Cs(id); mut('cases', c, x => { x.labels = x.labels.filter(l => l !== label); hist(x, 'Címke törölve: ' + label); }); });
ops.assignDuty = o => tx('Kiutalás', () => {
  const id = newId('y');
  add('duty', { id, dir: 'to', patientId: o.patientId || null, profileId: o.profileId || U(me()).profile, caseId: o.caseId || null, text: o.text, due: o.due, by: me(), at: now(), accepted: null, note: '', closed: null });
  audit('kiutalás az ügyeletnek', o.patientId, o.caseId, o.text, { did: id, prof: o.profileId || U(me()).profile });
  return id;
});
function wardProfiles(pid) {
  const adm = openAdmission(pid), live = caresOf(pid).filter(g => !g.ended).map(g => g.profileId);
  const list = adm && live.indexOf(adm.profileId) === -1 ? [adm.profileId].concat(live) : live;
  return { list, def: adm ? adm.profileId : list[0] };
}
ops.leaveForWard = o => tx('Tétel az osztálynak', () => {
  const id = newId('y'), prof = o.profileId || wardProfiles(o.patientId).def;
  add('duty', { id, dir: 'from', patientId: o.patientId, profileId: prof, caseId: null, text: o.text, due: o.due || null, by: me(), at: now(), accepted: null, note: '', closed: null });
  audit('tétel az osztálynak', o.patientId, null, o.text, { did: id, prof });
  return id;
});
ops.acceptDuty = id => tx('Átvétel', () => { mut('duty', Dy(id), y => { y.accepted = { by: me(), at: now() }; }); audit('ügyeleti tétel átvétele', Dy(id).patientId, null, Dy(id).text, { did: id, prof: Dy(id).profileId }); });
ops.closeDuty = (id, note) => tx('Ügyeleti tétel lezárása', () => {
  mut('duty', Dy(id), y => { if (note) y.note = note; if (!y.accepted) y.accepted = { by: me(), at: now() }; y.closed = { by: me(), at: now() }; });
  audit('ügyeleti tétel lezárása', Dy(id).patientId, null, Dy(id).text, { did: id, prof: Dy(id).profileId });
});
ops.discharge = pid => tx('Hazabocsátás', () => { const a = openAdmission(pid); mut('appearances', a, x => { x.end = today(); }); audit('hazabocsátás', pid, null, '', { prof: a.profileId }); });
ops.setAbsence = o => tx('Távollét', () => {
  st.absences.filter(a => a.user === me()).forEach(a => { touch('absences', a); st.absences.splice(st.absences.indexOf(a), 1); });
  add('absences', { id: newId('h'), user: me(), from: o.from, to: o.to, deputy: o.deputy });
  audit('távollét', null, null, o.from + '–' + o.to);
});
ops.clearAbsence = () => tx('Távollét törlése', () => { st.absences.filter(a => a.user === me()).forEach(a => { touch('absences', a); st.absences.splice(st.absences.indexOf(a), 1); }); });
ops.saveView = (name, spec) => tx('Saját nézet', () => { add('views', { id: newId('n'), user: me(), name, spec }); });
ops.deleteView = id => tx('Nézet törlése', () => { const v = st.views.find(x => x.id === id); touch('views', v); st.views.splice(st.views.indexOf(v), 1); });
ops.rename = (profileId, type, stepId, label) => { if (!isAdminOf(me(), profileId)) return { denied: true }; st.renames[profileId + ':' + type + ':' + stepId] = label; audit('lépés átnevezése', null, null, type + ': ' + label); persist(); emit('tx'); };
/* Ügytípus-szerkesztő (K4.17): a profil adminja hoz létre ügytípust; minden lépés pontosan egy kategóriába tartozik (K4.3) */
/* A tár ugyanazt ellenőrzi, mint a felület (a prototípus bírálata, 7. pont): név; a profil saját áreája; minden lépésnek neve és kategóriája van,
   a várakozónál a címzett a K4.5 listájából; legalább egy lépés nem lezárt (ebben indul az új ügy) */
function typeError(o) {
  const cats = cfg.cats.map(c => c[0]), steps = Array.isArray(o.steps) ? o.steps : [];
  if (!String(o.name || '').trim()) return 'Az ügytípusnak neve kell.';
  if (!o.area || !cfg.areas[o.area] || cfg.areas[o.area].profile !== o.profile) return 'Az área a profil saját áreája legyen.';
  if (!steps.length) return 'Adj meg legalább egy lépést, a kategóriájával.';
  if (steps.some(s => !String(s.label || '').trim())) return 'Minden lépésnek neve kell.';
  if (steps.some(s => cats.indexOf(s.cat) === -1)) return 'Kategória nélkül a lépés nem menthető.';
  if (steps.some(s => s.cat === 'V' && cfg.waitFor.indexOf(s.wait) === -1)) return 'A várakozó lépésnél meg kell adni, kire várunk.';
  if (!steps.some(s => s.cat !== 'L')) return 'Kell legalább egy lépés, amely nem lezárt: ebben indul az új ügy.';
  return '';
}
ops.createType = o => {
  if (!isAdminOf(me(), o.profile)) return { denied: true };
  const err = typeError(o); if (err) return { denied: true, err };
  return tx('Új ügytípus', () => {
    const id = newId('u');
    add('types', { id, profile: o.profile, name: String(o.name).trim(), area: o.area, created: { at: now(), by: me() },
      steps: o.steps.map((s, i) => Object.assign({ id: 's' + (i + 1), label: String(s.label).trim(), cat: s.cat }, s.cat === 'V' ? { wait: s.wait } : {})) });
    audit('ügytípus létrehozása', null, null, o.name + ': ' + o.steps.map(s => s.label + ' (' + catWord[s.cat] + ')').join(', '), { prof: o.profile, tid: id });
    return id;
  });
};
/* Önregisztráció (K9.13): a kérés a kért profil adminjához, osztályvezetői, főnővéri és vezetői szerepkörnél a fő adminhoz kerül.
   A tár is ellenőrzi a címet: csak @semmelweis.hu végű, egyedi cím (ez a belépési név). */
ops.register = o => {
  const err = checkMail(o.email); if (err) return { denied: true, err };
  return tx('Regisztráció', () => {
    const id = newId('r');
    add('accounts', { id, name: o.name, email: String(o.email).trim().toLowerCase(), req: { role: o.role, profile: o.profile || null, dept: o.dept || null }, status: 'pending', at: now(), decided: null });
    audit('regisztráció', null, null, o.name + ', ' + o.role + (o.profile ? ', ' + profileName(o.profile) : o.dept ? ', ' + cfg.departments[o.dept].name : ''), { by: id, prof: o.profile || null, uid: id });
    return id;
  });
};
function canDecide(uid, a) { return isMainAdmin(uid) ? toMainAdmin(a.req.role) : !toMainAdmin(a.req.role) && isAdminOf(uid, a.req.profile); }
ops.decideRequest = (id, ok, role) => {
  const a = account(id);
  if (!a || a.status !== 'pending' || !canDecide(me(), a)) return { denied: true };
  /* A profil adminja a jóváhagyáskor sem adhat a fő admin hatáskörébe tartozó szerepkört (K9.12) */
  if (ok && role && !isMainAdmin(me()) && toMainAdmin(role)) return { denied: true };
  return tx(ok ? 'Jóváhagyás' : 'Elutasítás', () => {
    const r = ok ? (role || a.req.role) : null;
    mut('accounts', a, x => { x.status = ok ? 'approved' : 'rejected'; x.decided = { by: me(), at: now(), role: r }; });
    audit(ok ? 'regisztráció jóváhagyása' : 'regisztráció elutasítása', null, null, a.name + (ok ? ', ' + r : ''), { prof: a.req.profile || null, uid: id });
  });
};
/* Adminjog (K9.12): a profilban csak az osztályvezető adja */
ops.grantAdmin = (uid, profileId) => {
  if (!canGrant(me(), profileId) || isAdminOf(uid, profileId) || U(uid).profile !== profileId) return { denied: true };
  return tx('Adminjog', () => {
    add('admins', { id: newId('m'), user: uid, profile: profileId, by: me(), at: now() });
    audit('adminjog adása', null, null, uname(uid) + ', ' + profileName(profileId), { prof: profileId, uid });
  });
};
/* ---------------- A profil beállításai a felületen (CT döntése, 2026-11-19) ----------------
   Áreák, a hat általános ügytípus változatai, megbeszélések, közös nézetek, emlékeztetők, tagok, kijelölt feladatkörök.
   Mindegyik a profil adminjáé (K9.9, K9.12); a tár is ellenőrzi, naplózza (ki, mikor, mit), és 10 másodpercig visszavonható. */
const adminOk = profileId => isAdminOf(me(), profileId);
const membersOf = profileId => Object.keys(cfg.users).filter(k => cfg.users[k].profile === profileId);
const vrec = (profileId, type) => st.variants.find(v => v.profile === profileId && v.type === type) || null;
function upsertMember(uid, patch) { const m = st.members.find(x => x.id === uid); if (m) mut('members', m, x => { Object.assign(x, patch); }); else add('members', Object.assign({ id: uid, role: null, removed: null }, patch)); }
function stepBase(type, sid) { const t = cfg.types[type]; if (!t) return null; const s = t.steps.find(x => x.id === sid) || (t.closeSteps || []).find(x => x.id === sid); return s ? s.label : null; }
/* A lépések neve (K4.2): a kategória kötött; az alapnévre visszaírt név törli az átnevezést */
function renameSteps(profileId, type, labels) {
  const changed = [];
  Object.keys(labels || {}).forEach(sid => {
    const k = profileId + ':' + type + ':' + sid, base = stepBase(type, sid), want = (labels[sid] || '').trim(), now0 = st.renames[k] || base;
    if (!base || want === now0 || (!want && !st.renames[k])) return;
    snap('renames'); if (!want || want === base) delete st.renames[k]; else st.renames[k] = want; changed.push((want || base));
  });
  return changed;
}
ops.createArea = o => {
  if (!adminOk(o.profile)) return { denied: true };
  return tx('Új área', () => {
    const id = newId('ar'), members = uniq((o.members || []).concat([o.owner, o.deputy]));
    add('areas', { id, profile: o.profile, name: o.name, owner: o.owner || null, deputy: o.deputy || null, members, hide: [] });
    audit('área létrehozása', null, null, o.name + ': tagok: ' + (members.map(uname).join(', ') || 'nincs') + '; felelős: ' + (o.owner ? uname(o.owner) : 'nincs') + '; helyettes: ' + (o.deputy ? uname(o.deputy) : 'nincs'), { prof: o.profile });
    return id;
  });
};
ops.saveArea = (id, o) => {
  const a = st.areas.find(x => x.id === id); if (!a || !adminOk(a.profile)) return { denied: true };
  return tx('Área', () => {
    mut('areas', a, x => { x.name = o.name; x.owner = o.owner || null; x.deputy = o.deputy || null; x.members = uniq((o.members || []).concat([x.owner, x.deputy])); });
    audit('área módosítása', null, null, a.name + ': tagok: ' + (a.members.map(uname).join(', ') || 'nincs') + '; felelős: ' + (a.owner ? uname(a.owner) : 'nincs') + '; helyettes: ' + (a.deputy ? uname(a.deputy) : 'nincs'), { prof: a.profile });
  });
};
/* Hová kerülnek az ügyei bekapcsoláskor: a változat korábbi áreája, ha még megvan, különben a profil első áreája.
   A gomb felirata és a művelet ugyanezt használja (a prototípus bírálata, 8. pont) */
function variantOnArea(profileId, type, area) {
  const v = vrec(profileId, type), ok = a => a && cfg.areas[a] && cfg.areas[a].profile === profileId;
  return ok(area) ? area : v && ok(v.area) ? v.area : cfg.areaOrder[profileId][0] || null;
}
/* Bekapcsolás az alapértékekkel: az ügyei a választott, ennek híján a változat korábbi, ennek híján a profil első áreájára kerülnek */
ops.setVariantOn = (profileId, type, on, area) => {
  const v = vrec(profileId, type); if (!v || !adminOk(profileId)) return { denied: true };
  return tx(on ? 'Bekapcsolás' : 'Kikapcsolás', () => {
    mut('variants', v, x => { x.on = !!on; if (on) x.area = variantOnArea(profileId, type, area); });
    audit(on ? 'ügytípus bekapcsolása' : 'ügytípus kikapcsolása', null, null, (v.name || cfg.types[type].name) + (on ? ': ' + areaName(v.area) : ''), { prof: profileId });
  });
};
/* A plusz adat használatban van, ha valamelyik ügyön ki van töltve (a prototípus bírálata, 6. pont): ilyenkor törlés helyett archiválódik,
   a régi ügyeken megmarad a neve és az értéke, új ügynél már nem jelenik meg */
function plusUsed(profileId, type, id) { return st.cases.some(c => c.profileId === profileId && c.type === type && c.data && c.data[id] !== undefined && c.data[id] !== null && c.data[id] !== ''); }
const plusText = list => { const on = list.filter(e => !e.archived).map(e => e.label), off = list.filter(e => e.archived).map(e => e.label); return 'plusz adatok: ' + (on.join(', ') || 'nincs') + (off.length ? '; archiválva: ' + off.join(', ') : ''); };
/* A változat: saját név, área, lépésnevek, vizsgálatlista, plusz adatok (K4.2); a kategória, a közös és a fő adatok kötöttek */
ops.saveVariant = (profileId, type, o) => {
  const v = vrec(profileId, type); if (!v || !adminOk(profileId)) return { denied: true };
  return tx('Változat', () => {
    const parts = [], p = {};
    if (o.name !== undefined && o.name !== v.name) { p.name = o.name; parts.push('név: ' + o.name); }
    if (o.area && o.area !== cfg.defaultArea[profileId][type]) { p.area = o.area; parts.push('área: ' + areaName(o.area)); }
    if (o.exams && o.exams.join('|') !== (v.exams || []).join('|')) { p.exams = o.exams.slice(); parts.push('vizsgálatok: ' + o.exams.join(', ')); }
    if (o.extra && JSON.stringify(o.extra) !== JSON.stringify(v.extra || [])) { p.extra = clone(o.extra); parts.push(plusText(o.extra)); }
    if (Object.keys(p).length) mut('variants', v, x => { Object.assign(x, p); });
    const rn = renameSteps(profileId, type, o.labels); if (rn.length) parts.push('lépésnevek: ' + rn.join(', '));
    if (parts.length) audit('változat módosítása', null, null, v.name + ': ' + parts.join('; '), { prof: profileId });
    return parts.length;
  });
};
/* A saját ügytípus lépéseinek neve (a létrehozás után csak ez változtatható) */
ops.renameTypeSteps = (profileId, type, labels) => {
  if (!adminOk(profileId)) return { denied: true };
  return tx('Lépésnevek', () => { const rn = renameSteps(profileId, type, labels); if (rn.length) audit('lépés átnevezése', null, null, cfg.types[type].name + ': ' + rn.join(', '), { prof: profileId }); return rn.length; });
};
/* Megbeszélés (K5.9): az esetmegbeszélés új változata a sorozatával együtt; a működés (konzílium vagy D2T) a felvételkor dől el */
ops.createMeeting = o => {
  if (!adminOk(o.profile)) return { denied: true };
  return tx('Új megbeszélés', () => {
    const key = newId('mb');
    add('variants', { id: o.profile + ':' + key, profile: o.profile, type: key, on: true, flow: o.flow, name: o.name, area: o.area, exams: null, extra: [], remind: null });
    add('series', { id: key, profile: o.profile, dow: o.dow, every: o.every, anchor: D.nextDow(today(), o.dow, true), deadline: o.deadline, remind: o.flow === 'konz' ? o.remind || null : null, participants: (o.participants || []).slice() });
    audit('megbeszélés felvétele', null, null, seriesName(o.name, o.every) + ': ' + D.dayName(D.nextDow(today(), o.dow, true)) + ', ' + areaName(o.area) + '; résztvevők: ' + ((o.participants || []).map(uname).join(', ') || 'nincs'), { prof: o.profile });
    return key;
  });
};
ops.saveMeeting = (key, o) => {
  const s = st.series.find(x => x.id === key), v = s ? vrec(s.profile, key) : null; if (!s || !v || !adminOk(s.profile)) return { denied: true };
  return tx('Megbeszélés', () => {
    mut('variants', v, x => { if (o.name) x.name = o.name; if (o.area) x.area = o.area; if (o.extra) x.extra = clone(o.extra); });
    mut('series', s, x => {
      if ((o.dow && o.dow !== x.dow) || (o.every && o.every !== x.every)) x.anchor = D.nextDow(today(), o.dow || x.dow, true);
      if (o.dow) x.dow = o.dow; if (o.every) x.every = o.every; if (o.deadline) x.deadline = o.deadline;
      if (o.remind !== undefined) x.remind = v.flow === 'konz' ? o.remind || null : null; if (o.participants) x.participants = o.participants.slice();
    });
    renameSteps(s.profile, key, o.labels);
    audit('megbeszélés módosítása', null, null, seriesName(v.name, s.every) + ': ' + D.dayName(D.nextDow(today(), s.dow, true)) + ', bejelentés az előző munkanap ' + s.deadline + '-ig; résztvevők: ' + (s.participants.map(uname).join(', ') || 'nincs'), { prof: s.profile });
  });
};
/* Közös nézetek (K6.6, K6.7): az área kész nézetei közül melyik látszik a profil minden tagjánál */
ops.setViewShown = (areaId, view, shown, label) => {
  const a = st.areas.find(x => x.id === areaId); if (!a || !adminOk(a.profile)) return { denied: true };
  return tx('Közös nézet', () => {
    mut('areas', a, x => { x.hide = shown ? x.hide.filter(k => k !== view) : uniq(x.hide.concat([view])); });
    audit(shown ? 'közös nézet bekapcsolása' : 'közös nézet elrejtése', null, null, a.name + ': ' + (label || view), { prof: a.profile });
  });
};
/* Emlékeztető-időzítés változatonként (K7.3): engedély és vizsgálat hétben, átadás hónapban */
ops.saveReminders = (profileId, map) => {
  if (!adminOk(profileId)) return { denied: true };
  return tx('Emlékeztetők', () => {
    const parts = [];
    Object.keys(map).forEach(t => { const v = vrec(profileId, t); if (v && Number(map[t]) !== Number(remindOf(profileId, t))) { mut('variants', v, x => { x.remind = Number(map[t]); }); parts.push((v.name || cfg.types[t].name) + ': ' + map[t]); } });
    if (parts.length) audit('emlékeztető-időzítés', null, null, parts.join('; '), { prof: profileId });
    return parts.length;
  });
};
/* Tagok (K9.9): szerepkör a profilban. Az osztályvezetői és a főnővéri szerepkört csak a fő admin adja és veszi el (K9.12):
   a profil adminja nem adhatja, és akinek ilyen szerepköre van, annak a szerepkörét nem módosíthatja */
ops.setRole = (uid, profileId, role) => {
  const u = U(uid);
  /* A saját szerepkörét senki nem módosítja: így a nővér sem teheti magát orvossá, más profil betegadatához (a prototípus bírálata, 1. pont) */
  if (!adminOk(profileId) || uid === me() || u.profile !== profileId || u.head || toMainAdmin(u.role) || toMainAdmin(role) || cfg.profileRoles.indexOf(role) === -1) return { denied: true };
  const old = u.role;
  return tx('Szerepkör', () => { upsertMember(uid, { role, removed: null }); audit('szerepkör módosítása', null, null, uname(uid) + ': ' + old + ' → ' + role, { prof: profileId, uid }); });
};
/* Mi marad utána, ha a tag kikerül a profilból: a nyitott ügyei és teendői felelős nélkül, az áreák munkalistáján (K6.4) */
function memberLoad(uid, profileId) {
  return { cases: st.cases.filter(c => c.profileId === profileId && isOpen(c) && c.owners.indexOf(uid) > -1),
    tasks: st.tasks.filter(t => !t.done && t.owner === uid && (Cs(t.caseId) || {}).profileId === profileId),
    owner: st.areas.filter(a => a.profile === profileId && a.owner === uid), deputy: st.areas.filter(a => a.profile === profileId && a.deputy === uid),
    admin: st.admins.some(a => a.user === uid && a.profile === profileId) };
}
ops.removeMember = (uid, profileId) => {
  const u = U(uid);
  if (!adminOk(profileId) || uid === me() || u.profile !== profileId || u.head || toMainAdmin(u.role)) return { denied: true };
  return tx('Eltávolítás', () => {
    const L = memberLoad(uid, profileId), name = uname(uid);
    L.cases.forEach(c => mut('cases', c, x => { x.owners = x.owners.filter(o => o !== uid); hist(x, name + ' kikerült a profilból' + (x.owners.length ? '' : '; az ügy felelős nélkül maradt')); }));
    L.tasks.forEach(t => mut('tasks', t, x => { x.owner = null; }));
    st.areas.filter(a => a.profile === profileId && (a.owner === uid || a.deputy === uid || a.members.indexOf(uid) > -1))
      .forEach(a => mut('areas', a, x => { x.members = x.members.filter(k => k !== uid); if (x.owner === uid) x.owner = null; if (x.deputy === uid) x.deputy = null; }));
    st.series.filter(s => s.profile === profileId && s.participants.indexOf(uid) > -1).forEach(s => mut('series', s, x => { x.participants = x.participants.filter(k => k !== uid); }));
    const d = st.duties.find(x => x.id === profileId); if (d && (d.merge.indexOf(uid) > -1 || d.audit.indexOf(uid) > -1)) mut('duties', d, x => { x.merge = x.merge.filter(k => k !== uid); x.audit = x.audit.filter(k => k !== uid); });
    st.admins.filter(a => a.user === uid && a.profile === profileId).forEach(a => { touch('admins', a); st.admins.splice(st.admins.indexOf(a), 1); });
    upsertMember(uid, { removed: { by: me(), at: now(), from: profileId } });
    audit('tag eltávolítása', null, null, name + ', ' + profileName(profileId) + ': ' + L.cases.length + ' nyitott ügye és ' + L.tasks.length + ' teendője felelős nélkül maradt', { prof: profileId, uid });
  });
};
/* Kijelölt feladatkörök a profilban: betegrekordok összevonása (K3.6) és naplólekérdezés (K12.2) */
ops.setDuty = (profileId, kind, uids) => {
  if (!adminOk(profileId) || (kind !== 'merge' && kind !== 'audit')) return { denied: true };
  const ok = uids.filter(k => U(k).profile === profileId);
  return tx('Kijelölés', () => {
    const d = st.duties.find(x => x.id === profileId);
    if (d) mut('duties', d, x => { x[kind] = ok.slice(); }); else add('duties', { id: profileId, merge: kind === 'merge' ? ok.slice() : [], audit: kind === 'audit' ? ok.slice() : [] });
    audit(kind === 'merge' ? 'kijelölés: betegrekordok összevonása' : 'kijelölés: naplólekérdezés', null, null, ok.map(uname).join(', ') || 'senki', { prof: profileId });
  });
};
ops.dismiss = id => { const r = st.reminders.find(x => x.id === id); if (r && r.dismissed.indexOf(me()) === -1) r.dismissed.push(me()); persist(); emit('tx'); };
ops.openCard = pid => { audit('kártya', pid); persist(); };
ops.openCase = cid => { const c = Cs(cid); audit('ügy', c ? c.patientId : null, cid); persist(); };
ops.auditQuery = pid => { audit('naplólekérdezés', pid); persist(); };
/* A piszkozat csak valódi változáskor ír: különben a lapok minden rajzoláskor visszaírnák a teljes állapotot, és két lap egymás régi állapotát
   pingpongozhatná végtelenül (az F3 két- és háromlapos próbájában előjött) */
ops.draft = (key, text) => { const u = me(); if (!u) return; const d = st.drafts[u] || {}; if ((d[key] || '') === (text || '')) return; st.drafts[u] = d; if (text) d[key] = text; else delete d[key]; persist(); };
ops.saveNote = (id, text) => tx('Megjegyzés', () => { const c = Cs(id); mut('cases', c, x => { x.note = text; hist(x, 'Megjegyzés mentve'); }); ops.draft('note:' + id, ''); });
const draftOf = key => { const u = me(); return u && st.drafts[u] ? st.drafts[u][key] || '' : ''; };

/* ---------------- Az idő múlása: napirend, emlékeztetők (K5.11, K7) ---------------- */
function reminderRules(c) {
  const d = c.data || {}, out = [];
  if (c.closed) return out;
  const g = c.patientId ? careIn(c.patientId, c.profileId) : null;
  /* Az időzítés a profil változatából (K7.3): engedély és vizsgálat hétben, átadás naptári hónapban; alapérték 8 hét, 2 hét, 3 hónap */
  if (c.type === 'engedely' && c.step === 'erv' && d.expiresOn && !renewalOf(c.id))
    out.push({ key: 'engedely:' + c.id + ':' + d.expiresOn, at: D.at(D.add(d.expiresOn, -7 * remindOf(c.profileId, 'engedely')), '08:00'), to: uniq(c.owners.concat(g && g.doctor ? [g.doctor] : [])) });
  if (c.type === 'vizsgalat' && (c.step === 'eloj' || c.step === 'idop') && d.to && !d.appointment)
    out.push({ key: 'vizsgalat:' + c.id + ':' + d.to, at: D.at(D.add(d.to, -7 * remindOf(c.profileId, 'vizsgalat')), '08:00'), to: c.owners.slice() });
  /* A hiányos bejelentés emlékeztetője a konzílium működésű megbeszélésnél, ha a sorozat kéri (a radiológiai konzíliumnál 9:00); a D2T-nél nincs */
  const ser = c.meeting ? cfg.series[c.type] : null;
  if (ser && ser.remind && flowOf(c.type) === 'konz' && (c.step === 'bej' || c.step === 'nap') && missingFields(c).length)
    out.push({ key: 'radio:' + c.id + ':' + c.meeting, at: D.at(D.prevWorkday(c.meeting), ser.remind), to: c.owners.slice() });
  if (c.type === 'labor' && c.step === 'var' && d.expectedOn)
    out.push({ key: 'labor:' + c.id + ':' + d.expectedOn, at: D.at(D.add(d.expectedOn, 1), '08:00'), to: c.owners.slice(), deputies: true });
  if (c.type === 'atadas' && ['atd', 'dok', 'elk'].indexOf(c.step) > -1 && d.plannedOn)
    out.push({ key: 'atadas:' + c.id + ':' + d.plannedOn, at: D.at(D.addMonths(d.plannedOn, -remindOf(c.profileId, 'atadas')), '08:00'), to: [d.coordinator || c.owners[0]].filter(Boolean) });
  return out;
}
const uniq = a => a.filter((x, i) => x && a.indexOf(x) === i);
function tick(silent) {
  const n = D.mins(now());
  st.cases.forEach(c => {
    if (c.closed || !c.meeting) return;
    const t = typeOf(c), first = t.steps[0].id;
    if (!cfg.series[t.meeting]) return;
    if (c.step === first && n >= D.mins(meetingDeadline(t.meeting, c.meeting))) {
      c.step = 'nap'; c.ver++; c.history.push({ at: now(), by: 'rendszer', text: 'Napirendre került (a bejelentési határidő lejárt; a napirend magától állt össze)' });
    }
  });
  st.cases.forEach(c => {
    if (c.m4 || !c.discussedAt || c.triage === 'tudomásul' || !isMeet(c.type)) return;
    const point = D.at(D.addWorkdays(c.discussedAt.slice(0, 10), 2), '23:59');
    if (n >= D.mins(point)) c.m4 = { at: point, ok: m4ok(c, point) };
  });
  st.cases.forEach(c => reminderRules(c).forEach(r => {
    if (st.fired[r.key] || n < D.mins(r.at)) return;
    st.fired[r.key] = true;
    const to = r.to.slice(), dep = [];
    if (r.deputies) r.to.forEach(u => { const a = absenceOf(u); if (a) { to.push(a.deputy); dep.push(a.deputy); } });
    st.reminders.push({ id: 'r' + (++st.seq), key: r.key, caseId: c.id, to: uniq(to), dep, at: now(), dismissed: [] });
  }));
  if (!silent) { /* semmi egyéb */ }
}
function remindersFor(uid) {
  uid = uid || me();
  const deps = deputiedBy(uid);
  return st.reminders.filter(r => {
    if (r.dismissed.indexOf(uid) > -1) return false;
    const c = Cs(r.caseId); if (!c || c.closed) return false;
    if (!(r.to.indexOf(uid) > -1 || r.to.some(x => deps.indexOf(x) > -1))) return false;
    return stillRelevant(r, c);
  }).map(r => Object.assign({}, r, { asDeputy: r.to.indexOf(uid) === -1 || (r.dep || []).indexOf(uid) > -1 }));
}
function stillRelevant(r, c) {
  const kind = r.key.split(':')[0], d = c.data || {};
  if (kind === 'engedely') return c.step === 'erv' && !renewalOf(c.id);
  if (kind === 'vizsgalat') return (c.step === 'eloj' || c.step === 'idop') && !d.appointment;
  if (kind === 'radio') return missingFields(c).length > 0 && (c.step === 'bej' || c.step === 'nap');
  if (kind === 'labor') return c.step === 'var';
  if (kind === 'atadas') return ['atd', 'dok', 'elk'].indexOf(c.step) > -1;
  return true;
}

/* ---------------- Világok ---------------- */
function reset(name) {
  st = name && name !== 'base' ? BT.worlds.scen[name]() : BT.worlds.base();
  applyState(); tick(true); persist(); emit('reset');
}

BT.tar = {
  init: load, on: f => subs.push(f), state: () => st, persist, now, today, setClock, reset,
  session, me, mode, modesOf, login, logout, setMode, startRoute, rememberView, pref,
  U, uname, P, Cs, Tk, Dy, typeOf, stepDef, stepLabel, cat, catWord, isOpen, caseTitle, commonType, patientName, patientId, patientLabel, fmtTaj,
  caresOf, careIn, openAdmission, profileName, areaName, isMember, isDoctor, isNurse, caseAccess, taskAccess, patientAccess, canMerge, canAudit, isProfileOwner,
  relDay, relDue, relAt, waitLen, lateBy, dutyLate, caseDate, caseLate, permitExpired, renewalOf, taskOpen, taskLate,
  absenceOf, deputiedBy, myLists, fromDutyFor, areaList, dutyLists, patientDuty, inpatients, lastChange,
  leaderScope, summary, closedByReason, metrics, periodNames, searchPatients, search, usedLabels, searchDuty, dutyVisible, mergeConflicts, mergeBlocked, meetingsAhead,
  checkTaj, wardProfiles, nextMeeting, meetingDeadline, missingFields, remindersFor, ops, undo, draftOf, norm,
  isMainAdmin, isActive, adminSource, isAdminOf, adminProfiles, canGrant, headOf, toMainAdmin, requestsFor, account, pendingFor, checkMail, seesSummary,
  flowOf, isMeet, variant, remindOf, seriesName, membersOf, memberLoad, stepBase, variantOnArea, plusUsed,
  relWord, relBetween, originOf, linkedOf, openTasksOf, areaFor, spawnTypes, titleFromTask, spawnClosesTask: SPAWN_CLOSES_TASK
};
})();
