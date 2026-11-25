
/* sugo.js · A Fonal Súgója: szűrés szerepkörre és témára, szabad szöveges keresés, mélylink (#kártya).
   JavaScript nélkül minden kártya látszik, témák szerint; a szűrő ezzel a szkripttel jelenik meg.
   Ugyanez a fájl fut a rendszerben és a prototípus Súgójában: csak a lapon lévő jelölésre támaszkodik. */
(function () {
  'use strict';
  const root = document.querySelector('[data-sugo]');
  if (!root) return;
  const form = root.querySelector('[data-sugo-szuro]');
  const input = root.querySelector('#sugo-kereses');
  const themeSel = root.querySelector('#sugo-tema');
  const roles = [...root.querySelectorAll('input[name="szerep"]')];
  const status = root.querySelector('#sugo-szam');
  const startBox = root.querySelector('[data-sugo-kezdd]');
  const resultBox = root.querySelector('[data-sugo-talalatok]');
  const empty = root.querySelector('[data-sugo-ures]');
  const elsewhere = root.querySelector('[data-sugo-mashol]');
  const sections = [...root.querySelectorAll('[data-tema-szakasz]')];
  // Kisbetű, ékezet nélkül, írásjelek helyett szóköz: az „átadni” és az „atadni” ugyanaz.
  const norm = s => (s || '').toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const text = (el, sel) => [...el.querySelectorAll(sel)].map(x => x.textContent).join(' ');
  const cards = [...root.querySelectorAll('[data-kartya]')].map((el, i) => {
    const kw = el.dataset.kulcsszavak || '';
    return {
      el, i, id: el.id, li: el.parentElement, home: el.parentElement.parentElement,
      summary: el.querySelector('summary'),
      roles: new Set((el.dataset.szerepkorok || '').split(' ').filter(Boolean)),
      theme: el.dataset.tema || '',
      head: norm(text(el, '.sugo-k') + ' ' + kw),
      all: norm(text(el, '.sugo-k, .sugo-r, [data-keresheto]') + ' ' + kw)
    };
  });
  const byId = new Map(cards.map(c => [c.id, c]));
  const words = q => norm(q).split(' ').filter(w => w.length > 1);
  // Egyszerű szótő: hosszabb szónál a végéről két betű elhagyható (átadni → átad, kiutalni → kiutal, figyelt → figyel).
  const has = (hay, w) => hay.includes(w) || (w.length >= 6 && hay.includes(w.slice(0, -2)));
  // 2: minden szó a címben vagy a kulcsszavakban; 1: valahol a kártyán; 0: nincs találat.
  const score = (c, ws) => !ws.every(w => has(c.all, w)) ? 0 : ws.every(w => has(c.head, w)) ? 2 : 1;
  const roleName = r => r.closest('label').textContent.trim();
  let timer = 0;

  function current() {
    const role = roles.find(r => r.checked) || roles[0];
    return { role, roleId: role.value, theme: themeSel.value, ws: words(input.value), q: input.value.trim() };
  }
  function apply() {
    const s = current();
    const fits = c => (!s.roleId || c.roles.has(s.roleId)) && (!s.theme || c.theme === s.theme);
    let shown, special = [], box = null;
    if (s.ws.length) {
      shown = cards.filter(fits).map(c => [c, score(c, s.ws)]).filter(x => x[1] > 0)
        .sort((a, b) => b[1] - a[1] || a[0].i - b[0].i).map(x => x[0]);
      special = shown;
      box = resultBox;
    } else {
      shown = cards.filter(fits);
      if (s.roleId) {
        special = (s.role.dataset.kezdd || '').split(' ').map(id => byId.get(id)).filter(c => c && shown.includes(c));
        if (special.length) box = startBox;
      }
    }
    const visible = new Set(shown), moved = new Set(special);
    // A kártya mindig a helyére kerül vissza (eredeti sorrend), csak a Kezdd itt és a Találatok kártyái költöznek.
    for (const c of cards) {
      c.li.hidden = !visible.has(c);
      if (!moved.has(c)) c.home.appendChild(c.li);
    }
    if (box) {
      const list = box.querySelector('[data-lista]');
      for (const c of special) list.appendChild(c.li);
      box.querySelector('.count').textContent = special.length;
    }
    startBox.hidden = box !== startBox;
    resultBox.hidden = box !== resultBox;
    for (const sec of sections) {
      const n = [...sec.querySelectorAll('[data-lista] > li')].filter(li => !li.hidden).length;
      sec.querySelector('.count').textContent = n;
      sec.hidden = box === resultBox || n === 0;
    }
    const none = s.ws.length > 0 && shown.length === 0;
    empty.hidden = !none;
    if (none) empty.querySelector('[data-sugo-kifejezes]').textContent = s.q;
    const hidden = s.ws.length ? cards.filter(c => score(c, s.ws) > 0).length - shown.length : 0;
    elsewhere.hidden = hidden === 0;
    elsewhere.querySelector('[data-sugo-mashol-szam]').textContent = hidden;
    return { s, n: shown.length, start: box === startBox ? special.length : 0 };
  }
  function say(r) {
    const parts = [];
    if (r.s.roleId) parts.push(roleName(r.s.role));
    if (r.s.theme) parts.push(themeSel.selectedOptions[0].textContent);
    const where = parts.length ? ' · ' + parts.join(' · ') : '';
    status.textContent = r.s.ws.length
      ? (r.n ? r.n + ' találat' : 'Nincs találat') + where
      : r.n + ' kártya' + where + (r.start ? ' · ebből ' + r.start + ' a Kezdd itt részben' : '');
  }
  // Gépelés közben a lista azonnal szűkül; a képernyőolvasónak csak a gépelés szünetében mondjuk el az eredményt.
  function update(delay) {
    const r = apply();
    clearTimeout(timer);
    if (delay) timer = setTimeout(() => say(r), delay); else say(r);
  }
  function showAll() { roles[0].checked = true; themeSel.value = ''; }
  // Mélylink: a #kártya kinyílik és fókuszt kap; ha a szűrés elrejtené, a szűrés törlődik.
  function openTarget(focus) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const c = byId.get(id);
    if (!c) return;
    if (c.li.hidden) { showAll(); input.value = ''; update(0); }
    c.el.open = true;
    if (!focus) return;
    c.el.scrollIntoView({ block: 'start' });
    c.summary.focus({ preventScroll: true });
  }

  form.hidden = false;
  root.classList.add('is-js');
  const toc = root.querySelector('[data-sugo-tartalom]');
  if (toc) toc.hidden = true;
  // Kezdő szerepkör: a rendszerben a néző szerepköre (data-kezdo-szerep), a prototípusban a ?szerep= paraméter.
  const asked = new URLSearchParams(location.search).get('szerep');
  const first = asked !== null ? asked : (root.dataset.kezdoSzerep || '');
  (roles.find(r => r.value === first) || roles[0]).checked = true;
  update(0);
  form.addEventListener('submit', e => e.preventDefault());
  input.addEventListener('input', () => update(600));
  themeSel.addEventListener('change', () => update(0));
  for (const r of roles) r.addEventListener('change', () => update(0));
  root.querySelector('[data-sugo-mind]').addEventListener('click', () => { showAll(); update(0); input.focus(); });
  window.addEventListener('hashchange', () => openTarget(true));
  // Betöltéskor a kártya azonnal kinyílik; a görgetés és a fókusz a böngésző saját horgonyugrása után jön, különben az elvenné.
  if (location.hash.length > 1) {
    openTarget(false);
    const later = () => requestAnimationFrame(() => openTarget(true));
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  }
})();
