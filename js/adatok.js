/* Fonal prototípus – kitalált adatok.
   Minden beteg, munkatárs, időpont és hivatkozás kitalált. A TAJ csupa azonos számjegy:
   ilyen TAJ az ellenőrző számjegy miatt nem létezhet (a próba ezt fogadja el érvényesnek). */
(function () {
'use strict';
const BT = window.BT = window.BT || {};

/* ---------------- Dátumok (magyar alak, helyi idő) ---------------- */
const pad = n => (n < 10 ? '0' : '') + n;
const MON = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
const MONL = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const D = BT.d = {
  parse(iso) { const p = iso.slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); },
  iso(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); },
  add(iso, n) { const dt = D.parse(iso); dt.setDate(dt.getDate() + n); return D.iso(dt); },
  diff(a, b) { return Math.round((D.parse(a) - D.parse(b)) / 864e5); },
  addMonths(iso, n) {
    const dt = D.parse(iso), day = dt.getDate();
    dt.setDate(1); dt.setMonth(dt.getMonth() + n);
    const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(day, last)); return D.iso(dt);
  },
  at(iso, hm) { return iso.slice(0, 10) + 'T' + (hm || '08:00'); },
  dow(iso) { return D.parse(iso).getDay(); },
  isWorkday(iso) { const w = D.dow(iso); return w !== 0 && w !== 6; },
  prevWorkday(iso) { let x = D.add(iso, -1); while (!D.isWorkday(x)) x = D.add(x, -1); return x; },
  addWorkdays(iso, n) { let x = iso; while (n > 0) { x = D.add(x, 1); if (D.isWorkday(x)) n--; } return x; },
  nextDow(iso, w, inclusive) { let x = inclusive ? iso : D.add(iso, 1); while (D.dow(x) !== w) x = D.add(x, 1); return x; },
  mins(dt) { const p = dt.slice(11, 16).split(':').map(Number); return D.diff(dt.slice(0, 10), '2000-01-01') * 1440 + p[0] * 60 + p[1]; },
  addMins(dt, m) { const base = D.mins(dt) + m, day = Math.floor(base / 1440), rest = base - day * 1440; return D.at(D.add('2000-01-01', day), pad(Math.floor(rest / 60)) + ':' + pad(rest % 60)); },
  fmt(iso, ref) { const dt = D.parse(iso), s = MON[dt.getMonth()] + ' ' + dt.getDate() + '.'; return ref && D.parse(ref).getFullYear() === dt.getFullYear() ? s : dt.getFullYear() + '. ' + s; },
  long(iso) { const dt = D.parse(iso), s = DAYS[dt.getDay()]; return s.charAt(0).toUpperCase() + s.slice(1) + ', ' + MONL[dt.getMonth()] + ' ' + dt.getDate() + '.'; },
  full(iso) { const dt = D.parse(iso); return dt.getFullYear() + '. ' + MONL[dt.getMonth()] + ' ' + dt.getDate() + '., ' + DAYS[dt.getDay()]; },
  dayName(iso) { return DAYS[D.dow(iso)]; },
  hm(dt) { const t = dt.slice(11, 16); return t.charAt(0) === '0' ? t.slice(1) : t; }
};

/* ---------------- Szerkezet ----------------
   A klinika szerkezete (részlegek, profilok) az üzemeltetőé. A profil beállításai (áreák, változatok, megbeszélések,
   közös nézetek, tagok szerepköre, kijelölt feladatkörök) az állapotban élnek: a profil adminja a felületen állítja őket,
   és a tár ezekből tölti ki a lenti üres gyűjteményeket (tar.js, applyState). A kiinduló beállítás a TPL. */
const cfg = BT.cfg = {};
cfg.departments = { tu: { id: 'tu', name: 'Tűzoltó utca' }, br: { id: 'br', name: 'B részleg' } };
cfg.profiles = {
  gyr: { id: 'gyr', name: 'Gyermekreumatológia', dept: 'tu', exams: [] },
  gyn: { id: 'gyn', name: 'Gyermekneurológia', dept: 'br', exams: [] }
};
cfg.areas = {}; cfg.areaOrder = {}; cfg.defaultArea = {}; cfg.series = {}; cfg.newMenu = {}; cfg.variants = {};

/* Kitalált munkatársak (a forgatókönyvek 0. részének szerepköreihez) */
cfg.users = {
  demo: { name: 'dr. Demó Dóra', profile: 'gyr', role: 'szakorvos', doctor: true, note: 'kezelőorvos' },
  vazlat: { name: 'dr. Vázlat Viktor', profile: 'gyr', role: 'szakorvos', doctor: true, note: 'második szakorvos, a radiológiai konzílium vezetője' },
  sablon: { name: 'dr. Sablon Sára', profile: 'gyr', role: 'szakorvosjelölt', doctor: true, duty: true, note: 'a klinikai ügyelet tagja' },
  gyakorlo: { name: 'dr. Gyakorló Gergő', profile: 'gyr', role: 'rezidens', doctor: true, note: 'első rezidens' },
  kiserlet: { name: 'dr. Kísérlet Kata', profile: 'gyr', role: 'rezidens', doctor: true, note: 'második rezidens' },
  atmenet: { name: 'dr. Átmenet Ádám', profile: 'gyr', role: 'szakorvos', doctor: true, note: 'tranzíciós koordinátor' },
  keret: { name: 'dr. Keret Kornél', profile: 'gyr', role: 'osztályvezető', doctor: true, head: true, note: 'alapból a profil adminja; naplólekérdezésre kijelölt (tervjavaslat)' },
  valto: { name: 'dr. Váltó Vera', profile: 'gyr', role: 'szakorvos', doctor: true, leader: { role: 'igazgatóhelyettes', scope: 'klinika' } },
  kotes: { name: 'Kötés Kinga', profile: 'gyr', role: 'nővér' },
  urlap: { name: 'Űrlap Ildikó', profile: 'gyr', role: 'asszisztens', note: 'engedélyfelelős; betegrekordok összevonására kijelölt' },
  naptar: { name: 'Naptár Nóra', profile: 'gyr', role: 'asszisztens', note: 'MR-előjegyzés felelőse' },
  ideg: { name: 'dr. Ideg Imre', profile: 'gyn', role: 'szakorvos', doctor: true, note: 'gyermekneurológus' },
  hullam: { name: 'Hullám Hédi', profile: 'gyn', role: 'nővér' },
  mutato: { name: 'dr. Mutató Mihály', leader: { role: 'igazgató', scope: 'klinika' } },
  telep: { name: 'dr. Telep Tibor', leader: { role: 'részlegvezető', scope: 'tu' } },
  rend: { name: 'Rend Rozália', leader: { role: 'részlegvezető főnővér', scope: 'tu' } },
  kulcs: { name: 'dr. Kulcs Kálmán', mainAdmin: true, note: 'fő admin: az osztályvezetők, a főnővérek és a vezetők regisztrációját hagyja jóvá' }
};
/* Kitalált egyetemi cím, egyben a belépési név (K9.13): „vezetéknév.keresztnév@semmelweis.hu”, ékezet nélkül */
const MAIL_DOMAIN = cfg.mailDomain = 'semmelweis.hu';
cfg.mailOf = name => String(name || '').replace(/^dr\.\s*/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).join('.') + '@' + MAIL_DOMAIN;
Object.keys(cfg.users).forEach(k => { cfg.users[k].id = k; cfg.users[k].email = cfg.mailOf(cfg.users[k].name); });
/* Szerepkörök a regisztrációhoz és a jóváhagyáshoz (K9.1); az osztályvezetői és a vezetői kérést a fő admin bírálja el (K9.12) */
cfg.profileRoles = ['rezidens', 'szakorvosjelölt', 'szakorvos', 'osztályvezető', 'nővér', 'főnővér', 'asszisztens'];
cfg.leaderRoles = ['részlegvezető', 'részlegvezető főnővér', 'igazgatóhelyettes', 'igazgató'];
/* A regisztrációnál a részleg szintje még nem működik, ezért a részlegvezető és a részleg főnővére nem választható (CT, 2026-11-19); a modellben maradnak */
cfg.regLeaderRoles = ['igazgatóhelyettes', 'igazgató'];
cfg.doctorRoles = ['rezidens', 'szakorvosjelölt', 'szakorvos', 'osztályvezető'];
/* Az öt státuszkategória (K4.3) és a várakozás címzettjei (K4.5), az ügytípus-szerkesztőhöz (K4.17) */
cfg.cats = [['Ny', 'nyitott', 'még nem kezdték el; „Ezen dolgozz!”'], ['F', 'folyamatban', 'nálunk a következő lépés; „Ezen dolgozz!”'],
  ['V', 'várakozik', 'más félnél a következő lépés; „Kire várunk?”'], ['K', 'kész', 'a cél teljesült, de az ügy még él'], ['L', 'lezárt', 'lezárási okkal az archívumba kerül']];
cfg.waitFor = ['hatóság', 'radiológia', 'labor', 'fogadó intézmény', 'szülő', 'más'];
cfg.allReasons = ['teljesült', 'lemondva', 'elutasítva', 'okafogyott', 'tévesen rögzítve'];

/* ---------------- Ügytípusok, változatok, lépések ----------------
   Kategória: Ny nyitott, F folyamatban, V várakozik, K kész (a lezárt az ügy closed mezője).
   A lépés kódja állandó; a név a profilban átnevezhető (K4.2, F1 1d). */
const S = (id, label, cat, extra) => Object.assign({ id, label, cat }, extra || {});
/* Az esetmegbeszélés két működése (A fejezet, 6. rész): konzílium (bejelentés, napirend, dokumentálandó, teendők) és D2T
   (több felelős orvos, résztvevők, határidő). Minden megbeszélés-változat ezek egyikéből készül; a lépések kategóriája kötött. */
const FLOWS = cfg.flows = {
  konz: { label: 'mint a konzílium', about: 'bejelentés a minimum adatokkal, napirend, döntés, teendők; a megbeszélt, de még nem dokumentált eset külön látszik',
    steps: () => [S('bej', 'bejelentve', 'Ny'), S('nap', 'napirenden', 'F'), S('dok', 'megbeszélve, dokumentálandó', 'F'), S('ten', 'teendők folyamatban', 'F')],
    reasons: ['teljesült', 'okafogyott', 'tévesen rögzítve'], end: { _: 'elintézve' } },
  d2t: { label: 'mint a D2T', about: 'egy esetnek több felelős orvosa lehet; határidő és a résztvevő orvosok köre; döntés, teendők',
    steps: () => [S('atg', 'átgondolandó', 'Ny'), S('nap', 'napirenden', 'F'), S('eld', 'eldöntve, teendők', 'F')],
    reasons: ['teljesült', 'okafogyott', 'tévesen rögzítve'], end: { _: 'lezárt' } }
};
cfg.meetType = (key, name, flow) => { const f = FLOWS[flow]; return { name, short: name, general: 'Esetmegbeszélés', meeting: key, flow, steps: f.steps(), reasons: f.reasons.slice(), end: Object.assign({}, f.end) }; };
cfg.types = {
  engedely: {
    name: 'Terápiás engedély', short: 'Terápiás engedély', general: 'Terápiás engedély',
    steps: [S('elok', 'előkészítendő', 'Ny'), S('kesz', 'beküldésre kész', 'F'), S('ogyei', 'OGYÉI-nél', 'V', { wait: 'OGYÉI', offLabelOnly: true }),
      S('neakk', 'NEAK-kérelem készül', 'F'), S('neak', 'NEAK-nál', 'V', { wait: 'NEAK' }), S('erv', 'érvényes', 'K')],
    reasons: ['megújítva', 'lejárt', 'elutasítva', 'okafogyott', 'tévesen rögzítve'],
    end: { 'megújítva': 'megújítva', 'lejárt': 'lejárt', _: 'lezárt' }
  },
  vizsgalat: {
    name: 'Vizsgálat előjegyzése', short: 'Vizsgálat előjegyzése', general: 'Vizsgálat előjegyzése',
    steps: [S('eloj', 'előjegyzendő', 'Ny'), S('idop', 'időpontra vár', 'V', { wait: 'radiológia' }), S('ert', 'időpont megvan, szülőt értesíteni', 'F'),
      S('vizs', 'a vizsgálatra vár', 'V', { wait: 'a vizsgálat napja' }), S('lem', 'lemondandó', 'F', { alt: true })],
    reasons: ['teljesült', 'lemondva', 'okafogyott', 'tévesen rögzítve'],
    end: { 'teljesült': 'elkészült', 'lemondva': 'lemondva', _: 'lezárt' }
  },
  radio: cfg.meetType('radio', 'Radiológiai konzílium', 'konz'),
  d2t: cfg.meetType('d2t', 'D2T-megbeszélés', 'd2t'),
  epi: cfg.meetType('epi', 'Epilepszia-megbeszélés', 'konz'),
  labor: {
    name: 'Labor- és leletkövetés', short: 'Labor- és leletkövetés', general: 'Labor- és leletkövetés',
    steps: [S('ker', 'kérendő', 'Ny'), S('var', 'eredményre vár', 'V', { wait: 'labor' }), S('atn', 'az eredmény megjött, átnézendő', 'F')],
    reasons: ['teljesült', 'okafogyott', 'tévesen rögzítve'], end: { _: 'lezárt' }
  },
  atadas: {
    name: 'Átadás felnőtt ellátásba', short: 'Átadás más ellátóhoz', general: 'Átadás más ellátóhoz',
    steps: [S('atd', 'átadandó', 'Ny'), S('dok', 'átadó dokumentum készül', 'F'), S('elk', 'elküldve, a fogadó félre vár', 'V', { wait: 'fogadó intézmény' }), S('ata', 'átadva', 'K')],
    reasons: ['teljesült', 'lemondva', 'okafogyott', 'tévesen rögzítve'],
    end: { 'teljesült': 'utólagos kapcsolatfelvétel megvolt', _: 'lezárt' }
  },
  altalanos: {
    name: 'Általános teendő', short: 'Általános teendő', general: 'Általános teendő',
    steps: [S('nyit', 'nyitott', 'Ny'), S('foly', 'folyamatban', 'F')],
    reasons: ['teljesült', 'okafogyott', 'tévesen rögzítve'], end: { _: 'lezárt' }
  }
};
/* A klinika ügytípus-katalógusa (K4.1) a Beállításokhoz: mire való, mi kötött (a fő adatok, K4.2), és mit állít a profil.
   remind: az emlékeztető-időzítés alapértéke és mértékegysége (K7.2, K7.3); a lista: a profil saját listája (K5.6). */
cfg.catalog = [
  { type: 'vizsgalat', name: 'Vizsgálat előjegyzése', about: 'Képalkotás vagy más vizsgálat, a kéréstől az elvégzésig.',
    main: 'vizsgálat (a profil listájából), régió, időablak, altatás, kérő orvos, időpont, HIS-hivatkozás a kérésre és a leletre',
    remind: { def: 2, unit: 'hét', max: 26, text: 'héttel az időablak vége előtt, ha még nincs időpont', to: 'a felelősnek' }, list: true },
  { type: 'labor', name: 'Labor- és leletkövetés', about: 'Egy kért vizsgálat eredményének követése, és ami utána következik.',
    main: 'vizsgálat, a kérés és a várható eredmény napja, HIS-hivatkozás, kinek kell jelezni', fixedRemind: 'a várható nap utáni reggelen, ha még nincs eredmény; a felelősnek, távollétében a helyettesnek is' },
  { type: 'engedely', name: 'Terápiás engedély', about: 'Indikáción túli alkalmazás és egyedi méltányosság, OGYÉI és NEAK.',
    main: 'gyógyszer, hatóság, érvényesség vége, indikáció, kérelemtípus, indikáción túli alkalmazás, a beküldés és a határozat napja, az előző engedély',
    remind: { def: 8, unit: 'hét', max: 26, text: 'héttel a lejárat előtt', to: 'a felelősnek és a kezelőorvosnak' } },
  { type: 'meeting', name: 'Esetmegbeszélés', about: 'Rendszeres, többorvosos megbeszélés: bejelentés, előszűrés, döntés, teendők. A változatai a megbeszélések.' },
  { type: 'atadas', name: 'Átadás más ellátóhoz', about: 'Felnőtt ellátásba, más intézménybe vagy más profilra.',
    main: 'fogadó intézmény és orvos, intézményi elérhetőség, tervezett nap, tranzíciós koordinátor, az átadó dokumentum, kapcsolatfelvételek',
    remind: { def: 3, unit: 'hónap', max: 12, text: 'hónappal a tervezett nap előtt', to: 'a koordinátornak' } },
  { type: 'altalanos', name: 'Általános teendő', about: 'Ami egyikbe sem illik; beteg nélkül is indítható.', main: 'mit kell tenni, határidő', fixedRemind: 'nincs emlékeztető; a lejárt tétel a munkalistán elöl áll' }
];
cfg.meetMain = { konz: 'alkalom, kérdés, régió vagy terület, rövid összefoglaló, HIS-hivatkozás a felvételre, előszűrés, döntés, teendők', d2t: 'alkalom, kérdés, határidő, rövid összefoglaló, HIS-hivatkozás, résztvevő orvosok, döntés, teendők' };
cfg.commonData = 'beteg, felelős, figyelő, határidő, lépés, ellátási forma, HIS-hivatkozás, kapcsolatfelvételek, rövid megjegyzés, csatolmány, címkék, a lezárás oka';
cfg.plusKinds = [['yn', 'igen vagy nem'], ['text', 'rövid szöveg'], ['list', 'választás egy listából']];
cfg.weekdays = [[1, 'hétfő'], [2, 'kedd'], [3, 'szerda'], [4, 'csütörtök'], [5, 'péntek']];

/* ---------------- A beállított klinika (TPL): a szabad próba és a forgatókönyvek kiinduló beállítása ----------------
   Az előkészítés (E) világában a gyermekneurológia még üres: az üzemeltető most hozta létre (scen.E). */
const AR = (id, profile, name, owner, deputy, members) => ({ id, profile, name, owner: owner || null, deputy: deputy || null, members, hide: [] });
const VA = (profile, type, o) => Object.assign({ id: profile + ':' + type, profile, type, on: true, flow: null, name: '', area: null, exams: null, extra: [], remind: null }, o);
const TPL = {
  areas: () => [
    AR('eng', 'gyr', 'Egyedi méltányossági engedélyek', 'urlap', null, ['urlap']),
    AR('mr', 'gyr', 'MR-előjegyzés', 'naptar', 'kotes', ['naptar', 'kotes']),
    AR('rk', 'gyr', 'Radiológiai konzílium', null, null, []),
    AR('d2t', 'gyr', 'D2T-megbeszélés', null, null, []),
    AR('rez', 'gyr', 'Rezidensi teendők', null, null, ['gyakorlo', 'kiserlet']),
    AR('atad', 'gyr', 'Átadás felnőtt ellátásba', 'atmenet', null, ['atmenet']),
    AR('szak', 'gyn', 'Szakambulancia', null, null, ['ideg', 'hullam']),
    AR('eeg', 'gyn', 'EEG-labor', 'hullam', null, ['hullam'])
  ],
  variants: () => [
    VA('gyr', 'vizsgalat', { name: 'MR-előjegyzés', area: 'mr', exams: ['MR', 'csontszcintigráfia', 'CT', 'ultrahang'], remind: 2 }),
    VA('gyr', 'labor', { name: 'Labor- és leletkövetés', area: 'rez' }),
    VA('gyr', 'engedely', { name: 'Terápiás engedély', area: 'eng', remind: 8 }),
    VA('gyr', 'radio', { flow: 'konz', name: 'Radiológiai konzílium', area: 'rk', extra: [{ id: 'ortho', label: 'Ortopédiai vonatkozás', kind: 'yn' }] }),
    VA('gyr', 'd2t', { flow: 'd2t', name: 'D2T-megbeszélés', area: 'd2t' }),
    VA('gyr', 'atadas', { name: 'Átadás felnőtt ellátásba', area: 'atad', remind: 3 }),
    VA('gyr', 'altalanos', { name: 'Általános teendő', area: 'rez' }),
    VA('gyn', 'vizsgalat', { name: 'Vizsgálat előjegyzése', area: 'eeg', exams: ['MR', 'EEG'], remind: 2 }),
    VA('gyn', 'labor', { name: 'Labor- és leletkövetés', area: 'szak' }),
    VA('gyn', 'engedely', { name: 'Terápiás engedély', area: 'szak', remind: 8 }),
    VA('gyn', 'epi', { flow: 'konz', name: 'Epilepszia-megbeszélés', area: 'szak' }),
    VA('gyn', 'atadas', { name: 'Átadás más ellátóhoz', area: 'szak', remind: 3 }),
    VA('gyn', 'altalanos', { name: 'Általános teendő', area: 'szak' })
  ],
  /* A klinikai alapsablon egy új profilnak: minden általános ügytípus elérhető, az általános teendő bekapcsolva, a vizsgálatlistán az MR */
  fresh: profile => [
    VA(profile, 'vizsgalat', { on: false, name: 'Vizsgálat előjegyzése', exams: ['MR'], remind: 2 }),
    VA(profile, 'labor', { on: false, name: 'Labor- és leletkövetés' }),
    VA(profile, 'engedely', { on: false, name: 'Terápiás engedély', remind: 8 }),
    VA(profile, 'atadas', { on: false, name: 'Átadás más ellátóhoz', remind: 3 }),
    VA(profile, 'altalanos', { name: 'Általános teendő' })
  ],
  /* Megbeszélés-sorozat: a változat kulcsa; nap (1 = hétfő), hetente vagy kéthetente; bejelentési határidő a megbeszélés előtti munkanapon; a hiányos bejelentés emlékeztetője */
  series: () => [
    { id: 'radio', profile: 'gyr', dow: 4, every: 1, anchor: null, deadline: '17:00', remind: '09:00', participants: ['demo', 'vazlat', 'sablon', 'keret'] },
    { id: 'd2t', profile: 'gyr', dow: 2, every: 1, anchor: null, deadline: '17:00', remind: null, participants: ['demo', 'vazlat', 'keret'] },
    { id: 'epi', profile: 'gyn', dow: 3, every: 1, anchor: null, deadline: '17:00', remind: null, participants: ['ideg'] }
  ],
  /* Kijelölt feladatkörök a profilban: betegrekordok összevonása (K3.6) és naplólekérdezés (K12.2) */
  duties: () => [{ id: 'gyr', merge: ['urlap'], audit: ['keret'] }, { id: 'gyn', merge: [], audit: [] }]
};
const TPL_AREA = {}; TPL.variants().forEach(v => { (TPL_AREA[v.profile] = TPL_AREA[v.profile] || {})[v.type] = v.area; });
function conf(w) { w.areas = TPL.areas(); w.variants = TPL.variants(); w.series = TPL.series(); w.duties = TPL.duties(); w.members = []; }
BT.tpl = TPL;
cfg.closeReasonLabel = { 'teljesült': 'teljesült', 'lemondva': 'lemondva', 'elutasítva': 'elutasítva', 'okafogyott': 'okafogyott', 'tévesen rögzítve': 'tévesen rögzítve', 'lejárt': 'lejárt', 'megújítva': 'megújítva' };
cfg.reqTypes = ['új', 'hosszabbítás', 'módosítás', 'tételesből váltás'];
cfg.whom = ['szülő', 'fogadó csapat', 'más'];
cfg.how = ['telefon', 'levél', 'személyesen', 'más'];
cfg.tempReasons = ['újszülött', 'külföldi, TAJ még nincs', 'más ok'];
/* A próbában csatolható, kitalált fájlok (valódi fájl nem kerül a próbába) */
cfg.fakeFiles = ['kitalalt-kerelem.pdf', 'kitalalt-hatarozat.pdf', 'kitalalt-konziliumi-osszefoglalo.pdf', 'kitalalt-orvosi-osszefoglalo.pdf', 'kitalalt-mr-kivagat.png'];

/* ---------------- Világépítő segédek ---------------- */
function world(clock, name) {
  const w = { v: 6, world: name, clock, seq: 1, patients: [], cases: [], tasks: [], rels: [], cares: [], appearances: [], duty: [], reminders: [], audit: [],
    views: [], absences: [], renames: {}, drafts: {}, prefs: {}, fired: {}, types: [], accounts: [], admins: [],
    areas: [], variants: [], series: [], members: [], duties: [] };
  conf(w); return w;
}
const PAT = {
  p1: { name: 'Próba Panna', taj: '111111111', age: 12, profile: 'gyr', since: '2019-03-04', doctor: 'demo', dx: 'JIA-asszociált uveitis' },
  p2: { name: 'Teszt Elek', taj: '222222222', age: 4, profile: 'gyr', since: '2024-09-10', doctor: 'demo', dx: 'oligoartikuláris JIA' },
  p3: { name: 'Minta Máté', taj: '333333333', age: 13, profile: 'gyr', since: '2023-01-16', doctor: 'vazlat', dx: 'enthesitis-asszociált JIA' },
  p4: { name: 'Példa Bori', taj: '444444444', age: 9, profile: 'gyr', since: '2025-02-03', doctor: 'sablon', dx: 'krónikus nem bakteriális osteomyelitis' },
  p5: { name: 'Álnév Anna', taj: '555555555', age: 15, profile: 'gyr', since: '2022-06-20', doctor: 'demo', dx: 'szisztémás lupus erythematosus' },
  p6: { name: 'Fikció Flóra', taj: '666666666', age: 17, profile: 'gyr', since: '2016-04-11', doctor: 'demo', dx: 'poliartikuláris JIA' },
  p7: { name: 'Mese Márk', taj: '777777777', age: 6, profile: 'gyn', since: '2024-05-06', doctor: 'ideg', dx: 'epilepszia' },
  p8: { name: 'Kitalált Kende', taj: '888888888', age: 10, profile: 'gyr', since: '2023-03-02', doctor: 'demo', dx: 'szisztémás JIA' },
  p9: { name: 'Vendég Vilma', taj: null, temp: 'I-999999', tempReason: 'külföldi, TAJ még nincs', age: 7, profile: 'gyr', since: '2026-11-03', doctor: 'demo', dx: 'JIA gyanúja' },
  /* Csak az előkészítés (E) világában: az új ügytípus betege */
  p10: { name: 'Képzelt Kornél', taj: '999999999', age: 14, profile: 'gyr', since: '2020-05-11', doctor: 'demo', dx: 'oligoartikuláris JIA' }
};
const BASE_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
function patients(w, ids) {
  (ids || BASE_IDS).forEach(id => {
    const p = PAT[id];
    w.patients.push({ id, taj: p.taj, temp: p.temp || null, tempReason: p.tempReason || '', name: p.name, age: p.age, ver: 1, merged: null });
    w.cares.push({ id: 'g-' + id, patientId: id, profileId: p.profile, since: p.since, doctor: p.doctor, dx: p.dx, ended: null, ver: 1 });
  });
}
function adm(w, o) { /* megjelenés: visit vagy adm */
  const a = Object.assign({ id: o.id, patientId: o.p, profileId: o.profile || 'gyr', kind: o.kind || 'adm', start: o.start, end: o.end || null, caseId: o.caseId || null, ver: 1 }, {});
  a.place = o.place || (a.profileId === 'gyn' ? 'Gyermekneurológia, B részleg' : 'Gyermekreumatológia, Tűzoltó utca');
  w.appearances.push(a); return a;
}
function kase(w, o) {
  const type = o.type, profileId = o.profile || (o.p && PAT[o.p] ? PAT[o.p].profile : 'gyr');
  const c = {
    id: o.id, patientId: o.p || null, profileId, areaId: o.area || TPL_AREA[profileId][type], type, title: o.title || '',
    step: o.step || cfg.types[type].steps[0].id, owners: o.owners || [], watchers: o.watchers || [], due: o.due || null,
    his: o.his || [], startedAs: o.startedAs || 'járó', appearanceId: o.appearance || null, data: o.data || {}, note: o.note || '',
    prev: o.prev || null, closed: o.closed || null, waitSince: o.waitSince || null,
    created: o.created || { at: '2026-11-01T09:00', by: (o.owners && o.owners[0]) || 'demo' },
    history: o.history || [], ver: 1, contacts: o.contacts || [], files: o.files || [], labels: o.labels || [],
    meeting: o.meeting || null, triage: o.triage || null, decision: o.decision || '', participants: o.participants || [],
    discussedAt: o.discussedAt || null, decidedAt: o.decidedAt || null
  };
  if (!c.history.length) c.history.push({ at: c.created.at, by: c.created.by, text: 'Felvéve, lépés: ' + stepLabel(type, c.step) });
  if (c.closed) c.history.push({ at: c.closed.at, by: c.closed.by, text: 'Lezárva: ' + c.closed.reason });
  w.cases.push(c); return c;
}
function stepLabel(type, id) { const s = cfg.types[type].steps.find(x => x.id === id); return s ? s.label : id; }
function task(w, o) {
  const t = { id: o.id, caseId: o.c, text: o.text, owner: o.owner === undefined ? null : o.owner, due: o.due || null, done: o.done || null,
    created: o.created || { at: '2026-11-01T09:00', by: 'demo' }, ver: 1, spawned: o.spawned || null, note: o.note || '' };
  w.tasks.push(t); return t;
}
/* Kapcsolat két ügy között (K4.11): egy rekord, mindkét végéről olvasva. A fajta: ebből indult (teendőből), hosszabbítás, új kérelem,
   új előjegyzés (a folytatás három módja), vagy kapcsolódik (kézzel kapcsolva; ennek nincs kiinduló ügye). A felirat a fajtából jön, szabad szöveg nincs. */
function rel(w, kind, from, to, at, who) { w.rels.push({ id: 'l' + (w.rels.length + 1), kind, from, to, at: at || '2026-11-01T09:00', by: who || 'demo', ver: 1 }); }
function duty(w, o) {
  const y = { id: o.id, dir: o.dir || 'to', patientId: o.p || null, profileId: o.profile, caseId: o.c || null, text: o.text, due: o.due,
    by: o.by, at: o.at, accepted: o.accepted || null, note: o.note || '', closed: o.closed || null, ver: 1 };
  w.duty.push(y); return y;
}
const by = (who, at) => ({ by: who, at });

/* ---------------- Az alapvilág: kedd, 2026. november 17., 8:00 (a D napja) ---------------- */
function base(name) {
  const w = world('2026-11-17T08:00', name || 'base');
  patients(w);
  adm(w, { id: 'a1', p: 'p8', kind: 'visit', start: '2026-11-10', caseId: 'k6' });
  adm(w, { id: 'a2', p: 'p8', kind: 'adm', start: '2026-11-16', caseId: 'k5' });
  adm(w, { id: 'a3', p: 'p7', profile: 'gyn', kind: 'adm', start: '2026-11-15', caseId: 'k21' });
  adm(w, { id: 'a4', p: 'p2', kind: 'visit', start: '2026-10-20', caseId: 'k12' });

  kase(w, { id: 'k1', p: 'p1', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-11-13T09:10', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'JIA-asszociált uveitis', reqType: 'új', offLabel: true, sentOn: '2026-07-01', decidedOn: '2026-09-15', expiresOn: '2027-01-12' },
    files: [{ name: 'kitalalt-hatarozat.pdf', at: '2026-11-13T09:12', by: 'urlap' }],
    history: [{ at: '2026-11-13T09:10', by: 'urlap', text: 'Felvéve a tényleges lépésben (kezdő feltöltés): érvényes' }] });
  kase(w, { id: 'k2', p: 'p1', type: 'labor', step: 'atn', owners: ['gyakorlo'], watchers: [], created: { at: '2026-11-09T10:00', by: 'gyakorlo' },
    data: { test: 'Quantiferon (éves szűrés)', requestedOn: '2026-11-09', expectedOn: '2026-11-14', notify: 'demo' }, his: [{ kind: 'kérés', ref: 'K-555555' }],
    closed: { reason: 'teljesült', at: '2026-11-15T12:10', by: 'gyakorlo' } });
  task(w, { id: 't1', c: 'k2', text: 'Quantiferon-eredmény átnézése', note: 'Az eredmény a HIS-ben, átnézni.', owner: 'demo', due: '2026-11-16', created: by('gyakorlo', '2026-11-15T12:05') });
  kase(w, { id: 'k3', p: 'p6', type: 'atadas', step: 'dok', owners: ['atmenet'], created: { at: '2026-10-12T11:00', by: 'demo' },
    data: { institution: 'ORFI, felnőtt reumatológia', recvDoctor: 'dr. Fogadó Ferenc', contact: 'a felnőtt reumatológia titkársága', plannedOn: '2027-03-15', coordinator: 'atmenet', docReady: false },
    contacts: [{ at: '2026-10-28T11:00', by: 'atmenet', whom: 'fogadó csapat', how: 'telefon', note: 'Első egyeztetés a fogadó orvossal.', after: false }] });
  task(w, { id: 't2', c: 'k3', text: 'Orvosi összefoglaló az átadáshoz', owner: 'demo', due: '2026-11-14', created: by('atmenet', '2026-10-28T11:10') });
  kase(w, { id: 'k4', p: 'p6', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-06-25T10:00', by: 'urlap' },
    data: { drug: 'adalimumab', indication: 'poliartikuláris JIA', reqType: 'hosszabbítás', offLabel: false, sentOn: '2026-05-20', decidedOn: '2026-06-25', expiresOn: '2027-06-30' } });
  kase(w, { id: 'k5', p: 'p8', type: 'labor', step: 'atn', owners: ['demo'], due: '2026-11-17', startedAs: 'fekvő', appearance: 'a2',
    created: { at: '2026-11-16T14:30', by: 'demo' }, data: { test: 'ferritin, vérkép', requestedOn: '2026-11-16', expectedOn: '2026-11-17', notify: 'demo' },
    his: [{ kind: 'kérés', ref: 'K-111111' }], title: 'Ferritin és vérkép',
    history: [{ at: '2026-11-16T14:30', by: 'demo', text: 'Felvéve, lépés: eredményre vár; a felvétellel együtt rögzítve' },
      { at: '2026-11-16T21:50', by: 'sablon', text: 'Lépés: az eredmény megjött, átnézendő (ügyeletben)' }] });
  kase(w, { id: 'k6', p: 'p8', type: 'labor', step: 'var', owners: ['demo'], waitSince: '2026-11-10', appearance: 'a1', created: { at: '2026-11-10T10:20', by: 'demo' },
    data: { test: 'Varicella-szerológia', requestedOn: '2026-11-10', expectedOn: '2026-11-19', notify: 'demo' }, his: [{ kind: 'kérés', ref: 'K-222222' }] });
  kase(w, { id: 'k7', p: 'p8', type: 'vizsgalat', step: 'idop', owners: ['naptar'], watchers: ['demo'], waitSince: '2026-11-08', title: 'Kontroll-MR, mindkét csípő',
    created: { at: '2026-05-14T15:10', by: 'demo' }, data: { exam: 'MR', region: 'mindkét csípő', from: '2026-11-23', to: '2026-12-18', anesthesia: false },
    his: [{ kind: 'kérés', ref: 'K-333333' }] });
  task(w, { id: 't3', c: 'k7', text: 'Időpont sürgetése a radiológián', owner: 'naptar', due: '2026-11-10', created: by('naptar', '2026-11-08T09:00') });
  task(w, { id: 't4', c: 'k7', text: 'Kérőlap pótlása a HIS-ben', owner: 'naptar', due: '2026-11-12', created: by('naptar', '2026-11-08T09:05') });
  kase(w, { id: 'k8', p: 'p8', type: 'radio', step: 'ten', owners: ['demo'], meeting: '2026-05-14', triage: 'megbeszéljük', created: { at: '2026-05-11T10:00', by: 'demo' },
    data: { question: 'Mindkét csípő: aktív-e a gyulladás?', region: 'mindkét csípő', summary: 'Csípőfájdalom, mozgáskorlátozottság.' }, his: [{ kind: 'felvétel', ref: 'K-777777' }],
    decision: 'Mérsékelt synovitis mindkét csípőben; kontroll-MR fél év múlva.', discussedAt: '2026-05-14T14:00', decidedAt: '2026-05-14T15:10',
    labels: ['szisztémás JIA', 'csípő synovitis'], closed: { reason: 'teljesült', at: '2026-05-20T09:00', by: 'demo' } });
  task(w, { id: 't16', c: 'k8', text: 'Kontroll-MR fél év múlva', owner: 'naptar', due: '2026-11-16', done: by('demo', '2026-05-14T15:10'), spawned: 'k7', created: by('demo', '2026-05-14T15:10') });
  kase(w, { id: 'k9', p: 'p8', type: 'vizsgalat', step: 'vizs', owners: ['naptar'], watchers: ['demo'], title: 'MR, mindkét csípő', created: { at: '2026-04-29T09:00', by: 'demo' },
    data: { exam: 'MR', region: 'mindkét csípő', from: '2026-04-30', to: '2026-05-15', appointment: '2026-05-06', anesthesia: false },
    his: [{ kind: 'kérés', ref: 'K-747474' }, { kind: 'lelet', ref: 'K-777777' }], closed: { reason: 'teljesült', at: '2026-05-06T15:00', by: 'naptar' } });
  kase(w, { id: 'k10', p: 'p2', type: 'radio', step: 'ten', owners: ['demo'], meeting: '2026-11-05', triage: 'megbeszéljük', created: { at: '2026-11-02T10:00', by: 'demo' },
    data: { question: 'Aktív-e a synovitis, indokolt-e ízületi injekció?', region: 'jobb térd', summary: 'Jobb térd duzzanata hat hete; az MR elkészült.', ortho: false },
    his: [{ kind: 'felvétel', ref: 'K-444444' }], decision: 'Aktív synovitis a jobb térdben; intraartikuláris szteroid.', discussedAt: '2026-11-05T14:00', decidedAt: '2026-11-05T15:00',
    labels: ['oligoartikuláris JIA', 'synovitis'] });
  task(w, { id: 't5', c: 'k10', text: 'Ízületi injekció előjegyzése, jobb térd', owner: 'demo', due: '2026-11-19', created: by('demo', '2026-11-05T15:00') });
  task(w, { id: 't6', c: 'k10', text: 'Kontroll-MR fél év múlva', owner: 'naptar', due: '2026-11-12', done: by('demo', '2026-11-05T15:00'), spawned: 'k11', created: by('demo', '2026-11-05T15:00') });
  kase(w, { id: 'k11', p: 'p2', type: 'vizsgalat', step: 'eloj', owners: ['naptar'], watchers: ['demo'], title: 'Kontroll-MR, jobb térd', created: { at: '2026-11-05T15:00', by: 'demo' },
    data: { exam: 'MR', region: 'jobb térd', from: '2027-05-03', to: '2027-06-04', anesthesia: true } });
  task(w, { id: 't7', c: 'k11', text: 'Altatásos lista egyeztetése', owner: 'naptar', due: '2026-11-16', created: by('naptar', '2026-11-06T10:00') });
  kase(w, { id: 'k12', p: 'p2', type: 'vizsgalat', step: 'vizs', owners: ['naptar'], watchers: ['demo'], title: 'MR, jobb térd, altatással', appearance: 'a4', created: { at: '2026-10-20T10:00', by: 'demo' },
    data: { exam: 'MR', region: 'jobb térd', from: '2026-10-21', to: '2026-11-10', appointment: '2026-10-29', anesthesia: true },
    his: [{ kind: 'kérés', ref: 'K-848484' }, { kind: 'lelet', ref: 'K-444444' }], closed: { reason: 'teljesült', at: '2026-10-29T15:00', by: 'naptar' } });
  kase(w, { id: 'k13', p: 'p9', type: 'vizsgalat', step: 'eloj', owners: ['naptar'], watchers: ['demo'], title: 'MR, bal boka, altatással', created: { at: '2026-11-03T11:00', by: 'demo' },
    data: { exam: 'MR', region: 'bal boka', from: '2026-11-30', to: '2026-12-23', anesthesia: true } });
  task(w, { id: 't8', c: 'k13', text: 'Aneszteziológiai előjegyzés egyeztetése', owner: 'naptar', due: '2026-11-13', created: by('naptar', '2026-11-04T09:00') });
  task(w, { id: 't9', c: 'k13', text: 'Tolmács egyeztetése a családdal', owner: 'naptar', due: '2026-11-14', created: by('naptar', '2026-11-04T09:00') });
  task(w, { id: 't10', c: 'k13', text: 'Altatás előtti vizsgálat időpontja', owner: 'naptar', due: '2026-11-15', created: by('naptar', '2026-11-04T09:00') });
  task(w, { id: 't11', c: 'k13', text: 'A család tájékoztatása az altatás előtti teendőkről', owner: 'kotes', due: '2026-11-18', created: by('naptar', '2026-11-04T09:10') });
  kase(w, { id: 'k14', p: 'p5', type: 'd2t', step: 'nap', owners: ['demo', 'vazlat'], due: '2026-11-24', meeting: '2026-11-17', title: 'Terápiaváltás: rituximab mérlegelése',
    created: { at: '2026-11-12T10:00', by: 'demo' }, data: { question: 'Terápiaváltás: rituximab mérlegelése', summary: 'A jelenlegi kezelés mellett is aktív betegség.' },
    his: [{ kind: 'irat', ref: 'K-121212' }] });
  kase(w, { id: 'k15', p: 'p5', type: 'vizsgalat', step: 'idop', owners: ['naptar'], waitSince: '2026-11-03', title: 'MR, koponya', created: { at: '2026-11-02T10:00', by: 'demo' },
    data: { exam: 'MR', region: 'koponya', from: '2026-11-16', to: '2026-12-31', anesthesia: false } });
  task(w, { id: 't12', c: 'k15', text: 'Kontrasztanyag-beleegyezés aláíratása', owner: 'naptar', due: '2026-11-09', created: by('naptar', '2026-11-03T09:00') });
  task(w, { id: 't13', c: 'k15', text: 'Vesefunkció ellenőrzése a HIS-ben', owner: 'naptar', due: '2026-11-09', created: by('naptar', '2026-11-03T09:00') });
  task(w, { id: 't14', c: 'k15', text: 'Időpont sürgetése a radiológián', owner: 'naptar', due: '2026-11-15', created: by('naptar', '2026-11-10T09:00') });
  kase(w, { id: 'k16', p: 'p3', type: 'labor', step: 'var', owners: ['gyakorlo'], watchers: ['vazlat'], waitSince: '2026-11-13', created: { at: '2026-11-13T10:00', by: 'gyakorlo' },
    data: { test: 'HLA-B27', requestedOn: '2026-11-13', expectedOn: '2026-11-20', notify: 'vazlat' }, his: [{ kind: 'kérés', ref: 'K-131313' }] });
  kase(w, { id: 'k17', p: 'p3', type: 'vizsgalat', step: 'ert', owners: ['naptar'], watchers: ['vazlat'], title: 'MR, sacroiliacalis ízületek', created: { at: '2026-11-02T10:00', by: 'vazlat' },
    data: { exam: 'MR', region: 'sacroiliacalis ízületek', from: '2026-11-16', to: '2026-12-11', appointment: '2026-11-24', anesthesia: false } });
  task(w, { id: 't15', c: 'k17', text: 'Előkészítő tájékoztató küldése a családnak', owner: 'naptar', due: '2026-11-11', created: by('naptar', '2026-11-05T09:00') });
  kase(w, { id: 'k18', p: 'p4', type: 'radio', step: 'bej', owners: ['sablon'], meeting: '2026-11-19', triage: 'megbeszéljük', created: { at: '2026-11-16T13:00', by: 'sablon' },
    data: { question: 'Kontroll egésztest-MR: van-e új góc?', region: 'egésztest', summary: '' } });
  kase(w, { id: 'k19', p: 'p4', type: 'vizsgalat', step: 'vizs', owners: ['naptar'], title: 'Egésztest-MR, kontroll', created: { at: '2026-10-15T10:00', by: 'sablon' },
    data: { exam: 'MR', region: 'egésztest', from: '2026-10-20', to: '2026-11-20', appointment: '2026-11-12', anesthesia: false },
    his: [{ kind: 'lelet', ref: 'K-191919' }], labels: ['CNO'], closed: { reason: 'teljesült', at: '2026-11-12T15:00', by: 'naptar' } });
  kase(w, { id: 'k20', p: 'p7', type: 'labor', step: 'var', owners: ['ideg'], waitSince: '2026-11-16', startedAs: 'fekvő', appearance: 'a3', created: { at: '2026-11-16T09:00', by: 'ideg' },
    data: { test: 'Valproát-szintmérés', requestedOn: '2026-11-16', expectedOn: '2026-11-17', notify: 'ideg' } });
  kase(w, { id: 'k21', p: 'p7', type: 'vizsgalat', step: 'eloj', owners: ['hullam'], watchers: ['ideg'], title: 'EEG, alvásmegvonásos', startedAs: 'fekvő', appearance: 'a3',
    created: { at: '2026-11-15T11:00', by: 'ideg' }, data: { exam: 'EEG', from: '2026-11-18', to: '2026-11-20' } });
  kase(w, { id: 'k22', p: null, profile: 'gyr', area: 'mr', type: 'altalanos', owners: ['naptar'], due: '2026-11-20', title: 'Altatásos MR-napok egyeztetése decemberre',
    created: { at: '2026-11-12T09:00', by: 'naptar' } });
  kase(w, { id: 'k23', p: 'p2', type: 'engedely', step: 'elok', owners: ['urlap'], created: { at: '2026-11-16T10:00', by: 'urlap' },
    data: { drug: 'adalimumab', indication: 'oligoartikuláris JIA', reqType: 'új', offLabel: false } });
  kase(w, { id: 'k24', p: 'p3', type: 'engedely', step: 'neak', owners: ['urlap'], waitSince: '2026-11-05', created: { at: '2026-10-20T10:00', by: 'urlap' },
    data: { drug: 'etanercept', indication: 'enthesitis-asszociált JIA', reqType: 'hosszabbítás', offLabel: false, sentOn: '2026-11-05' } });

  duty(w, { id: 'y1', p: 'p8', profile: 'gyr', c: 'k5', text: 'Esti labor megjött? Ha nem: sürgetni', by: 'demo', at: '2026-11-16T15:40', due: '2026-11-16T22:00',
    accepted: by('sablon', '2026-11-16T16:05'), note: 'Megjött, a HIS-ben van.', closed: by('sablon', '2026-11-16T21:50') });
  duty(w, { id: 'y2', p: 'p2', profile: 'gyr', text: 'Szülő visszahívása: a csütörtöki injekció előtti teendők', by: 'demo', at: '2026-11-16T17:20', due: '2026-11-16T20:00' });
  duty(w, { id: 'y3', p: 'p7', profile: 'gyn', c: 'k20', text: 'Szintmérés megjött? Ha nem: labor', by: 'ideg', at: '2026-11-17T07:45', due: '2026-11-17T22:00' });
  duty(w, { id: 'y4', p: null, profile: 'gyn', text: 'Az EEG-labor gépe éjjel szervizre megy; reggel nézd meg, visszakerült-e', by: 'ideg', at: '2026-11-17T07:50', due: '2026-11-18T08:00' });
  duty(w, { id: 'y5', dir: 'from', p: 'p8', profile: 'gyr', text: 'Reggel kérjetek kontroll vérképet; a kérőlapot előkészítettem a HIS-ben.', by: 'sablon', at: '2026-11-17T02:10', due: '2026-11-17T10:00' });
  /* A kapcsolatok mindkét végükről látszanak: a csípő-konzíliumból indult a kontroll-MR, és a bejelentés a megbeszélt MR-re hivatkozott;
     Teszt Elek konzíliumi esetéből indult a kontroll-MR, és a bejelentés a térd-MR-re hivatkozott */
  rel(w, 'kapcsolodik', 'k8', 'k9', '2026-05-11T10:00', 'demo');
  rel(w, 'ebbol', 'k8', 'k7', '2026-05-14T15:10', 'demo');
  rel(w, 'kapcsolodik', 'k10', 'k12', '2026-11-02T10:00', 'demo');
  rel(w, 'ebbol', 'k10', 'k11', '2026-11-05T15:00', 'demo');
  w.prefs = { valto: { mode: 'leader', lastBy: { leader: '#/osszesito' } }, sablon: { mode: 'work', lastBy: { work: '#/ugyelet' } } };
  w.seq = 100;
  return w;
}

/* ---------------- A forgatókönyvek kiinduló állapota ---------------- */
function skeleton(clock, name, ids) { const w = world(clock, name); patients(w, ids); w.seq = 100; return w; }
const ALL_BUT_VILMA = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

const scen = {};
scen.F1 = () => skeleton('2026-11-13T09:00', 'F1');
scen.F1c = () => {
  const w = skeleton('2027-01-13T08:00', 'F1c');
  kase(w, { id: 'k1', p: 'p1', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-11-13T09:10', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'JIA-asszociált uveitis', reqType: 'új', offLabel: true, sentOn: '2026-07-01', decidedOn: '2026-09-15', expiresOn: '2027-01-12' } });
  w.fired['engedely:k1:2027-01-12'] = true;
  return w;
};
scen.F2 = () => skeleton('2026-11-10T10:00', 'F2');
scen.F3 = () => {
  const w = skeleton('2026-11-16T09:00', 'F3');
  kase(w, { id: 'k12', p: 'p2', type: 'vizsgalat', step: 'vizs', owners: ['naptar'], watchers: ['demo'], title: 'MR, jobb térd, altatással', created: { at: '2026-10-20T10:00', by: 'demo' },
    data: { exam: 'MR', region: 'jobb térd', from: '2026-10-21', to: '2026-11-20', appointment: '2026-11-13', anesthesia: true },
    his: [{ kind: 'kérés', ref: 'K-848484' }, { kind: 'lelet', ref: 'K-444444' }], closed: { reason: 'teljesült', at: '2026-11-13T15:00', by: 'naptar' } });
  kase(w, { id: 'k8', p: 'p8', type: 'radio', step: 'ten', owners: ['demo'], meeting: '2026-05-14', triage: 'megbeszéljük', created: { at: '2026-05-11T10:00', by: 'demo' },
    data: { question: 'Mindkét csípő: aktív-e a gyulladás?', region: 'mindkét csípő', summary: 'Csípőfájdalom.' }, decision: 'Mérsékelt synovitis mindkét csípőben; kontroll-MR fél év múlva.',
    discussedAt: '2026-05-14T14:00', decidedAt: '2026-05-14T15:10', labels: ['szisztémás JIA', 'synovitis'], closed: { reason: 'teljesült', at: '2026-05-20T09:00', by: 'demo' } });
  kase(w, { id: 'k30', p: 'p4', type: 'radio', step: 'ten', owners: ['sablon'], meeting: '2026-05-07', triage: 'megbeszéljük', created: { at: '2026-05-04T10:00', by: 'sablon' },
    data: { question: 'Egésztest-MR: aktív gócok?', region: 'egésztest', summary: 'Fájdalom a bal combcsontban.' }, decision: 'Két aktív góc; kezelés folytatása, kontroll fél év múlva.',
    discussedAt: '2026-05-07T14:00', decidedAt: '2026-05-07T15:00', labels: ['CNO', 'csontvelőödéma'], closed: { reason: 'teljesült', at: '2026-05-12T09:00', by: 'sablon' } });
  return w;
};
scen.F4 = () => skeleton('2026-11-12T10:00', 'F4');
scen.F5 = () => skeleton('2026-11-11T09:00', 'F5');
scen.F6 = () => {
  const w = skeleton('2026-11-16T10:00', 'F6');
  kase(w, { id: 'k4', p: 'p6', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-06-25T10:00', by: 'urlap' },
    data: { drug: 'adalimumab', indication: 'poliartikuláris JIA', reqType: 'hosszabbítás', offLabel: false, decidedOn: '2026-06-25', expiresOn: '2027-06-30' } });
  return w;
};
scen.F7 = () => {
  const w = skeleton('2026-11-17T15:25', 'F7');
  adm(w, { id: 'a3', p: 'p7', profile: 'gyn', kind: 'adm', start: '2026-11-15', caseId: 'k21' });
  kase(w, { id: 'k21', p: 'p7', type: 'vizsgalat', step: 'eloj', owners: ['hullam'], watchers: ['ideg'], title: 'EEG, alvásmegvonásos', startedAs: 'fekvő', appearance: 'a3',
    created: { at: '2026-11-15T11:00', by: 'ideg' }, data: { exam: 'EEG', from: '2026-11-18', to: '2026-11-20' } });
  kase(w, { id: 'k20', p: 'p7', type: 'labor', step: 'var', owners: ['ideg'], waitSince: '2026-11-16', startedAs: 'fekvő', appearance: 'a3', created: { at: '2026-11-16T09:00', by: 'ideg' },
    data: { test: 'Valproát-szintmérés', requestedOn: '2026-11-16', expectedOn: '2026-11-17', notify: 'ideg' } });
  task(w, { id: 't20', c: 'k20', text: 'Szülő tájékoztatása a szintmérésről', owner: 'hullam', due: '2026-11-18', created: by('ideg', '2026-11-16T09:05') });
  kase(w, { id: 'k6', p: 'p8', type: 'labor', step: 'var', owners: ['demo'], waitSince: '2026-11-10', created: { at: '2026-11-10T10:20', by: 'demo' },
    data: { test: 'Varicella-szerológia', requestedOn: '2026-11-10', expectedOn: '2026-11-19', notify: 'demo' } });
  w.prefs = { sablon: { mode: 'work', lastBy: { work: '#/sajat' } } };
  return w;
};
scen.F8 = () => {
  const w = skeleton('2026-11-10T09:00', 'F8');
  kase(w, { id: 'k7', p: 'p8', type: 'vizsgalat', step: 'idop', owners: ['naptar'], watchers: ['demo'], waitSince: '2026-11-03', title: 'Kontroll-MR, mindkét csípő',
    created: { at: '2026-11-03T13:00', by: 'demo' }, data: { exam: 'MR', region: 'mindkét csípő', from: '2026-11-23', to: '2026-12-18', anesthesia: false } });
  kase(w, { id: 'k6', p: 'p8', type: 'labor', step: 'var', owners: ['demo'], waitSince: '2026-11-03', created: { at: '2026-11-03T10:20', by: 'demo' },
    data: { test: 'Varicella-szerológia', requestedOn: '2026-11-03', expectedOn: '2026-11-12', notify: 'demo' } });
  return w;
};
scen.F9 = () => {
  const w = skeleton('2027-02-15T10:00', 'F9');
  adm(w, { id: 'a9', p: 'p8', kind: 'visit', start: '2026-08-10', caseId: 'k44' });
  kase(w, { id: 'k40', p: 'p1', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-11-13T09:10', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'JIA-asszociált uveitis', reqType: 'új', offLabel: true, sentOn: '2026-07-01', decidedOn: '2026-09-15', expiresOn: '2027-01-12' },
    files: [{ name: 'kitalalt-hatarozat.pdf', at: '2026-11-13T09:12', by: 'urlap' }],
    history: [{ at: '2026-11-13T09:10', by: 'urlap', text: 'Felvéve a tényleges lépésben (kezdő feltöltés): érvényes' }],
    closed: { reason: 'megújítva', at: '2027-01-02T10:00', by: 'urlap' } });
  kase(w, { id: 'k41', p: 'p1', type: 'engedely', step: 'erv', owners: ['urlap'], prev: 'k40', created: { at: '2026-11-18T09:00', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'JIA-asszociált uveitis', reqType: 'hosszabbítás', offLabel: true, sentOn: '2026-11-22', decidedOn: '2027-01-02', expiresOn: '2028-01-10' },
    files: [{ name: 'kitalalt-kerelem.pdf', at: '2026-11-21T11:00', by: 'demo' }, { name: 'kitalalt-hatarozat.pdf', at: '2027-01-02T10:00', by: 'urlap' }],
    history: [{ at: '2026-11-18T09:00', by: 'urlap', text: 'Hosszabbítás indítva az előző engedélyből; lépés: előkészítendő' },
      { at: '2026-11-21T11:00', by: 'demo', text: 'Lépés: beküldésre kész' }, { at: '2026-11-22T10:00', by: 'urlap', text: 'Lépés: OGYÉI-nél' },
      { at: '2026-12-06T10:00', by: 'urlap', text: 'Lépés: NEAK-kérelem készül' }, { at: '2026-12-07T10:00', by: 'urlap', text: 'Lépés: NEAK-nál' },
      { at: '2027-01-02T10:00', by: 'urlap', text: 'Lépés: érvényes; az előző engedély „megújítva” okkal lezárult' }] });
  kase(w, { id: 'k42', p: 'p8', type: 'engedely', step: 'neak', owners: ['urlap'], created: { at: '2026-03-02T09:00', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'szisztémás JIA', reqType: 'új', offLabel: true, sentOn: '2026-03-10' },
    closed: { reason: 'elutasítva', at: '2026-04-14T10:00', by: 'urlap' } });
  kase(w, { id: 'k43', p: 'p8', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-08-10T09:00', by: 'urlap' },
    data: { drug: 'tocilizumab', indication: 'szisztémás JIA', reqType: 'új', offLabel: false, sentOn: '2026-08-12', decidedOn: '2026-09-20', expiresOn: '2027-09-20' } });
  kase(w, { id: 'k44', p: 'p8', type: 'labor', step: 'atn', owners: ['demo'], appearance: 'a9', created: { at: '2026-08-10T10:00', by: 'demo' },
    data: { test: 'IL-6', requestedOn: '2026-08-10', expectedOn: '2026-08-17' }, closed: { reason: 'teljesült', at: '2026-08-18T10:00', by: 'demo' } });
  kase(w, { id: 'k45', p: 'p2', type: 'radio', step: 'ten', owners: ['demo'], meeting: '2026-11-19', triage: 'megbeszéljük', created: { at: '2026-11-16T10:00', by: 'demo' },
    data: { question: 'Aktív-e a synovitis, indokolt-e ízületi injekció?', region: 'jobb térd', summary: 'Jobb térd duzzanata hat hete; az MR elkészült.', ortho: false },
    his: [{ kind: 'felvétel', ref: 'K-444444' }], decision: 'Aktív synovitis; intraartikuláris szteroid a jobb térdbe.', discussedAt: '2026-11-19T14:00', decidedAt: '2026-11-19T14:20',
    labels: ['oligoartikuláris JIA', 'synovitis'], files: [{ name: 'kitalalt-konziliumi-osszefoglalo.pdf', at: '2026-11-16T10:05', by: 'demo' }, { name: 'kitalalt-mr-kivagat.png', at: '2026-11-19T14:25', by: 'demo' }],
    closed: { reason: 'teljesült', at: '2026-12-01T09:00', by: 'demo' } });
  kase(w, { id: 'k46', p: 'p3', type: 'radio', step: 'ten', owners: ['vazlat'], meeting: '2026-11-19', triage: 'megbeszéljük', created: { at: '2026-11-16T11:00', by: 'vazlat' },
    data: { question: 'A sacroiliacalis ízületek gyulladásos aktivitása', region: 'sacroiliacalis ízületek', summary: 'Derékfájdalom.', ortho: false },
    decision: 'Nincs aktív gyulladás; teendő nincs.', discussedAt: '2026-11-19T14:25', decidedAt: '2026-11-19T14:30', closed: { reason: 'teljesült', at: '2026-11-19T14:30', by: 'vazlat' } });
  kase(w, { id: 'k47', p: 'p5', type: 'd2t', step: 'eld', owners: ['demo', 'vazlat'], meeting: '2026-11-17', title: 'Terápiaváltás: rituximab mérlegelése', created: { at: '2026-11-12T10:00', by: 'demo' },
    data: { question: 'Terápiaváltás: rituximab mérlegelése', summary: 'A jelenlegi kezelés mellett is aktív betegség.' },
    decision: 'Terápiaváltás: rituximab indikáción túli alkalmazása; az engedélykérelem előkészítése.', participants: ['demo', 'vazlat', 'keret'], discussedAt: '2026-11-17T13:00', decidedAt: '2026-11-17T13:20',
    closed: { reason: 'teljesült', at: '2026-11-24T12:00', by: 'demo' } });
  task(w, { id: 't40', c: 'k47', text: 'Engedélykérelem előkészítése', owner: 'urlap', due: '2026-11-24', done: by('demo', '2026-11-17T13:20'), spawned: 'k48', created: by('demo', '2026-11-17T13:20') });
  task(w, { id: 't41', c: 'k47', text: 'Megbeszélés a családdal', owner: 'demo', due: '2026-11-27', done: by('demo', '2026-11-24T12:00'), created: by('demo', '2026-11-17T13:20') });
  kase(w, { id: 'k48', p: 'p5', type: 'engedely', step: 'erv', owners: ['urlap'], created: { at: '2026-11-17T13:20', by: 'demo' },
    data: { drug: 'rituximab', indication: 'szisztémás lupus erythematosus', reqType: 'új', offLabel: true, decidedOn: '2027-01-20', expiresOn: '2028-01-20' } });
  rel(w, 'hosszabbitas', 'k40', 'k41', '2026-11-18T09:00', 'urlap');
  rel(w, 'ebbol', 'k47', 'k48', '2026-11-17T13:20', 'demo');
  kase(w, { id: 'k49', p: 'p6', type: 'vizsgalat', step: 'eloj', owners: ['naptar'], title: 'MR, bal csukló', created: { at: '2027-02-15T09:40', by: 'naptar' },
    data: { exam: 'MR', region: 'bal csukló', anesthesia: false }, note: 'Tévedésből ennél a betegnél rögzítve.' });
  kase(w, { id: 'k50', p: 'p7', type: 'engedely', step: 'erv', owners: ['ideg'], created: { at: '2026-10-01T09:00', by: 'ideg' },
    data: { drug: 'kannabidiol', indication: 'epilepszia', reqType: 'új', offLabel: false, expiresOn: '2027-10-01' } });
  w.audit = [
    { at: '2026-11-13T09:08', by: 'urlap', act: 'kártya', pid: 'p1' }, { at: '2026-11-17T08:20', by: 'demo', act: 'kártya', pid: 'p1' },
    { at: '2026-11-18T09:00', by: 'urlap', act: 'kártya', pid: 'p1' }, { at: '2026-11-21T10:58', by: 'demo', act: 'kártya', pid: 'p1' },
    { at: '2026-11-21T11:02', by: 'demo', act: 'csatolmány', pid: 'p1', detail: 'kitalalt-kerelem.pdf' }, { at: '2026-11-11T09:30', by: 'gyakorlo', act: 'kártya', pid: 'p1' },
    { at: '2026-11-16T10:40', by: 'gyakorlo', act: 'kártya', pid: 'p1' }, { at: '2027-01-02T10:01', by: 'urlap', act: 'csatolmány', pid: 'p1', detail: 'kitalalt-hatarozat.pdf' }
  ];
  return w;
};
scen.F10 = () => skeleton('2026-11-16T09:00', 'F10', ALL_BUT_VILMA);
/* Az előkészítés (E): a D napja, a szabad próba ügyeivel és Képzelt Kornéllal, az új ügytípus betegével. Két eltéréssel:
   - a gyermekneurológiát az üzemeltető most hozta létre: nincs áreája, ügytípusa, betege; első adminja dr. Ideg Imre,
     és Hullám Hédi nővérként kérte, hogy a profilhoz rendeljék (E 1.);
   - a gyermekreumatológiának még nincs megbeszélése, ezért konzíliumi és D2T-esete sincs (E 2.). */
scen.E = () => {
  const w = base('E'); patients(w, ['p10']);
  const gone = {}; w.cases.forEach(c => { if (c.profileId === 'gyn' || cfg.types[c.type].meeting) gone[c.id] = 1; });
  w.cases = w.cases.filter(c => !gone[c.id]); w.rels = w.rels.filter(r => !gone[r.from] && !gone[r.to]);
  w.tasks = w.tasks.filter(t => !gone[t.caseId]);
  w.duty = w.duty.filter(y => y.profileId !== 'gyn'); w.appearances = w.appearances.filter(a => a.profileId !== 'gyn');
  w.patients = w.patients.filter(p => p.id !== 'p7'); w.cares = w.cares.filter(g => g.profileId !== 'gyn');
  w.areas = w.areas.filter(a => a.profile !== 'gyn');
  w.variants = w.variants.filter(v => v.profile !== 'gyn' && !v.flow).concat(TPL.fresh('gyn'));
  w.series = [];
  w.admins = [{ id: 'm0', user: 'ideg', profile: 'gyn', by: 'uzemelteto', at: '2026-11-16T14:00', first: true, ver: 1 }];
  w.accounts = [{ id: 'hullam', name: 'Hullám Hédi', email: cfg.mailOf('Hullám Hédi'), req: { role: 'nővér', profile: 'gyn', dept: null }, status: 'pending', at: '2026-11-16T15:20', decided: null, ver: 1 }];
  return w;
};

BT.worlds = { base: () => base(), scen };
})();
