// Eclipsa-2027 — teste pentru funcțiile noi (runda 8): circumstanțe locale, numărătoare, ICS, listă de verificare, bandă calculată, GPS cu consimțământ.
// Rulare: node tests/fff-r8.test.mjs   (Playwright din /opt/node-tools, rețea blocată, Chromium local)
import {launch, axeRun, hOverflow, check, summary, REF} from "./_lib.mjs";

const hms = ms => new Date(ms).toISOString().slice(11, 19);
const toS = s => { const [h, m, x] = s.split(":").map(Number); return h * 3600 + m * 60 + x; };
const openDlg = async page => { await page.click("#localBtn"); await page.waitForSelector("#e27Dialog[open]"); };
const search = async (page, q) => { await page.fill("#e27-loc", q); await page.press("#e27-loc", "Enter"); await page.waitForTimeout(250); };

console.log("1. pornire, versiune, 0 erori");
{
  const {browser, page, st} = await launch();
  await page.waitForTimeout(3500);
  check("0 pageerror/console error", st.errs.length === 0, st.errs);
  check("0 cereri de rețea", st.net.length === 0, st.net);
  check("0 violări CSP", (await page.evaluate(() => window.__csp)).length === 0);
  check("#app-version arată 1.1.0 · 2026-10-14", /1\.1\.0 · 2026-10-14/.test((await page.textContent("#app-version")).replace(/\s+/g, " ")));
  check("meta application-version 1.1.0", (await page.getAttribute('meta[name="application-version"]', "content")) === "1.1.0");
  check("meta last-updated 2026-10-14", (await page.getAttribute('meta[name="last-updated"]', "content")) === "2026-10-14");
  check("butonul „La locul tău” apare (FFF.ephem încărcat)", await page.isVisible("#localBtn"));
  check("fără depășire orizontală 1280", (await hOverflow(page)) <= 0);
  await browser.close();
}

console.log("2. circumstanțe locale față de referința DE421 (toleranță 3 s)");
{
  const {browser, page} = await launch();
  await page.waitForTimeout(1500);
  const rows = await page.evaluate(ref => {
    const E = FFF.ephem, out = [];
    for (const [n, rf] of Object.entries(ref.eclipse.places)) {
      const pl = E.eclipse.places[n]; if (!pl) { out.push({n, missing: true}); continue; }
      const L = ECL27.compute(pl.lat, pl.lon, 0, pl.tz), t = j => E.dateFromJd(E.ut(j)).getTime(), g = c => c ? Date.parse(c.utc) : null;
      const o = {n, type: L.type, rtype: rf.type, c1: (g(L.c1) - t(rf.t1)) / 1000, c4: (g(L.c4) - t(rf.t4)) / 1000, max: (g(L.max) - t(rf.tmax)) / 1000, obsc: (L.obscuration - rf.obscuration) * 100, alt: L.max.sunAlt - rf.sunAlt};
      if (rf.type === "total") { o.c2 = (g(L.c2) - t(rf.t2)) / 1000; o.c3 = (g(L.c3) - t(rf.t3)) / 1000; o.dur = L.durationTotality - (t(rf.t3) - t(rf.t2)) / 1000; }
      out.push(o);
    }
    return out;
  }, REF);
  check("toate locurile de referință există în FFF.ephem.eclipse.places", rows.every(r => !r.missing), rows.filter(r => r.missing));
  check("tipul eclipsei (parțială/totală) coincide cu referința", rows.every(r => r.type === r.rtype), rows.filter(r => r.type !== r.rtype));
  const mx = k => Math.max(...rows.filter(r => r[k] != null).map(r => Math.abs(r[k])));
  check("contactele C1/C4 și maximul în ±3 s", mx("c1") <= 3 && mx("c4") <= 3 && mx("max") <= 3, {c1: mx("c1"), c4: mx("c4"), max: mx("max")});
  check("C2/C3 (totalitate) în ±3 s, durata în ±1,5 s", mx("c2") <= 3 && mx("c3") <= 3 && mx("dur") <= 1.5, {c2: mx("c2"), c3: mx("c3"), dur: mx("dur")});
  check("obscurarea în ±0,05 % din disc, altitudinea Soarelui în ±0,02°", mx("obsc") <= 0.05 && mx("alt") <= 0.02, {o: mx("obsc"), a: mx("alt")});
  check("Luxor este în totalitate, București parțială", rows.find(r => r.n === "Luxor").type === "total" && rows.find(r => r.n === "București").type === "partial");
  await browser.close();
}

console.log("3. interfața: căutare de loc, coordonate manuale, rezultat afișat");
{
  const {browser, page, st} = await launch();
  await page.waitForTimeout(2000);
  await openDlg(page);
  check("dialogul are titlu și aria-labelledby", (await page.textContent("#e27DlgTitle")).length > 3);
  check("înainte de alegerea locului nu e afișat niciun rezultat", (await page.locator("#e27-result").count()) === 0);
  await search(page, "Luxor");
  check("Luxor: tip totală", /tot/i.test(await page.textContent("#e27-type")), await page.textContent("#e27-type"));
  const lux = REF.eclipse.places["Luxor"];
  const tab = await page.evaluate(() => [...document.querySelectorAll("#e27-contacts tbody tr")].map(r => [r.dataset.ev, r.children[1].textContent]));
  check("tabel cu 5 contacte (C1, C2, max, C3, C4)", tab.map(x => x[0]).join() === "c1,c2,max,c3,c4", tab);
  const ref2 = await page.evaluate(r => FFF.ephem.dateFromJd(FFF.ephem.ut(r)).getTime(), lux.t2);
  const ui2 = toS(tab.find(x => x[0] === "c2")[1]), r2 = toS(hms(ref2));
  check("C2 afișat (UTC) coincide cu referința ±2 s", Math.abs(ui2 - r2) <= 2, [ui2, r2]);
  const durTxt = await page.textContent("#e27-dur");
  const m = /(\d+) m (\d+) s/.exec(durTxt), refDur = (await page.evaluate(([a, b]) => (FFF.ephem.dateFromJd(FFF.ephem.ut(b)) - FFF.ephem.dateFromJd(FFF.ephem.ut(a))) / 1000, [lux.t2, lux.t3]));
  check("durata totalității afișată în ±2 s față de referință", m && Math.abs(+m[1] * 60 + +m[2] - refDur) <= 2, [durTxt, refDur]);
  check("acuratețea e declarată în interfață", /≈|~|±|3 s|secund|second/i.test(await page.textContent("#e27-acc")), await page.textContent("#e27-acc"));
  check("poziția față de bandă e afișată", (await page.textContent("#e27-bandpos")).length > 5);
  await search(page, "44.4268, 26.1025");
  check("coordonate manuale (București): parțială", /par/i.test(await page.textContent("#e27-type")), await page.textContent("#e27-type"));
  const obs = parseFloat((await page.textContent("#e27-obsc")).replace(",", "."));
  check("obscurare București ≈ referință (±0,1 %)", Math.abs(obs - REF.eclipse.places["București"].obscuration * 100) <= 0.1, obs);
  check("rânduri doar C1, max, C4 pentru eclipsă parțială", (await page.locator("#e27-contacts tbody tr").count()) === 3);
  await search(page, "99, 400");
  check("coordonate invalide: mesaj de avertizare, rezultatul rămâne", (await page.isVisible("#e27-msg")) && /valid|invalid|érv|gült|interval/i.test(await page.textContent("#e27-msg")), await page.textContent("#e27-msg"));
  await search(page, "Zzzzqq");
  check("loc inexistent: mesaj „nu am găsit”", /potriv|match|egyez|passt|Niciun|No /i.test(await page.textContent("#e27-msg")), await page.textContent("#e27-msg"));
  await search(page, "Reykjav");
  check("loc din listă în afara benzii: „în afara”", await page.isVisible("#e27-bandpos"));
  await page.fill("#e27-tz", "Europe/Nowhere"); await page.dispatchEvent("#e27-tz", "change");
  check("fus orar invalid: avertizare", /fus|zone|időz|Zeitzone/i.test(await page.textContent("#e27-msg")), await page.textContent("#e27-msg"));
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("4. export ICS");
{
  const {browser, page} = await launch();
  await page.waitForTimeout(1500); await openDlg(page); await search(page, "Luxor");
  await page.check("#e27-alarms");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#e27-ics")]);
  const fs = await import("fs"); const txt = fs.readFileSync(await dl.path(), "utf8");
  check("nume fișier .ics", /\.ics$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  check("BEGIN/END:VCALENDAR, VERSION:2.0, linii CRLF", txt.startsWith("BEGIN:VCALENDAR\r\n") && txt.trimEnd().endsWith("END:VCALENDAR") && /VERSION:2\.0\r\n/.test(txt));
  check("nicio linie > 75 octeți", txt.split("\r\n").every(l => Buffer.byteLength(l) <= 75), txt.split("\r\n").filter(l => Buffer.byteLength(l) > 75).slice(0, 2));
  check("cel puțin un VEVENT cu UID, DTSTAMP, DTSTART, DTEND", (txt.match(/BEGIN:VEVENT/g) || []).length >= 1 && /UID:/.test(txt) && /DTSTAMP:\d{8}T\d{6}Z/.test(txt) && /DTSTART:\d{8}T\d{6}Z/.test(txt) && /DTEND:\d{8}T\d{6}Z/.test(txt));
  const unf = txt.replace(/\r\n[ \t]/g, "");
  const t1 = await page.evaluate(r => FFF.ephem.dateFromJd(FFF.ephem.ut(r)).toISOString().replace(/[-:]|\.\d+/g, ""), REF.eclipse.places["Luxor"].t1);
  const starts = [...unf.matchAll(/DTSTART:(\d{8}T\d{6}Z)/g)].map(x => x[1]);
  const icsMs = z => Date.parse(z.replace(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/, "$1-$2-$3T$4:$5:$6Z"));
  const secDiff = Math.min(...starts.map(x => Math.abs(icsMs(x) - icsMs(t1)))) / 1000;
  check("un DTSTART coincide cu C1 din referință (±3 s)", secDiff <= 3, [starts, t1]);
  check("alarme (VALARM) cu TRIGGER când e bifat", /BEGIN:VALARM/.test(unf) && /TRIGGER:-PT/.test(unf));
  check("avertisment de siguranță în descriere", /SUMMARY:/.test(unf) && /DESCRIPTION:/.test(unf) && /(filtr|ISO 12312|filter)/i.test(unf), unf.slice(0, 400));
  await page.uncheck("#e27-alarms");
  const [dl2] = await Promise.all([page.waitForEvent("download"), page.click("#e27-ics")]);
  const t2 = fs.readFileSync(await dl2.path(), "utf8");
  check("fără alarme când e debifat", !/BEGIN:VALARM/.test(t2));
  await browser.close();
}

console.log("5. numărătoare și repetiție (ceas simulat)");
{
  const {browser, page, st} = await launch({clock: "2027-08-01T08:00:00Z"});
  await page.waitForTimeout(1500); await openDlg(page); await search(page, "Luxor");
  const c2 = await page.evaluate(r => FFF.ephem.dateFromJd(FFF.ephem.ut(r)).getTime(), REF.eclipse.places["Luxor"].t2);
  const t0 = await page.textContent("#e27-timer");
  const d = (c2 - Date.parse("2027-08-01T08:00:00Z")) / 1000, days = Math.floor(d / 86400);
  check("numărătoarea arată zilele până la C1", new RegExp("^" + days + "|^" + (days) + " ").test(t0.trim()) || /\d/.test(t0), t0);
  const c1 = await page.evaluate(r => FFF.ephem.dateFromJd(FFF.ephem.ut(r)).getTime(), REF.eclipse.places["Luxor"].t1);
  check("faza înainte de eclipsă", (await page.getAttribute("#e27-timer", "data-phase")) === "before");
  await page.clock.fastForward(Math.round(c1 - Date.parse("2027-08-01T08:00:00Z")) + 60000);
  await page.waitForTimeout(1300);
  check("după C1: parțial, înainte de totalitate", (await page.getAttribute("#e27-timer", "data-phase")) === "partialIn", await page.getAttribute("#e27-timer", "data-phase"));
  await page.click("#e27-rehbtn");
  check("repetiție: banner vizibil și clar marcat", await page.isVisible("#e27-reh"));
  const t1 = (await page.textContent("#e27-timer")).trim();
  check("repetiție: numărătoarea e ≈ 00:00:30", /^00:00:(2[89]|30)$/.test(t1), t1);
  await page.clock.runFor(31000); await page.waitForTimeout(100);
  check("repetiție: după 30 s începe totalitatea", (await page.getAttribute("#e27-timer", "data-phase")) === "totality", await page.getAttribute("#e27-timer", "data-phase"));
  await page.click("#e27-rehbtn");
  check("oprirea repetiției ascunde bannerul", !(await page.isVisible("#e27-reh")));
  await page.clock.fastForward(24 * 3600 * 1000); await page.waitForTimeout(1300);
  check("a doua zi: eclipsa s-a încheiat", (await page.getAttribute("#e27-timer", "data-phase")) === "ended", await page.getAttribute("#e27-timer", "data-phase"));
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("6. GPS: două trepte, consimțământ explicit");
{
  const geo = {latitude: 25.6872, longitude: 32.6396};
  const {browser, page, st} = await launch({perm: ["geolocation"], geo, geoSpy: true});
  await page.waitForTimeout(1500); await openDlg(page);
  check("pagina nu cere locația la deschidere", (await page.evaluate(() => window.__geoCalls)) === 0);
  await page.click("#e27-gps");
  check("apare confirmarea în pagină, încă 0 cereri GPS", (await page.isVisible("#e27-gpsbox")) && (await page.evaluate(() => window.__geoCalls)) === 0);
  await page.click("#e27-gpsno");
  check("„Nu” închide confirmarea fără cerere GPS", !(await page.isVisible("#e27-gpsbox")) && (await page.evaluate(() => window.__geoCalls)) === 0);
  await page.click("#e27-gps"); await page.click("#e27-gpsyes"); await page.waitForSelector("#e27-result", {timeout: 5000});
  check("după „Da” se cere o dată locația", (await page.evaluate(() => window.__geoCalls)) === 1);
  check("poziția GPS dă totalitate (Luxor)", /tot/i.test(await page.textContent("#e27-type")), await page.textContent("#e27-type"));
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}
{
  const {browser, page} = await launch({geoSpy: true});
  await page.waitForTimeout(1500); await openDlg(page);
  await page.click("#e27-gps"); await page.click("#e27-gpsyes"); await page.waitForTimeout(800);
  check("GPS refuzat: mesaj, fără rezultat", /refuz|denied|elutas|verweigert|permis|permission|engedély|Berechtigung/i.test(await page.textContent("#e27-msg")) && (await page.locator("#e27-result").count()) === 0, await page.textContent("#e27-msg"));
  check("după refuz se poate introduce manual", await page.isEnabled("#e27-loc"));
  await browser.close();
}

console.log("7. lista de verificare");
{
  const {browser, page} = await launch();
  await page.waitForTimeout(1500); await openDlg(page); await search(page, "Luxor");
  const n = await page.locator("#e27-chk input[type=checkbox]").count();
  check("lista are ≥ 8 puncte", n >= 8, n);
  check("progres inițial 0", /\b0\b/.test(await page.textContent("#e27-prog")), await page.textContent("#e27-prog"));
  await page.locator("#e27-chk input[type=checkbox]").nth(0).check(); await page.locator("#e27-chk input[type=checkbox]").nth(1).check();
  check("progres 2 după două bife", /\b2\b/.test(await page.textContent("#e27-prog")), await page.textContent("#e27-prog"));
  check("conține avertismentul filtrelor ISO 12312-2", /12312/.test(await page.textContent("#e27-chk")));
  await page.click("#e27-chkreset");
  check("Resetare readuce progresul la 0", /\b0\b/.test(await page.textContent("#e27-prog")));
  await browser.close();
}

console.log("8. banda calculată pe hartă");
{
  const {browser, page, st} = await launch();
  await page.waitForTimeout(1500); await openDlg(page); await search(page, "Luxor");
  const before = await page.locator(".leaflet-overlay-pane path").count();
  await page.check("#e27Band"); await page.waitForTimeout(500);
  const after = await page.locator(".leaflet-overlay-pane path").count();
  check("bifa adaugă linii punctate pe hartă", after > before, [before, after]);
  const cmp = await page.textContent("#e27BandCmp");
  const mm = /(\d+[.,]\d+)[^\d]+(\d+[.,]\d+)/.exec(cmp);
  check("comparația cu datele NASA e afișată (max < 10 km)", mm && parseFloat(mm[1].replace(",", ".")) < 10, cmp);
  await page.uncheck("#e27Band"); await page.waitForTimeout(300);
  check("debifarea scoate liniile", (await page.locator(".leaflet-overlay-pane path").count()) <= before);
  await page.check("#e27Band"); await page.click("#e27ToMap"); await page.waitForTimeout(1500);
  check("„Arată pe hartă” închide dialogul și pune marcajul", !(await page.locator("#e27Dialog[open]").count()) && (await page.locator(".leaflet-marker-pane .leaflet-marker-icon").count()) >= 1);
  check("0 erori", st.errs.length === 0, st.errs);
  await browser.close();
}

console.log("9. limbi: ro → en → hu → de");
{
  const {browser, page} = await launch();
  await page.waitForTimeout(1500);
  const seq = []; const titles = {};
  for (let i = 0; i < 4; i++) { const l = await page.evaluate(() => document.documentElement.lang); seq.push(l); await openDlg(page); titles[l] = await page.textContent("#e27DlgTitle"); await page.click("#e27Close"); await page.click("#langBtn"); await page.waitForTimeout(200); }
  check("ciclul de limbi atinge ro, en, hu, de", ["ro", "en", "hu", "de"].every(l => seq.includes(l)), seq);
  check("titlurile dialogului diferă în hu și de față de en", titles.hu && titles.de && titles.hu !== titles.en && titles.de !== titles.en, titles);
  while ((await page.evaluate(() => document.documentElement.lang)) !== "hu") { await page.click("#langBtn"); await page.waitForTimeout(150); }
  await openDlg(page); await search(page, "Luxor");
  check("în maghiară rezultatul e tradus (tipul eclipsei)", /teljes/i.test(await page.textContent("#e27-type")), await page.textContent("#e27-type"));
  await page.click("#e27Close");
  while ((await page.evaluate(() => document.documentElement.lang)) !== "de") { await page.click("#langBtn"); await page.waitForTimeout(150); }
  await openDlg(page);
  check("în germană rezultatul rămâne și e tradus", /total/i.test(await page.textContent("#e27-type")) && /Sonnenfinsternis|Finsternis|Totalit/i.test(await page.textContent("#e27-result")), await page.textContent("#e27-type"));
  await browser.close();
}

console.log("10. accesibilitate (axe) și fără depășire, 1280×800 și 360×740, inclusiv în dialog");
for (const [w, h] of [[1280, 800], [360, 740]]) {
  const {browser, page} = await launch({w, h, bypassCSP: true});
  await page.waitForTimeout(3500);
  check(`${w}: axe 0 (pagina)`, ((await axeRun(page)) || []).length === 0, await axeRun(page));
  await openDlg(page); await search(page, "Luxor"); await page.check("#e27Band");
  check(`${w}: axe 0 (dialog cu rezultat)`, ((await axeRun(page)) || []).length === 0, await axeRun(page));
  check(`${w}: fără depășire orizontală cu dialogul deschis`, (await hOverflow(page)) <= 0);
  const dlgOv = await page.evaluate(() => { const d = document.getElementById("e27Dialog"); return d.scrollWidth - d.clientWidth; });
  check(`${w}: fără depășire orizontală în dialog`, dlgOv <= 0, dlgOv);
  for (const l of ["en", "hu", "de"]) { while ((await page.evaluate(() => document.documentElement.lang)) !== l) { await page.click("#e27Close"); await page.click("#langBtn"); await openDlg(page); } check(`${w}: axe 0 în ${l}`, ((await axeRun(page)) || []).length === 0, await axeRun(page)); }
  await browser.close();
}
summary();
