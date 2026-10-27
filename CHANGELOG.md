# Jurnal de modificări — Eclipsa-2027

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
