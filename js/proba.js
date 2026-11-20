/* Fonal prototípus – a próba indítólapja: belépés kitalált fiókkal, a forgatókönyvek lejátszása.
   Ez a próba eszköze, nem a rendszer része: a rendszerben a felhasználóváltás a belépőlapra visz. */
(function () {
'use strict';
const BT = window.BT, T = BT.tar, D = BT.d, cfg = BT.cfg;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const chev = '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-chev"/></svg>';
const SPRITE = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol></svg>';

/* ---------------- Fiókok a szerepkörök szerint (C fejezet: a kezdőképernyők) ---------------- */
const MAIN = [
  ['Orvos', 'demo', 'Saját ügyeim'],
  ['Nővér', 'kotes', 'Teendőim: a saját teendők és az MR-előjegyzés munkalistája'],
  ['Asszisztens', 'urlap', 'Teendőim: a saját teendők és az engedélyek munkalistája'],
  ['Asszisztens', 'naptar', 'Teendőim: a saját teendők és az MR-előjegyzés munkalistája'],
  ['Ügyeletes', 'sablon', 'Ügyeleti lista (a legutóbbi nézete); egy kattintással vált a saját ügyeire'],
  ['Vezető', 'mutato', 'Összesítő: a klinika'],
  ['Vezető', 'telep', 'Összesítő: a Tűzoltó utcai részleg'],
  ['Kettős szerep', 'valto', 'A legutóbbi nézete; egy kattintással vált vezető és szakorvos között']
];
const OTHER = ['vazlat', 'gyakorlo', 'kiserlet', 'atmenet', 'keret', 'rend', 'ideg', 'hullam', 'kulcs'];

/* ---------------- A forgatókönyvek (elfogadasi-forgatokonyvek.md, E 4–7. lépés és F1–F10) ----------------
   Lépés: d = a 0. naptól számolt nap, vagy date = pontos nap; t = idő; who = a belépő fiók;
   route = ha nem a kezdőképernyőn kell indulni; reg = a regisztráció (kijelentkezve);
   name = egy regisztrált fiók, a neve szerint (az előző lépésekben jön létre). */
const SC = [
  { id: 'E', title: 'Előkészítés: új profil beállítása, megbeszélések, adminjog, új ügytípus, regisztráció', day0: '2026-11-17', pt: 'Képzelt Kornél; regisztrál: dr. Friss Fanni, Ismeretlen István, dr. Reflex Réka, Gondos Gabriella; a gyermekneurológiába: Hullám Hédi',
    intro: 'Az előkészítés (0. rész) 1–7. lépése, a D napján (nov. 17.). A gyermekneurológiát az üzemeltető most hozta létre: még nincs áreája, ügytípusa és betege; az első adminja dr. Ideg Imre, és Hullám Hédi tegnap kérte, hogy nővérként a profilhoz rendeljék. A gyermekreumatológiának még nincs megbeszélése. Az új ügytípus betege Képzelt Kornél (14 éves, oligoartikuláris JIA). A regisztrálóknak még nincs fiókjuk: a regisztráció a belépőlapról indul.',
    steps: [
      { t: '07:30', label: '1. · 7:30', who: 'ideg', do: 'Fent: Beállítások. Jóváhagyásra vár: Hullám Hédi → „Jóváhagyom: nővér”. Áreák → Új área: „Szakambulancia”, tagok: dr. Ideg Imre, Hullám Hédi → Létrehozom az áreát. Új área: „EEG-labor”, tag és alapértelmezett felelős: Hullám Hédi → Létrehozom az áreát.', exp: 'Hullám Hédi a profil nővére. A két área a munkalistákon; az EEG-labor új ügyei Hullám Hédit kapják felelősnek.' },
      { t: '07:45', label: '1. · 7:45', who: 'ideg', do: 'Beállítások → Ügytípusok és lépések (státuszok) → Az összes ügytípus: Terápiás engedély, Labor- és leletkövetés, Átadás más ellátóhoz: „Bekapcsolom: Szakambulancia”. Vizsgálat előjegyzése: Bekapcsolom, utána Módosítás: área: EEG-labor; Új vizsgálat: EEG → Hozzáadom a listához → Mentés.', exp: 'Mentés nélkül semmi nem változik; a kategória, a közös adatok és a fő adatok kötöttként látszanak. A vizsgálatlista: MR, EEG. Saját ügytípus nem kell.' },
      { t: '07:55', label: '1. · 7:55', who: 'ideg', do: 'Beállítások → Megbeszélések → Új megbeszélés: „Epilepszia-megbeszélés”; mint a konzílium; área: Szakambulancia; szerda; hetente; résztvevő: dr. Ideg Imre; a határidő marad (17:00) → „Felveszem: hetente szerdán”. Utána nézd meg a Közös nézeteket és az Emlékeztetőket: az alapértékek (8 hét, 2 hét, 3 hónap) jók.', exp: 'Az „Új ügy” menüben: vizsgálat előjegyzése (MR, EEG), labor- és leletkövetés, terápiás engedély, epilepszia-megbeszélés, átadás, általános teendő. A gyermekneurológia fejlesztés nélkül, beállítással jött létre.' },
      { t: '08:15', label: '2. · 8:15', who: 'keret', do: 'Beállítások → Megbeszélések → Új megbeszélés: „Radiológiai konzílium”; mint a konzílium; área: Radiológiai konzílium; csütörtök; hetente; résztvevők: dr. Demó Dóra, dr. Vázlat Viktor, dr. Sablon Sára, dr. Keret Kornél → Felveszem. Új megbeszélés: „D2T-megbeszélés”; mint a D2T; área: D2T-megbeszélés; kedd; hetente → Felveszem. Utána: Közös nézetek.', exp: 'A bejelentési határidő magától a megbeszélés előtti munkanap vége: szerda 17:00, illetve hétfő 17:00. A két área nézetei: Napirend, Dokumentálandó, Munkalista, illetve Napirend, Munkalista.' },
      { t: '08:30', label: '3. · 8:30', who: 'mutato', do: 'Összesítő: hol torlódik a munka?', exp: 'Az MR-előjegyzés áreájában: 10 lejárt tétel.' },
      { t: '09:00', label: '4. · 9:00', who: 'keret', do: 'Fent: Beállítások → Tagok: dr. Vázlat Viktor sorában Módosítás → „Adminjogot adok”.', exp: 'Dr. Vázlat Viktor admin; a sorában látszik, ki és mikor adta; 10 másodpercig visszavonható. Az osztályvezető és a vezetők külön kiosztás nélkül adminok.' },
      { t: '09:05', label: '4. · 9:05', who: 'vazlat', do: 'Fent: Beállítások → Tagok: valamelyik tag sorában Módosítás.', exp: 'Adminként sem tud adminjogot adni: a szerkesztőben nincs ilyen gomb, és a lap megmondja, hogy ezt az osztályvezető adja.' },
      { t: '09:10', label: '5. · 9:10', who: 'vazlat', do: 'Beállítások → Ügytípusok és lépések (státuszok) → Új ügytípus. Név: Tranzíciós felkészítés; área: Átadás felnőtt ellátásba. Lépések (Lépés hozzáadása): „Felkészítés kérve” (nyitott); „Felkészítő beszélgetések” (folyamatban); „Kérdőívre vár” (várakozik; kire várunk: szülő); „Felkészült” (kész). Előbb próbáld meg egy lépést kategória nélkül menteni; utána: Létrehozom az ügytípust.', exp: 'Kategória nélkül a lépés nem menthető: a hiba a mezőnél áll. Mentés után az ügytípus a listán áll a lépéseivel, és az „Új ügy” menüben azonnal választható.' },
      { t: '09:30', label: '5. · 9:30', who: 'atmenet', do: 'A keresőbe „képzelt” → Képzelt Kornél → Új ügy → Tranzíciós felkészítés; felelős: én; határidő: dec. 15. → Mentés. Utána az ügyén: Más lépés → Kérdőívre vár.', exp: 'A Saját ügyeim „Kire várunk?” részében áll: szülő, ma óta; az Átadás felnőtt ellátásba munkalistáján is.' },
      { t: '09:40', label: '5. · 9:40', who: 'keret', do: 'Összesítő → Ügytípus: Tranzíciós felkészítés.', exp: 'Egy nyitott, ebből egy várakozó ügy, az Átadás felnőtt ellátásba áreájában; a mutatók is ugyanúgy számolják.' },
      { t: '10:00', label: '6. · 10:00', reg: 1, do: 'Regisztráció: név: dr. Friss Fanni; e-mail: friss.fanni@semmelweis.hu; szerepkör: rezidens; profil: Gyermekreumatológia → „Elküldöm a kérést a profil adminjának”.', exp: 'A fiók belép, és azt látja, hogy a kérése jóváhagyásra vár.' },
      { t: '10:05', label: '6. · 10:05', name: 'dr. Friss Fanni', do: 'Nézd meg, mit lát; írd a címsorba a # után: /beteg/p1.', exp: 'Semmilyen betegadatot nem lát: nincs menü, kereső és lista, a betegkártya közvetlen címe sem nyílik meg.' },
      { t: '10:10', label: '6. · 10:10', reg: 1, do: 'Regisztráció: név: Ismeretlen István; e-mail: ismeretlen.istvan@semmelweis.hu; szerepkör: szakorvos; profil: Gyermekreumatológia → Elküldöm a kérést a profil adminjának.', exp: '' },
      { t: '10:20', label: '6. · 10:20', who: 'vazlat', do: 'Beállítások → Jóváhagyásra vár: dr. Friss Fanni, szerepkör: rezidens → „Jóváhagyom: rezidens”. Ismeretlen István → „Elutasítom”.', exp: 'Mindkettő 10 másodpercig visszavonható; utána az „Elbírálva” részben áll, névvel és időponttal.' },
      { t: '10:30', label: '6. · 10:30', name: 'dr. Friss Fanni', do: 'Belépés újra.', exp: 'A rezidens kezdőképernyője nyílik: Saját ügyeim.' },
      { t: '10:35', label: '6. · 10:35', name: 'Ismeretlen István', do: 'Belépés.', exp: 'Nem került a profilba; betegadatot továbbra sem lát.' },
      { t: '11:00', label: '7. · 11:00', reg: 1, do: 'Regisztráció: név: dr. Reflex Réka; e-mail: reflex.reka@semmelweis.hu; szerepkör: osztályvezető; profil: Gyermekneurológia → „Elküldöm a kérést a fő adminnak”.', exp: '' },
      { t: '11:02', label: '7. · 11:02', reg: 1, do: 'Regisztráció: név: Gondos Gabriella; szerepkör: főnővér; profil: Gyermekreumatológia. E-mail: előbb gondos.gabriella@gmail.com, utána gondos.gabriella@phd.semmelweis.hu, végül gondos.gabriella@semmelweis.hu → „Elküldöm a kérést a fő adminnak”.', exp: 'A magáncímet és az aldomaint nem fogadja el, és megmondja, miért. A szerepkörök között ott a főnővér; a részlegvezető és a részleg főnővére nincs köztük. A kérés a fő adminhoz kerül.' },
      { t: '11:05', label: '7. · 11:05', who: 'mutato', do: 'Fent: Beállítások → Gyermekreumatológia, utána Gyermekneurológia → Jóváhagyásra vár.', exp: 'Az igazgató alapból admin, de az osztályvezetői és a főnővéri kérés nincs itt: nem a profil adminjához kerül.' },
      { t: '11:10', label: '7. · 11:10', who: 'kulcs', do: 'Jóváhagyásra vár: dr. Reflex Réka → „Jóváhagyom: osztályvezető”; Gondos Gabriella → „Jóváhagyom: főnővér”.', exp: 'Mindkettő jóváhagyva; 10 másodperc után az „Elbírálva” részben, névvel és időponttal.' },
      { t: '11:20', label: '7. · 11:20', name: 'dr. Reflex Réka', do: 'Belépés; fent: Beállítások.', exp: 'Alapból a gyermekneurológia adminja: a tagoknak adminjogot is adhat.' },
      { t: '11:25', label: '7. · 11:25', name: 'Gondos Gabriella', do: 'Belépés; fent: Összesítő.', exp: 'A Teendőim nyílik, mint a nővérnek; a menüben az Összesítő, a gyermekreumatológia számaival. Más profil betegét nem látja, és alapból nem admin.' }
    ],
    note: 'A beállítások, az adminjog kiadása, az ügytípus létrehozása és a regisztrációk elbírálása a naplóba kerül: ki, mikor, mit. Regisztrálni csak @semmelweis.hu végű címmel lehet; a cím a belépési név. A regisztrált fiók lépésének gombja csak a regisztráció után működik.' },
  { id: 'F1', title: 'Egyedi méltányossági engedély lejárattal és megújítással', day0: '2026-11-13', pt: 'Próba Panna',
    intro: 'Próba Panna tocilizumab-engedélyét a kezdő feltöltéskor vesszük fel, a tényleges „érvényes” lépésben. A lejárat a 60. nap (2027. jan. 12.); az emlékeztető 8 héttel előtte szól.',
    steps: [
      { d: 0, t: '09:00', who: 'urlap', do: 'A keresőbe: „pró” → Próba Panna. A kártyán: Új ügy → Terápiás engedély. Gyógyszer: tocilizumab; kérelemtípus: új; indikáción túli: igen; lépés: érvényes; beküldés: 2026. júl. 1.; határozat: 2026. szept. 15.; érvényes eddig: 2027. jan. 12. → Mentés (a felelősnél nem kell választani: az engedélyek felelőse te vagy).', exp: 'Munkalisták → Egyedi méltányossági engedélyek → Lejáró engedélyek: ott áll, „kész” kategóriában.' },
      { d: 4, t: '08:00', who: 'urlap', do: 'Nézd meg a Teendőim tetejét. (Ugyanez dr. Demó Dórának, a kezelőorvosnak is szól.)', exp: 'Pontosan egy emlékeztető: jan. 12-én lejár, 8 hét múlva. A következő napokon nem jön újra.' },
      { d: 5, t: '09:00', who: 'urlap', do: 'Nyisd meg az engedélyt (az emlékeztetőből vagy a lejáró engedélyek közül), és kattints a „Hosszabbítás” gombra.', exp: 'Új engedélyügy indul az előző adataival: hosszabbítás, előkészítendő. Kapcsolt ügy: az oldalán „Innen indult: Tocilizumab-engedély · hosszabbítás · érvényes”, az előző engedélyen a „Kapcsolt ügyek” között. Semmit nem kell újra beírni.' },
      { d: 8, t: '10:00', who: 'demo', do: 'Próba Panna kártyáján nyisd meg a hosszabbítást: Fájl csatolása → kitalalt-kerelem.pdf; utána: Beküldésre kész.', exp: 'Az ügy beküldésre kész; a lépések története magától rögzíti, ki és mikor léptette.' },
      { d: 9, t: '09:00', who: 'urlap', do: 'A hosszabbításon: Beküldve… → a mai nap → Mentés.', exp: 'Az ügy az OGYÉI-nél várakozik: a „Kire várunk?” listán, a hatósággal és a várakozás napjaival. Az 5. és a 9. nap között az „Ezen dolgozz!” listán állt.' },
      { d: 23, t: '09:00', who: 'urlap', do: 'OGYÉI-engedély megjött… → Mentés; utána: Beküldve a NEAK-hoz… → Mentés.', exp: 'Az ügy a NEAK-nál várakozik.' },
      { d: 50, t: '09:00', who: 'urlap', do: 'Határozat megjött…: a határozat napja ma; érvényes eddig: 2028. jan. 10.; a határozat csatolva → Mentés.', exp: 'Az új engedély érvényes; a régi „megújítva” okkal lezárul. A kártya előzményei között mindkettő látszik; az újabb alatt: „Innen indult: Tocilizumab-engedély”.' },
      { d: 50, t: '09:30', who: 'keret', do: 'Összesítő → Mutatók (az időszakot állítsd „Ez a hónap”-ra).', exp: 'A „Lejárt engedély megújítás nélkül” mutató 0.' }
    ],
    variants: [
      { id: '1a', text: 'Nem indikáción túli: az 1. lépésben „indikáción túli: nem”. A „Beküldve…” után az ügy egyből a NEAK-hoz kerül; az OGYÉI-lépés kimarad (a lépéssávon sincs ott).' },
      { id: '1b', text: 'Elutasítás: a NEAK-nál várakozó ügyön Más lépés → Lezárás okkal → elutasítva. A lezárt ügyön „Új kérelem az elutasítottra hivatkozva”. Mindkét út működik.' },
      { id: '1c', world: 'F1c', at: '2027-01-13T08:00', who: 'urlap', text: 'Lejárat megújítás nélkül: a 61. nap, hosszabbítás nélkül.', exp: 'A régi engedély a Teendőim elején áll („1 napja lejárt”), új emlékeztető nem szól; az összesítőn (dr. Keret Kornél) az M1 1.' },
      { id: '1d', who: 'keret', text: 'Lépés átnevezése: dr. Keret Kornél (osztályvezető, alapból a profil adminja) → Beállítások → Ügytípusok és lépések (státuszok) → Terápiás engedély: Lépések és adatok → A lépések (státuszok) neve: „NEAK-nál” → „NEAK-nál, elbírálás alatt” → Mentés.', exp: 'Az ügy ugyanúgy a „Kire várunk?” listán marad; az emlékeztetők és a mutatók nem változnak.' }
    ] },
  { id: 'F2', title: 'MR-előjegyzés altatással', day0: '2026-11-10', pt: 'Teszt Elek',
    intro: 'Teszt Elek ambuláns vizitre jön a jobb térd duzzanata miatt. Térd-MR kell, altatásban, a következő hat hétben.',
    steps: [
      { d: 0, t: '10:00', who: 'demo', do: 'Teszt Elek kártyája → Új ügy → MR-előjegyzés. Régió: jobb térd; időablak: nov. 24. – dec. 22.; altatás: igen; HIS-hivatkozás a kérésre: K-848484; megjelenés: ambuláns vizit most. A felelősnél ne válassz: a gomb felirata „Kiadom Naptár Nórának” → kattints rá.', exp: 'Az ügy előjegyzendő; a vizit a kéréssel együtt, egy mozdulattal rögzült; az ügy „járó ellátásban indult”. A kérő orvos figyelő.' },
      { d: 0, t: '10:30', who: 'naptar', do: 'Munkalisták → MR-előjegyzés → Előjegyzendők; Altatás: altatással.', exp: 'Az ügy ott van; az időablak dátumként szűr és rendez.' },
      { d: 2, t: '09:00', who: 'naptar', do: 'Az ügyön: Időpontot kértünk.', exp: 'A „Kire várunk?” listán: radiológia, ma óta.' },
      { d: 28, t: '08:00', who: 'naptar', do: 'Nézd meg a Teendőim tetejét.', exp: 'Egy emlékeztető: dec. 22-én lezárul az időablak, és még nincs időpont.' },
      { d: 30, t: '10:00', who: 'naptar', do: 'Időpont megvan… → dec. 18. → Mentés.', exp: 'Lépés: időpont megvan, szülőt értesíteni.' },
      { d: 30, t: '11:00', who: 'kotes', do: 'Teendőim → MR-előjegyzés: Szülő értesítve… (szülő, telefon; megjegyzés: „az altatás előtti teendőket megbeszéltük”) → Mentés.', exp: 'Rögzül, ki, mikor és hogyan értesített; az ügy a vizsgálatra vár. Megjegyzés nélkül 20 másodperc alatt megvan.' },
      { d: 38, t: '15:00', who: 'naptar', do: 'Elkészült… → HIS-hivatkozás a leletre: K-444444 → Mentés.', exp: 'Lezárva: teljesült. Leletérték nincs, csak a HIS-hivatkozás.' },
      { d: 38, t: '16:00', who: 'demo', do: 'Saját ügyeim → Figyelt ügyeim: az elkészült vizsgálat. Utána: Munkalisták → A profil összes áreája → Ügytípus: Vizsgálat előjegyzése; Altatás: altatással → Mentés saját nézetként: „Altatásos MR-ek”.', exp: 'Értesítést nem kapott, mégis látta az eredményt. A nézet csak neki látszik; a közös menü nem bővült.' }
    ],
    variants: [{ id: '2a', text: 'Lemondás: az 5. lépés után Naptár Nóra: Más lépés → lemondandó; utána Lemondva; a lezárt ügyön „Új előjegyzés ebből”: az új ügy kapcsolt ügy, az oldalán „Innen indult: … · új előjegyzés · lezárva: lemondva”.' }] },
  { id: 'F3', title: 'Heti radiológiai konzílium napirenddel, döntéssel és teendőkkel', day0: '2026-11-16', pt: 'Teszt Elek, Minta Máté, Példa Bori',
    intro: 'A konzílium csütörtökön ül (nov. 19.); a bejelentési határidő szerda 17:00. Teszt Elek térd-MR-je elkészült (F2).',
    steps: [
      { date: '2026-11-16', t: '10:00', label: 'hétfő 10:00', who: 'demo', do: 'Teszt Elek → Új ügy → Radiológiai konzílium. Kérdés: „Aktív-e a synovitis, indokolt-e ízületi injekció?”; régió: jobb térd; rövid összefoglaló; HIS-hivatkozás: K-444444; hivatkozás: az MR-ügy → Mentés. Az ügyön: Fájl csatolása → kitalalt-konziliumi-osszefoglalo.pdf.', exp: 'Bejelentve a csütörtöki alkalomra.' },
      { date: '2026-11-16', t: '11:00', label: 'hétfő 11:00', who: 'vazlat', do: 'Minta Máté → Új ügy → Radiológiai konzílium: a sacroiliacalis ízületek gyulladásos aktivitása; régió; összefoglaló; HIS-hivatkozás; ortopédiai vonatkozás: nem → Mentés.', exp: '' },
      { date: '2026-11-17', t: '14:00', label: 'kedd 14:00', who: 'sablon', do: 'Fent: Saját ügyeim. Példa Bori → Új ügy → Radiológiai konzílium: kérdés: kontroll egésztest-MR; régió: egésztest; az összefoglalót és a HIS-hivatkozást hagyd üresen → Mentés.', exp: 'Az ügyön látszik, mi hiányzik.' },
      { date: '2026-11-18', t: '09:00', label: 'szerda 9:00', who: 'sablon', do: 'Saját ügyeim: a lap tetején az emlékeztető a hiányos bejelentésről. Nyisd meg az ügyet → Adatok → Szerkesztés: rövid összefoglaló; új HIS-hivatkozás: K-191919 → Mentés.', exp: 'Egy emlékeztető szólt; a hiány eltűnt.' },
      { date: '2026-11-18', t: '17:30', label: 'szerda 17:30', who: 'vazlat', do: 'Munkalisták → Radiológiai konzílium → Napirend. Példa Bori esetén: Csak tudomásul vesszük.', exp: 'A napirend magától összeállt; a megbeszélendő és a tudomásul vett esetek külön állnak.' },
      { date: '2026-11-19', t: '13:00', label: 'csütörtök 13:00', two: ['vazlat', 'demo'], who: 'vazlat', route: 'konzEsetElek', do: 'Két gép: a két gomb két külön lapot nyit, ugyanannál az esetnél. Előbb dr. Vázlat Viktor lapján: döntés: „Aktív synovitis, intraartikuláris szteroid a jobb térdbe.”; Teendő hozzáadása: „Ízületi injekció előjegyzése” (dr. Demó Dóra, 14 nap múlva); „Kontroll-MR fél év múlva” (Naptár Nóra; kapcsolt ügy indul belőle: MR-előjegyzés) → A döntés mentése. Utána dr. Demó Dóra lapján írj be egy másik döntésszöveget (teendő nélkül), és mentsd.', exp: 'A később mentő látja az eltérést, mindkét szöveggel, és ő dönt. Egyik szöveg sem vész el észrevétlenül.' },
      { date: '2026-11-19', t: '13:40', label: 'csütörtök 13:40', who: 'vazlat', route: 'napirendRk', do: 'Napirend → Minta Máté: Döntés rögzítése…: „Nincs aktív gyulladás.”, teendő nélkül → mentés. Példa Bori: Tudomásul vettük.', exp: 'Mindkét eset elintézve.' },
      { date: '2026-11-19', t: '14:00', label: 'csütörtök 14:00', who: 'demo', route: 'konzEsetElek', do: 'Teszt Elek esetén: Fájl csatolása → kitalalt-mr-kivagat.png. Címkék: kezdd el gépelni: „syn” → a már használt „synovitis” felkínálva → Hozzáadás; új címke: „oligoartikuláris JIA”.', exp: 'A címkék az ügyön; a felvételre HIS-hivatkozás mutat.' },
      { date: '2026-11-20', t: '09:00', label: 'péntek 9:00', who: 'demo', route: 'konzEsetElek', do: 'Saját ügyeim: az injekció teendője külön sorban, fölötte kis betűvel a konzílium neve. Utána a konzíliumi esetén az injekció teendőjén: Kész, majd 10 másodpercen belül: Visszavonás.', exp: 'A visszavont teendő ugyanott áll, mint előtte. A „Kontroll-MR fél év múlva” teendő már kész: kapcsolt ügy lett belőle.' },
      { date: '2026-11-20', t: '10:00', label: 'péntek 10:00', who: 'naptar', do: 'Teendőim: a kapcsolt MR-előjegyzés („Kontroll-MR fél év múlva”); a teendője már kész, ezért nem áll külön sorban.', exp: 'A kontroll-MR az MR-áreában áll; a sora fölött kis betűvel „Radiológiai konzílium, nov. 19.”, kattinthatóan.' },
      { date: '2026-11-20', t: '10:30', label: 'péntek 10:30', who: 'demo', do: 'Saját ügyeim: az injekció teendőjén: Kész.', exp: 'Minden teendő lezárult: Teszt Elek esete magától elintézve.' },
      { date: '2026-11-20', t: '11:00', label: 'péntek 11:00', who: 'valto', mode: 'leader', do: 'Belépés után az összesítőn indul (vezetői szerep): a konzílium áreájának számai; egyes eset nem nyitható meg. Fent, a név alatt: Szakorvos → a kereső: „teszt” → az eset megnyitható és szerkeszthető.', exp: 'Mindig látszik, melyik szerepben dolgozik.' },
      { date: '2026-11-20', t: '11:30', label: 'péntek 11:30', who: 'keret', do: 'Összesítő: a profil számai (Lezárva: ez a hét); az área nevére kattintva a munkalistához jut.', exp: 'Ugyanazok a számok, mint a munkalistákon; az M4 (rögzített döntés a megbeszélés után) 100%.' }
    ] },
  { id: 'F4', title: 'D2T-megbeszélés', day0: '2026-11-12', pt: 'Álnév Anna',
    intro: 'Álnév Anna betegsége a jelenlegi kezelés mellett is aktív. A D2T kedden ül (nov. 17.); külön emlékeztetője nincs.',
    steps: [
      { d: 0, t: '10:00', who: 'demo', do: 'Álnév Anna → Új ügy → D2T-megbeszélés. Kérdés: „Terápiaváltás: rituximab mérlegelése”; határidő: nov. 24.; rövid összefoglaló; HIS-hivatkozás: K-121212; felelős orvosok: írd be, és válaszd ki dr. Demó Dórát és dr. Vázlat Viktort → „Mentés, társfelelős: dr. Vázlat Viktor”.', exp: 'Lépés: átgondolandó.' },
      { d: 0, t: '11:00', who: 'vazlat', do: 'Saját ügyeim, utána Munkalisták → D2T-megbeszélés.', exp: 'Az eset mindkét felelős „Saját ügyeim” listáján és a D2T-área „Ezen dolgozz!” listáján áll.' },
      { d: 4, t: '17:30', who: 'demo', do: 'Saját ügyeim: az eset lépése.', exp: 'Napirenden: a határidő után magától került oda.' },
      { d: 5, t: '13:00', who: 'demo', do: 'Munkalisták → D2T-megbeszélés → Napirend → Döntés rögzítése…: résztvevő orvosok; döntés: „Terápiaváltás: rituximab indikáción túli alkalmazása; az engedélykérelem előkészítése.” Teendők: „Engedélykérelem előkészítése” (Űrlap Ildikó, 7 nap; kapcsolt ügy indul belőle: Terápiás engedély); „Megbeszélés a családdal” (dr. Demó Dóra, 10 nap) → A döntés mentése.', exp: 'Kapcsolt engedélyügy indul a D2T-esetből, a teendő felelősével és határidejével; a teendő kész, „kapcsolt ügy lett belőle” jelöléssel. A beteget és az indikációt nem kell újra beírni.' },
      { d: 8, t: '10:00', who: 'urlap', do: 'Teendőim: a kapcsolt engedélyügy, fölötte kis betűvel a D2T-megbeszélés neve; a teendője már kész. Az engedélyügyön: Adatok → Szerkesztés → gyógyszer: rituximab; indikáción túli alkalmazás: igen → Mentés.', exp: 'Az indikáció a gondozás fő diagnózisából előre kitöltve; az indikáción túli jelölést a felhasználó adja meg.' },
      { d: 10, t: '14:00', who: 'demo', do: 'A D2T-esetén: Kapcsolatfelvétel rögzítése (szülő, személyesen) → Mentés; a „Megbeszélés a családdal” teendőn: Kész.', exp: 'Az utolsó teendővel az eset magától lezárul („teljesült”); 10 másodpercig visszavonható.' },
      { d: 12, t: '12:00', who: 'demo', do: 'Archívum: „rituximab” vagy „terápiaváltás”.', exp: 'A D2T-hez nem szólt emlékeztető; a lezárt eset a döntéssel és a teendőkkel kereshető (F9).' }
    ] },
  { id: 'F5', title: 'Rezidensi labor- és leletkövetés, helyettesítéssel', day0: '2026-11-11', pt: 'Minta Máté, Próba Panna',
    intro: 'Az első rezidens két követést visz. A 6. és a 12. nap között szabadságon van, a helyettese a második rezidens.',
    steps: [
      { d: 0, t: '09:00', who: 'gyakorlo', do: 'Minta Máté → Új ügy → Labor- és leletkövetés: HLA-B27; várható eredmény: nov. 21.; jelezni: dr. Vázlat Viktor; HIS: K-131313; felelős: én. Próba Panna → Labor- és leletkövetés: Quantiferon; várható: nov. 16.; jelezni: dr. Demó Dóra; HIS: K-555555; felelős: én.', exp: 'Mindkettő eredményre vár, a várható nap szerint rendezve (Munkalisták → Rezidensi teendők → Eredményre vár).' },
      { d: 5, t: '10:00', who: 'gyakorlo', do: 'A Quantiferon-követésen: Az eredmény megjött; Új teendő: „Az eredmény a HIS-ben, átnézni” (dr. Demó Dóra); utána: Lezárás: teljesült.', exp: 'Eredményérték sehol, csak HIS-hivatkozás.' },
      { d: 6, t: '09:00', who: 'gyakorlo', do: 'Saját ügyeim → Távollét és helyettes: nov. 17. – nov. 23.; helyettes: dr. Kísérlet Kata → Mentés.', exp: '' },
      { d: 6, t: '10:00', who: 'kiserlet', do: 'Saját ügyeim.', exp: 'A HLA-B27-követés itt is látszik, „helyettesként”, áthelyezés nélkül.' },
      { d: 11, t: '08:00', who: 'kiserlet', do: 'Saját ügyeim teteje.', exp: 'Egy emlékeztető (helyettesként): a várható nap elmúlt, nincs eredmény. Dr. Gyakorló Gergő is megkapta.' },
      { d: 12, t: '07:50', who: 'kotes', do: 'Nővérpult, közös gép: a keresőbe „minta” → Minta Máté → a HLA-B27-ügy → Rövid megjegyzés: kezdd el írni („Az anya kérdezte, mikor lesz eredmény”), de ne mentsd; hagyd ott a gépet.', exp: '' },
      { d: 12, t: '08:00', who: 'kiserlet', keepClock: true, do: 'Ugyanazon a gépen: Felhasználóváltás (egy mozdulat), belépés: dr. Kísérlet Kata. A HLA-B27-ügyön: Az eredmény megjött; Adatok → Szerkesztés → új HIS-hivatkozás: K-131314 → Mentés; Új teendő dr. Vázlat Viktornak: „HLA-B27 a HIS-ben, átnézni”.', exp: 'A változások Kata nevén; a nővér félbehagyott megjegyzése Kata előtt nem látszik. Az ablak címében nincs betegnév.' },
      { d: 12, t: '09:00', who: 'kotes', do: 'Belépés újra, Minta Máté HLA-B27-ügye.', exp: 'A félbehagyott megjegyzése ott van, ahol abbahagyta.' },
      { d: 13, t: '09:00', who: 'gyakorlo', do: 'A HLA-B27-követésen: Lezárás: teljesült.', exp: '' }
    ] },
  { id: 'F6', title: 'Átadás felnőtt ellátásba', day0: '2026-11-16', pt: 'Fikció Flóra',
    intro: 'Fikció Flóra biológiai terápiát kap, érvényes engedéllyel. Az átadást az ORFI-ba a 4. hónap azonos napjára (2027. márc. 16.) tervezik; az emlékeztető 3 naptári hónappal előtte szól.',
    steps: [
      { d: 0, t: '10:00', who: 'demo', do: 'Fikció Flóra → Új ügy → Átadás felnőtt ellátásba: ORFI, felnőtt reumatológia; dr. Fogadó Ferenc; a felnőtt reumatológia titkársága; tervezett nap: 2027. márc. 16.; koordinátor: dr. Átmenet Ádám → „Kiadom dr. Átmenet Ádámnak”.', exp: 'Az ügyön magától látszik a beteg érvényes engedélye.' },
      { date: '2026-12-16', t: '08:00', label: 'dec. 16. (az 1. hónap)', who: 'atmenet', do: 'Saját ügyeim teteje.', exp: 'Pontosan egy emlékeztető.' },
      { d: 35, t: '10:00', who: 'atmenet', do: 'Az ügyön: Kapcsolatfelvétel rögzítése (fogadó csapat, telefon) → Mentés; utána: Átadó dokumentum készül.', exp: '' },
      { d: 60, t: '10:00', who: 'demo', do: 'Az ügyön: Fájl csatolása → kitalalt-orvosi-osszefoglalo.pdf; „Az átadó dokumentum elkészült”.', exp: '' },
      { d: 60, t: '11:00', who: 'atmenet', do: 'Az ügyön: Elküldve.', exp: 'A „Kire várunk?” listán: ORFI, a várakozás napjaival (a 60. és a 110. nap között).' },
      { d: 110, t: '10:00', who: 'atmenet', do: 'Az ügyön: Átadva.', exp: '' },
      { d: 150, t: '10:00', who: 'atmenet', do: 'Utólagos kapcsolatfelvétel… (fogadó csapat, levél) → Mentés.', exp: 'Az ügy lezárul; 1 kapcsolatfelvétel az átadás előtt, 1 utána. A gondozás „felnőtt ellátásba adva” okkal lezárul; a kártyán a korábbi ügyek a helyükön.' }
    ] },
  { id: 'F7', title: 'Ügyeleti kiutalás egy másik profil betegéről', day0: '2026-11-17', pt: 'Mese Márk',
    intro: 'Mese Márk két napja fekszik a kitalált gyermekneurológián (B részleg). Az esti ügyeletes a gyermekreumatológia szakorvosjelöltje, legutóbb a saját munkájában dolgozott.',
    steps: [
      { d: 0, t: '15:30', who: 'ideg', do: 'A keresőbe „mese” → Mese Márk → Kiutalás az ügyeletnek: „Szintmérés megjött? Ha nem: labor”; mikorra: ma 22:00 → Kiutalás.', exp: 'Legfeljebb 3 lépés és 30 másodperc; a címzett az ügyelet, nem egy név.' },
      { d: 0, t: '16:00', who: 'sablon', do: 'Belépés: a Saját ügyeim nyílik (legutóbb ott dolgozott). Fent: Ügyeleti lista (egy kattintás).', exp: 'A tételen megnyitás nélkül: kiről (név, TAJ), hol (gyermekneurológia, B részleg, két napja fekszik), mit, mikorra, kitől.' },
      { d: 0, t: '16:05', who: 'sablon', do: 'Átveszem.', exp: 'Rögzül, ki vette át.' },
      { d: 0, t: '22:00', who: 'sablon', do: 'A tételen: Betegkártya; a nyitott ügyek és teendők olvashatók. Vissza az ügyeleti listára; megjegyzés: „Az eredmény a HIS-ben, a labort nem kellett hívni” → Lezárás.', exp: 'A kártya megnyitása az ügyeletes nevével a naplóba került.' },
      { d: 1, t: '08:00', who: 'ideg', do: 'Saját ügyeim → Kiutalva az ügyeletnek.', exp: 'Ki vette át, mit írt, és hogy lezárult.' }
    ],
    variants: [
      { id: '7a', who: 'demo', text: 'Kiutalás a saját profilról: Kitalált Kende kártyája → Kiutalás az ügyeletnek; ugyanannyi lépés, az ügyeleti listán ugyanolyan formában.' },
      { id: '7b', who: 'sablon', text: 'Lezáratlan tétel: utalj ki egy tételt, és ne zárd le. Másnap (a próbán: az 5. lépés ideje) az ügyeleti listán marad, lejártként elöl.' },
      { id: '7c', who: 'kotes', text: 'Láthatóság: Kötés Kinga a keresőbe „mese”.', exp: 'Nincs találat a profiljában: Mese Márk ügyeit nem látja.' },
      { id: '7d', who: 'ideg', text: 'Beteg nélküli tétel: Saját ügyeim → Új ügy → Általános teendő: „az EEG-labor gépe éjjel szervizre megy; reggel nézd meg, visszakerült-e”; Kinek: az ügyeletnek; Mikorra: holnap 8:00 → Mentés.', exp: 'Az ügyeleti listán ugyanúgy, a „kiről” helyén: beteg nélkül.' },
      { id: '7e', at: '2026-11-18T02:10', who: 'sablon', mode: 'duty', text: 'Az ügyelet tételt hagy az osztálynak (02:10): az ügyeleti listáról Mese Márk kártyája (a tétel „Betegkártya” gombja vagy a kereső) → Tétel az osztálynak: „Reggel ismételt szintmérés”; mikorra: ma 8:00. Reggel (a 7e2–7e4 gombok) a neurológus és a neurológia nővére külön csoportban látja; a nővér átveszi és lezárja; az ügyeletes látja, mi lett vele.' },
      { id: '7e2', at: '2026-11-18T07:30', who: 'ideg', text: 'Saját ügyeim → „Az ügyelet hagyta”: ki és mikor hagyta, kiről, hol fekszik, mit, mikorra. A betegkártyán is, a kiutalt tételektől elkülönítve.' },
      { id: '7e3', at: '2026-11-18T07:40', who: 'hullam', text: 'Teendőim → „Az ügyelet hagyta”: Átveszem; a levett vér után: Lezárás.' },
      { id: '7e4', at: '2026-11-18T08:20', who: 'sablon', mode: 'duty', text: 'Ügyeleti lista → „Az osztályoknak hagyva”.', exp: 'Ki vette át, és hogy lezárult.' }
    ] },
  { id: 'F8', title: 'Járóbeteg-ellátásból osztályra, majd vissza az ambulanciára', day0: '2026-11-10', pt: 'Kitalált Kende',
    intro: 'Kitalált Kende ambulánsan jár; két nyitott ügye van: MR-előjegyzés (időpontra vár) és labor-követés (eredményre vár). Megjelenést csak feladathoz rögzítünk.',
    steps: [
      { d: 0, t: '09:00', who: 'demo', do: 'Ambuláns vizit, új feladat nélkül: semmit nem rögzítünk. Nézd meg Kitalált Kende kártyáját.', exp: 'Járó; két nyitott ügy; a vizit nem jelenik meg.' },
      { d: 0, t: '15:00', who: 'demo', do: 'Kitalált Kende → Új ügy → Labor- és leletkövetés (ferritin, vérkép); felelős: én; megjelenés: felvétel az osztályra most → Mentés.', exp: 'A kártya: Fekvő, Gyermekreumatológia, ma óta. Az új ügy fekvő ellátásban indult; a két korábbi a helyén maradt.' },
      { d: 0, t: '16:00', who: 'kotes', do: 'Munkalisták → A profil összes áreája → Ellátási forma: fekvő.', exp: 'Kende a nyitott ügyeivel.' },
      { d: 2, t: '10:00', who: 'ideg', do: 'A keresőbe „kende” → Kitalált Kende.', exp: 'A nyitott ügyek és teendők olvashatók, szerkeszteni nem lehet, és ez egyértelműen elkülönül.' },
      { d: 6, t: '11:00', who: 'kotes', do: 'Kitalált Kende kártyája → Hazabocsátás rögzítése.', exp: 'Újra járó; egyetlen ügy sem mozdult.' },
      { d: 7, t: '10:00', who: 'ideg', do: 'Kitalált Kende kártyája újra.', exp: 'Csak a fejléc: ügytípus, státusz, dátum, felelős profil.' },
      { d: 20, t: '10:00', who: 'demo', do: 'Kitalált Kende → Új ügy → MR-előjegyzés (kontroll, mindkét csípő); megjelenés: ambuláns vizit most → „Kiadom Naptár Nórának”. Utána: Előzmények.', exp: 'Időrendben a két rögzített megjelenés (a felvétel és a kontrollvizit) és mind a négy ügy.' }
    ] },
  { id: 'F9', title: 'Lezárt ügy keresése az archívumban', day0: '2027-02-15', pt: 'Próba Panna és mások',
    intro: 'Az F1, az F3 és az F4 ügyei lezárultak és az archívumban vannak, mellettük kitalált korábbi ügyek. A próba napja: 2027. febr. 15.',
    steps: [
      { d: 0, t: '10:00', who: 'demo', do: 'A keresőbe: „pró” → Próba Panna → Előzmények.', exp: 'Két tocilizumab-engedélyügy: a „megújítva” okkal lezárt régi és az érvényes új; az új alatt „Innen indult: Tocilizumab-engedély”; az ügyekben a lépések története és a csatolmányok.' },
      { d: 0, t: '10:10', who: 'vazlat', do: 'Archívum: Mit keresel? „tocilizumab”; Ügytípus: Terápiás engedély; Időszak: az elmúlt év.', exp: 'A profil összes ilyen engedélye, az elutasítottal együtt; lezárási ok szerint bontva. Más profil ügye nincs köztük.' },
      { d: 0, t: '10:20', who: 'demo', do: 'Archívum: „terápiaváltás”; Ügytípus: D2T-megbeszélés; Időszak: az elmúlt negyedév.', exp: 'Álnév Anna D2T-esete.' },
      { d: 0, t: '10:30', who: 'demo', do: 'Archívum: „synovitis” (a címke), beteg megadása nélkül.', exp: 'Teszt Elek konzíliumi esete, a csatolt képpel.' },
      { d: 0, t: '10:40', who: 'ideg', do: 'Ugyanezek a keresések; utána Próba Panna kártyája.', exp: 'Csak a szerepkörének megfelelő: a keresőszó nem talál más profil ügyében; a kártyán csak fejléc, csatolmány nem nyitható.' },
      { d: 0, t: '10:50', who: 'mutato', do: 'Összesítő → „Lezárt ügyek ok szerint” (Az idei év).', exp: 'Csak szám, egyes ügy nem.' },
      { d: 0, t: '11:00', who: 'naptar', do: 'A keresőbe „fikció” → Fikció Flóra → „MR, bal csukló” → Más lépés → Lezárás okkal → tévesen rögzítve.', exp: 'Nem törlődik; az archívumban megmarad, az okkal.' },
      { d: 0, t: '11:10', who: 'keret', do: 'Próba Panna kártyája → Ki nézte meg? (napló).', exp: 'Az F1, az F5 és a mostani megnyitások, névvel és időponttal, a csatolmányok megnyitása is.' }
    ],
    note: 'A 9. lépés (ugyanez a belső API-n át) a prototípusban nem játszható; az a 6. lépés automatikus tesztjeinek része.' },
  { id: 'F10', title: 'TAJ nélküli beteg felvétele és későbbi összevonása', day0: '2026-11-16', pt: 'Vendég Vilma',
    intro: 'Vendég Vilma külföldi; TAJ-a még nincs. A próbában csak csupa azonos számjegyű TAJ érvényes (ilyen TAJ a valóságban nem létezhet); minden más számot elírásként utasít el.',
    steps: [
      { d: 0, t: '09:00', who: 'naptar', do: 'A keresőbe „vendég” → nincs találat → Új beteg felvétele: „A betegnek nincs TAJ-a” → ok: külföldi, TAJ még nincs; név: Vendég Vilma → Felvétel. A kártyán: Új ügy → MR-előjegyzés → Mentés; Új ügy → Labor- és leletkövetés, felelős: más → Ki?: dr. Gyakorló Gergő → „Kiadom dr. Gyakorló Gergőnek”.', exp: 'Ideiglenes azonosítóval ugyanúgy lehet dolgozni; az ok a kártyán látszik.' },
      { d: 0, t: '09:30', who: 'naptar', do: 'A keresőben valami, ami nincs (például „új”) → Új beteg felvétele: TAJ „000 000 001” → Felvétel; utána TAJ „222 222 222” → Felvétel.', exp: 'Az elírt TAJ-t nem fogadja el, és megmondja, mi a hiba; a meglévő TAJ-nál a meglévő beteget kínálja fel.' },
      { d: 30, t: '10:00', who: 'kotes', do: 'Új beteg felvétele csak TAJ-jal: „999 999 999” → Felvétel (legfeljebb 20 másodperc). A kártyán: Új ügy → Labor- és leletkövetés; Felelős: egyelőre senki → „Mentés felelős nélkül”.', exp: 'A fejlécben a TAJ áll, amíg nincs név.' },
      { d: 30, t: '10:30', who: 'gyakorlo', do: 'Munkalisták → Rezidensi teendők.', exp: 'A felelős nélküli labor-követés külön látszik („Felelős nélkül”). Az összesítőn (dr. Keret Kornél) az M2 1.' },
      { d: 31, t: '09:00', who: 'naptar', do: 'Vendég Vilma kártyája („vendég”) → TAJ beírása: 999 999 999 → Mentés.', exp: 'A rendszer jelzi, hogy ez a TAJ már szerepel, a meglévő rekordot kínálja fel; összevonni nem tud, a kijelölt munkatárs neve látszik.' },
      { d: 31, t: '09:30', who: 'urlap', do: 'Vendég Vilma kártyája → TAJ beírása: 999 999 999 → „A két rekord összevetése és összevonása” → Összevonás… → Igen, összevonom.', exp: 'Csak itt kér megerősítést. Egy rekord marad, névvel és TAJ-jal; minden ügy és megjelenés egyesült; a naplóban: ki, mikor, mely rekordokat.' }
    ],
    variants: [{ id: '10a', text: 'A TAJ az újbóli felvétel előtt megjön: a 3. lépés helyett Naptár Nóra beírja a TAJ-t Vilma ideiglenes rekordjába; ugyanaz az ellenőrzés fut, mint felvételkor.' }] }
];

/* ---------------- Megjelenítés ---------------- */
function stepAt(sc, s) { return D.at(s.date || D.add(sc.day0, s.d || 0), s.t || '09:00'); }
function whenLabel(sc, s) { return s.label || (s.d === undefined ? '' : s.d + '. nap') + ' ' + D.hm(stepAt(sc, s)); }
const capf = x => x.charAt(0).toUpperCase() + x.slice(1);
function acc(uid) {
  const u = cfg.users[uid];
  if (u.mainAdmin) return 'Fő admin · a klinika';
  if (u.registered && !T.isActive(uid)) return 'Regisztrált fiók';
  if (u.removed) return 'Nem tartozik profilhoz';
  return u.leader && !u.profile ? capf(u.leader.role) : (u.leader ? capf(u.leader.role) + '; ' + T.profileName(u.profile) + ' · ' + u.role : (T.profileName(u.profile) + ' · ' + u.role));
}
function stateLine() {
  const st = T.state(), w = st.world === 'base' ? 'Szabad próba (a D napja)' : st.world === 'E' ? 'Előkészítés (E)' : st.world.replace('c', ' (1c változat)') + ' forgatókönyv';
  return `Most: <strong>${esc(w)}</strong> · ${esc(D.full(st.clock.slice(0, 10)))}, ${esc(D.hm(st.clock))}`;
}
/* A regisztrált fiókok állapota a belépőlapon (K9.13): ugyanúgy be lehet lépni velük, mint a többi próbafiókkal */
function regState(a) {
  const rq = a.req, where = rq.profile ? T.profileName(rq.profile) : rq.dept ? cfg.departments[rq.dept].name + ' részleg' : 'a klinika';
  if (a.status === 'pending') return 'Kérte: ' + where + ', ' + rq.role + ' · jóváhagyásra vár';
  if (a.status === 'rejected') return 'Kérte: ' + where + ', ' + rq.role + ' · nem hagyták jóvá';
  return 'Jóváhagyva: ' + where + ', ' + a.decided.role;
}
const stepWho = s => s.reg ? 'Új munkatárs' : s.name || cfg.users[s.who].name;
function render() {
  const el = document.getElementById('proba');
  const mainAcc = MAIN.map(m => `<a class="acc" href="betegut.html?belepes=${m[1]}" data-login="${m[1]}"><span class="acc-role">${esc(m[0])}</span><span class="acc-name">${esc(cfg.users[m[1]].name)}</span><span class="acc-mail">${esc(cfg.users[m[1]].email)}</span><span class="acc-start">${esc(acc(m[1]))}${cfg.users[m[1]].note ? ', ' + esc(cfg.users[m[1]].note) : ''}<br>Kezdőképernyő: ${esc(m[2])}</span></a>`).join('');
  /* Ha egy próbafiók épp regisztrált fiókként szerepel (az E világában Hullám Hédi), csak a regisztrált fiókok között áll */
  const otherAcc = OTHER.filter(k => !(T.state().accounts || []).some(a => a.id === k)).map(k => `<a class="acc" href="betegut.html?belepes=${k}" data-login="${k}"><span class="acc-role">${esc(acc(k))}</span><span class="acc-name">${esc(cfg.users[k].name)}</span><span class="acc-mail">${esc(cfg.users[k].email)}</span>${cfg.users[k].note ? `<span class="acc-start">${esc(cfg.users[k].note)}</span>` : ''}</a>`).join('');
  const regAcc = (T.state().accounts || []).map(a => `<a class="acc" href="betegut.html?belepes=${a.id}" data-login="${a.id}"><span class="acc-role">${esc(acc(a.id))}</span><span class="acc-name">${esc(a.name)}</span>${a.email ? `<span class="acc-mail">${esc(a.email)}</span>` : ''}<span class="acc-start">${esc(regState(a))}</span></a>`).join('');
  const scen = SC.map(sc => {
    const steps = sc.steps.map((s, i) => `<li><span class="when">${esc(whenLabel(sc, s))}</span><p class="who-do"><strong>${esc(stepWho(s))}:</strong> ${esc(s.do)}${s.exp ? `<span class="expect">Elvárt: ${esc(s.exp)}</span>` : ''}</p>
      <span class="go">${s.two ? s.two.map((u, j) => `<button class="btn-sm${j === 0 ? ' btn-fill' : ''}" type="button" data-go="${sc.id}" data-i="${i}" data-who="${u}" data-new="1">${j + 1}. lap: ${esc(cfg.users[u].name)}</button>`).join(' ') : `<button class="btn-sm btn-fill" type="button" data-go="${sc.id}" data-i="${i}">${s.reg ? 'Regisztráció' : 'Belépés'}${s.keepClock ? ' (felhasználóváltás)' : ''}<span class="sr-only">: ${esc(sc.id)}, ${i + 1}. lépés${s.reg ? '' : ', ' + esc(stepWho(s))}</span></button>`}</span></li>`).join('');
    const vars = (sc.variants || []).map(v => `<li><span class="when">${esc(v.id)}</span><p class="who-do">${v.who ? `<strong>${esc(cfg.users[v.who].name)}:</strong> ` : ''}${esc(v.text)}${v.exp ? `<span class="expect">Elvárt: ${esc(v.exp)}</span>` : ''}</p><span class="go">${v.who ? `<button class="btn-sm" type="button" data-var="${sc.id}" data-v="${esc(v.id)}">Belépés<span class="sr-only">: ${esc(v.id)} változat</span></button>` : ''}</span></li>`).join('');
    return `<details class="scen" data-sc="${sc.id}"><summary>${chev}<span class="s-id">${esc(sc.id)}</span><span class="s-title">${esc(sc.title)}</span><span class="s-sub">${esc(sc.pt)} · kezdet: ${esc(D.full(sc.day0))}</span></summary>
      <div class="scen-body"><p>${esc(sc.intro)}</p><div class="scen-actions"><button class="btn-sm" type="button" data-reset="${sc.id}">A forgatókönyv indítása az elejéről</button></div>
      <ol class="steps">${steps}</ol>${vars ? `<div class="variants"><h3>Változatok</h3><ol class="steps">${vars}</ol></div>` : ''}${sc.note ? `<p class="hint">${esc(sc.note)}</p>` : ''}</div></details>`;
  }).join('');
  el.innerHTML = `<p class="proba-flag">Próba · minden adat kitalált</p>
    <h1 tabindex="-1">Belépés a próbába</h1>
    <p class="lede">Válaszd ki, kinek a nevében lépsz be. Ez a lap a próba eszköze; a rendszerben a „Felhasználóváltás” ide hoz vissza. Internet nem kell; minden ebben a böngészőben marad.</p>
    <p class="note-line" id="allapot">${stateLine()} · <button class="link-btn lg" type="button" data-reset="base">Szabad próba: vissza az alapállapotra</button></p>
    <section class="section" aria-labelledby="h-fiok"><div class="section-head"><h2 id="h-fiok">Szerepkörök és kezdőképernyők</h2></div>
      <p class="group-note">A szabad próba a D napja: kedd, november 17., reggel 8 óra; a gyermekreumatológia munkája a forgatókönyvek kitalált betegeivel. Belépés után mindenki a saját kezdőképernyőjén indul.</p>
      <div class="accounts">${mainAcc}</div></section>
    <section class="section" aria-labelledby="h-uj"><div class="section-head"><h2 id="h-uj">Új munkatárs</h2></div>
      <p class="group-note">Aki még nem tagja egyik profilnak sem, maga regisztrál a @semmelweis.hu végű egyetemi címével (ez lesz a belépési neve), és kéri, hogy egy profilhoz rendeljék. Jóváhagyásig belép, de betegadatot nem lát.</p>
      <p class="reg-cta"><a class="btn btn-secondary" href="betegut.html#/regisztracio" data-reg="1">Regisztráció</a></p>
      ${regAcc ? `<h3 class="sub-head">Regisztrált fiókok</h3><div class="accounts">${regAcc}</div>` : ''}</section>
    <section class="section" aria-labelledby="h-tobbi"><div class="section-head"><h2 id="h-tobbi">További próbafiókok a forgatókönyvekhez</h2></div><div class="accounts">${otherAcc}</div></section>
    <section class="section" aria-labelledby="h-fk"><div class="section-head"><h2 id="h-fk">Elfogadási forgatókönyvek: az előkészítés (E) és az F1–F10</h2></div>
      <p class="group-note">Egy forgatókönyv saját, tiszta kiinduló állapotból indul. A lépések gombja beállítja a forgatókönyv napját és óráját, és belép a megadott fiókkal; a műveletet te végzed el a felületen. Ha egy lépés kimaradt, indítsd újra az elejéről.</p>
      ${scen}</section>`;
}
function say(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('is-on'); setTimeout(() => t.classList.remove('is-on'), 3500); }
function goStep(scId, i, whoOverride, newTab) {
  const sc = SC.find(x => x.id === scId), s = sc.steps[i];
  if (T.state().world !== scId) T.reset(scId);
  /* A regisztrált fiók lépése csak a regisztráció után játszható */
  const reg = s.name ? T.state().accounts.find(a => a.name === s.name) : null;
  if (s.name && !reg) { say('Ehhez előbb a regisztráció kell: ' + s.name + ' (az egyik előző lépés).'); return; }
  if (!s.keepClock) T.setClock(stepAt(sc, s));
  else T.setClock(stepAt(sc, s));
  if (s.reg) { T.logout(); location.href = 'betegut.html#/regisztracio'; return; }
  const who = reg ? reg.id : whoOverride || s.who;
  if (s.mode) { const m = s.mode === 'duty' ? 'work' : s.mode, lb = {}; lb[m] = s.mode === 'leader' ? '#/osszesito' : s.mode === 'duty' ? '#/ugyelet' : '#/sajat'; T.pref(who, { mode: m, lastBy: lb }); }
  let route = '';
  if (s.route) route = ROUTES[s.route]();
  const url = 'betegut.html?belepes=' + who + (route ? route : '');
  if (newTab) window.open(url, '_blank'); else location.href = url;
}
const ROUTES = {
  konzEsetElek: () => { const c = T.state().cases.find(x => x.patientId === 'p2' && x.type === 'radio' && x.meeting === '2026-11-19'); return c ? '#/ugy/' + c.id + '?dontes=1' : '#/munkalistak/rk/napirend'; },
  napirendRk: () => '#/munkalistak/rk/napirend'
};
function goVariant(scId, vid) {
  const sc = SC.find(x => x.id === scId), v = sc.variants.find(x => x.id === vid);
  if (v.world) T.reset(v.world); else if (T.state().world !== scId) T.reset(scId);
  if (v.at) T.setClock(v.at);
  if (v.mode) { const m = v.mode === 'duty' ? 'work' : v.mode, lb = {}; lb[m] = v.mode === 'duty' ? '#/ugyelet' : v.mode === 'leader' ? '#/osszesito' : '#/sajat'; T.pref(v.who, { mode: m, lastBy: lb }); }
  location.href = 'betegut.html?belepes=' + v.who;
}
document.addEventListener('click', e => {
  const r = e.target.closest('[data-reset]');
  if (r) { const w = r.getAttribute('data-reset'); T.reset(w); render(); const t = document.getElementById('toast'); t.textContent = w === 'base' ? 'Visszaállítva: szabad próba.' : w + ': a kiinduló állapot kész.'; t.classList.add('is-on'); setTimeout(() => t.classList.remove('is-on'), 3000); const s = document.querySelector('[data-reset="' + w + '"]'); if (s) s.focus(); return; }
  const g = e.target.closest('[data-go]');
  if (g) { goStep(g.getAttribute('data-go'), Number(g.getAttribute('data-i')), g.getAttribute('data-who'), !!g.getAttribute('data-new')); return; }
  const v = e.target.closest('[data-var]');
  if (v) { goVariant(v.getAttribute('data-var'), v.getAttribute('data-v')); }
});
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', SPRITE);
  T.init(); T.logout(); render();
});
})();
