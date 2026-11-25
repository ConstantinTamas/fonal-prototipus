/* A Súgó jelölése közös a generált HTML-ben és a böngészőben. A szűrést a sugo.js végzi. */
(function (render) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = render;
  else {
    const main = document.getElementById('tartalom');
    if (main && window.FONAL_SUGO) main.innerHTML = render(window.FONAL_SUGO);
  }
})(function (data) {
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const text = value => esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const svg = body => `<svg class="ico" aria-hidden="true" focusable="false" viewBox="0 0 24 24">${body}</svg>`;
  const check = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
  const categories = {
    open: ['ny', 'nyitott', '<circle cx="12" cy="12" r="8"/>'],
    progress: ['f', 'folyamatban', '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>'],
    waiting: ['v', 'várakozik', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v4.5l3 2"/>'],
    done: ['k', 'kész', '<circle cx="12" cy="12" r="8.5"/><path d="M8.25 12.25l2.5 2.5 5-5"/>'],
    closed: ['l', 'lezárt', '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M8.25 12.25l2.5 2.5 5-5" stroke="#FFFFFF"/>']
  };
  const byId = new Map(data.kartyak.map(c => [c.id, c]));
  const roles = new Map(data.szerepkorok.map(r => [r.id, r.nev.toLocaleLowerCase('hu')]));
  function sign(s) {
    if (s.fajta === 'lepes') {
      const [cls, name, icon] = categories[s.kategoria];
      return `<span class="pill pill-${cls}">${svg(icon)}${esc(s.felirat)}<span class="sr-only"> (${name})</span></span>`;
    }
    if (s.fajta === 'igen-nem') return `<span class="yn yn-${s.ertek === true ? 'yes' : s.ertek === false ? 'no' : 'none'}">${s.ertek === true ? check : ''}${esc(s.felirat)}: ${s.ertek === true ? 'igen' : s.ertek === false ? 'nem' : 'nincs megadva'}</span>`;
    return `<span class="sugo-keses"><span aria-hidden="true">⚠ </span>${esc(s.felirat)}</span>`;
  }
  function card(c) {
    const lists = (c.pontok_elol ? ['pontok', 'lepesek'] : ['lepesek', 'pontok']).map(kind => {
      const items = c[kind] || [], tag = kind === 'lepesek' ? 'ol' : 'ul';
      return items.length ? `${c[kind + '_cim'] ? `<h4>${text(c[kind + '_cim'])}</h4>` : ''}<${tag} class="sugo-${kind}">${items.map(s => `<li>${text(s)}</li>`).join('')}</${tag}>` : '';
    }).join('\n');
    const pic = c.kep;
    return `<li><details class="sugo-kartya" id="${esc(c.id)}" data-kartya data-szerepkorok="${esc(c.szerepkorok.join(' '))}" data-tema="${esc(c.tema)}" data-kulcsszavak="${esc(c.kulcsszavak.join(' '))}">
<summary><h3 class="sugo-k">${text(c.cim)}</h3><span class="sugo-r">${text(c.roviden)}</span><svg class="ico sugo-nyil" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></summary>
<div class="sugo-test"><div data-keresheto>
<p class="sugo-hol"><span class="sugo-cimke">Hol:</span> <span>${text(c.hol)}</span></p>
${c.jelek && c.jelek.length ? `<ul class="sugo-jelek">${c.jelek.map(s => `<li><span class="sugo-jel">${sign(s)}</span><span><strong>${text(s.nev)}</strong>: ${text(s.jelentes)}</span></li>`).join('')}</ul>` : ''}
${lists}
${c.jo_tudni ? `<p class="sugo-jo">${text(c.jo_tudni)}</p>` : ''}
${pic ? `<figure class="sugo-kep"><img src="${esc('kep/sugo/' + pic.fajl)}" width="${pic.szelesseg}" height="${pic.magassag}" alt="${esc(pic.alt)}" loading="lazy" decoding="async"><figcaption>${text(pic.felirat)}</figcaption></figure>` : ''}
</div>
${c.kapcsolodo.length ? `<p class="sugo-lasd"><span class="sugo-cimke">Lásd még:</span> ${c.kapcsolodo.map(id => `<a href="#${esc(id)}">${text(byId.get(id).cim)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : ''}
<p class="sugo-meta"><span>Kinek: ${esc(c.szerepkorok.map(id => roles.get(id)).join(', '))}</span><a href="#${esc(c.id)}">Link erre a kártyára</a></p>
</div></details></li>`;
  }
  return `<div class="page-head"><div><h1>Súgó</h1><p class="lede">Rövid válaszok a napi munka kérdéseire: mit látsz, miért, és mit tegyél.</p></div></div>
<div class="sugo" data-sugo data-kezdo-szerep="">
<form class="sugo-szuro" role="search" aria-label="Keresés és szűrés a súgóban" data-sugo-szuro hidden>
<div class="field"><label class="field-label" for="sugo-kereses">Keresés a súgóban</label><div class="sugo-kereso">${svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>')}<input id="sugo-kereses" class="text-input" type="search" placeholder="Például: átadni" autocomplete="off" spellcheck="false"></div></div>
<fieldset class="sugo-szerep"><legend>Kinek szól?</legend><div class="chips"><label class="chip"><input type="radio" name="szerep" value="" checked><span>Mindenki</span></label>${data.szerepkorok.map(r => `<label class="chip"><input type="radio" name="szerep" value="${esc(r.id)}" data-kezdd="${esc(r.kezdd_itt.join(' '))}"><span>${esc(r.nev)}</span></label>`).join('')}</div></fieldset>
<div class="field"><label class="field-label" for="sugo-tema">Téma</label><select id="sugo-tema" class="select"><option value="">Minden téma</option>${data.temak.map(t => `<option value="${esc(t.id)}">${esc(t.nev)}</option>`).join('')}</select></div>
<p class="sugo-szam" id="sugo-szam" role="status"></p>
</form><div class="sugo-fo">
<nav class="sugo-tartalom" aria-label="Témák" data-sugo-tartalom><ul>${data.temak.map(t => `<li><a href="#tema-${esc(t.id)}">${esc(t.nev)}</a></li>`).join('')}</ul></nav>
<section class="sugo-kezdd" data-sugo-kezdd aria-labelledby="h-kezdd" hidden><h2 class="group-title lg" id="h-kezdd">Kezdd itt <span class="count"></span></h2><p class="group-note">Ezekkel érdemes kezdeni.</p><ul class="sugo-lista" data-lista></ul></section>
<section class="sugo-talalatok" data-sugo-talalatok aria-labelledby="h-talalatok" hidden><h2 class="group-title lg" id="h-talalatok">Találatok <span class="count"></span></h2><ul class="sugo-lista" data-lista></ul>
<div class="sugo-ures" data-sugo-ures hidden><p>Nincs találat erre: „<span data-sugo-kifejezes></span>”. Próbálj rövidebb vagy másik szót.</p></div>
<p class="sugo-mashol" data-sugo-mashol hidden>Más szerepkörnél vagy témában <span data-sugo-mashol-szam></span> találat van. <button class="link-btn lg" type="button" data-sugo-mind>Keresés minden kártyában</button></p></section>
${data.temak.map(t => { const cards = data.kartyak.filter(c => c.tema === t.id); return `<section class="sugo-tema" id="tema-${esc(t.id)}" data-tema-szakasz="${esc(t.id)}" aria-labelledby="h-${esc(t.id)}"><h2 class="group-title lg" id="h-${esc(t.id)}">${esc(t.nev)} <span class="count">${cards.length}</span></h2><ul class="sugo-lista" data-lista>\n${cards.map(card).join('\n')}\n</ul></section>`; }).join('\n')}
<p class="sugo-labjegyzet">A képek kitalált adatokkal készültek.</p>
</div></div>`;
});
