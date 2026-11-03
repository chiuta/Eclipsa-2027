# Jurnal de modificări — Eclipsa-2027

## 2.3.2 — 2026-11-03

Etapa 7 (axe 4.10.3 din CI-ul hubului): blocul «Buy Me a Coffee» din legendă nu mai e un al doilea reper „complementary” imbricat; are rol „region”.

## 2.3.1 — 2026-11-03

- Nou (Etapa 6, suita cer–timp): **locația, ora și fusul orar comune** cu Eclipsa-2027, Bolta, Horizons, Universul Observabil 3D, ORARIUM, CLEPSIDRA și Orar (modul `fff-place`): butonul „📍 Locație” (formular, 38 de orașe, geolocalizare doar la cerere și cu acord explicit, plic `place/fff` prin fișier/clipboard/QR/link), panoul **„Astea se întâmplă deasupra ta mâine”** (Soare, Lună, planete, eclipse; calcul local, fără rețea) și **alertă la eclipsă**. Pe aceeași origine locația se propagă singură; între adrese diferite, printr-un link/plic (o apăsare). Vezi docs/SUITA-CER-TIMP.md în hub. Calculatorul local de eclipsă primește locația comună (și o trimite înapoi).

## 2.3.0 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 2.3.0 — 2026-11-01

- Corectat: adaptorul «Trimite la…» nu mai aruncă eroare când kitul FFF lipsește (gardian pe fiecare bloc; găsit de testul «fără kit» din CI).

Nou: «Trimite la…» (fff-kit, modulul FFF.bridge) — după orice export de fișier (GPX, ICS, CSV, Markdown) apare butonul «Trimite la…» către aplicațiile compatibile, iar importul de fișiere al aplicației primește plicuri .fff.json trimise de ele, cu confirmare înainte de import. Fără rețea, fără telemetrie.

## 2.2.1 — 2026-10-31

Doar interfață (accesibilitate pe telefon, 360×740): linia de versiune și linkul din ea 11 → 12 px. Fără alte schimbări de comportament.

## 2.2.0 — 2026-10-27

Anterior: v2.1.0. Recenzie 2 (2026-10-27).

- Nou: butonul **„Umbra pe hartă”** (în rândul de butoane): un film de 30 s (≈ 3 h 23 min reale) cu umbra totală a Lunii care traversează harta Leaflet. Poziția centrului și conturul (72 de puncte) sunt calculate în aplicație din elementele Besselian ale kitului, pe elipsoidul WGS84 (fără relief); apare doar umbra totală, nu penumbra. Pornește doar la clic, are pauză/redare, cursor (tastatură) pentru oră UTC și buton de închidere. Nota de limite este în pagină (aproximare, nu e instrument de siguranță).
- Texte noi în română și engleză; celelalte limbi afișează engleza (traducere nativă neverificată).
- Test nou `tests/umbra-pe-harta.test.mjs` (verificări independente): centrul coincide cu linia centrală a kitului (≤ 1 km) la toate probele de 15 min; lățimea conturului = lățimea benzii (129 km semilățime, ±4 km); centrul la maxim = maximul global; avans 2 s/30 s, pauză, cursor, 360 px, RO, axe, 0 rețea.
- Hash-urile CSP recalculate; versiunea aliniată (`app.json`, `fff-info`, `sw.js`, subsol).

Nu s-a implementat:
- Alarma cu pagina închisă / ecran oprit: ar cere notificări sau fundal (permisiuni noi); rămân alarmele din exportul `.ics`.
- Penumbra pe hartă: nu e desenată (nu e nevoie pentru banda totalității; ar fi o formă foarte mare și imprecisă la margini).
- README FR/IT/ES/PT/DE/HU: doar versiunea aliniată.

## 2.1.0 — 2026-10-27

Anterior: v2.0.0. Recenzie 2026-10-27.

- Nou: buton de **animație** în „Cerul din locul tău” — Luna traversează Soarele de la C1 la C4 în 30 s; pornește doar la cererea utilizatorului, se oprește la pauză, la mutarea cursorului, la salt la un contact și la C4.
- Nou: **alarmă la contactele C1–C4** (opțională, oprită implicit): ton (WebAudio, local, creat doar după un gest) și vibrație, mesaj vizibil și anunț pentru cititoarele de ecran; avertisment cu 10 s înainte de C3 („pregătește filtrul solar”), iar la C3 „pune filtrul solar la loc ACUM”. Buton de test. Merge și cu „Repetiția”. Limite spuse în pagină: ceasul dispozitivului, doar cu pagina deschisă și în prim-plan, nu înlocuiește alarmele `.ics`, nu e instrument de siguranță. Fără notificări/permisiuni noi.
- Nou: **legătură reciprocă cu Bolta** (linie în subsolul legendei și în dialogul „Eclipsa la locul tău”); aplicațiile rămân separate (Bolta are linkul înapoi către Eclipsa-2027 din 2.1.0). Linkul se deschide într-o filă nouă doar la clic, cu `noopener noreferrer`.
- „Stare: stabil”, „Offline: complet” în README (EN/RO); `app.json` declară audio și vibrații.
- Teste noi: `tests/alarma-animatie.test.mjs` (22 de verificări: animație, alarmă cu ceas simulat — C2, avertisment, C3, oprire —, link, 360 px, 0 rețea). Rulate și `fff-r8` (92), `simulator-ceruri` (60), `terra-bridge` (10): toate trec.
- Hash-urile CSP recalculate; versiunea aliniată (`app.json`, `fff-info`, `sw.js`, subsol).

Nu s-a implementat / de reținut:
- Alarma nu poate suna cu pagina închisă sau ecranul oprit (ar necesita notificări/serviciu în fundal; nu s-au adăugat permisiuni). Pentru asta rămân alarmele din exportul `.ics`.
- Textele noilor funcții: română și engleză; celelalte 6 limbi afișează engleza (traducere nativă neverificată). README-urile FR/IT/ES/PT/DE/HU nu au fost actualizate. Linia statică despre Bolta este bilingvă RO/EN.
- Animația nu este încă un „film” al umbrei pe hartă; este fază locală (disc Soare/Lună) pentru locul ales.
