// Eclipsa-2027 2.1.0 — animația fazelor (C1→C4), alarma la contacte C1–C4 (în pagină, repetiție cu ceas simulat) și legătura către Bolta.
// Rulare: node tests/alarma-animatie.test.mjs   (PW_ROOT / CHROMIUM_PATH ca la celelalte teste)
import {launch, check, summary, hOverflow} from "./_lib.mjs";
const openDlg = async page => { await page.click("#localBtn"); await page.waitForSelector("#e27Dialog[open]"); };
const search = async (page, q) => { await page.fill("#e27-loc", q); await page.press("#e27-loc", "Enter"); await page.waitForTimeout(400); };

console.log("1. Animația fazelor");
{
  const {browser, page, st} = await launch({timezoneId: "Africa/Cairo"});
  await page.waitForTimeout(2500);
  await openDlg(page); await search(page, "25.7, 32.65");
  check("butonul de animație există, neapăsat, nu pornește singur", (await page.getAttribute("#e27-skyplay", "aria-pressed")) === "false");
  await page.click('#e27-sky [data-ev="c1"]');
  const v0 = +(await page.$eval("#e27-skyrange", r => r.value));
  await page.click("#e27-skyplay");
  check("după clic: aria-pressed=true, text „Pauză”", (await page.getAttribute("#e27-skyplay", "aria-pressed")) === "true" && /Pauză/.test(await page.textContent("#e27-skyplay")));
  await page.waitForTimeout(1500);
  const v1 = +(await page.$eval("#e27-skyrange", r => r.value));
  check("cursorul avansează de la C1 (≈ durata eclipsei / 30 s)", v1 > v0 + 30, [v0, v1]);
  const total = +(await page.$eval("#e27-skyrange", r => r.max));
  check("viteza ≈ durata C1→C4 în 30 s (1,5 s ≈ 5 % din parcurs)", Math.abs((v1 - v0) / total - 1.5 / 30) < 0.03, [v0, v1, total]);
  await page.click("#e27-skyplay");
  const v2 = +(await page.$eval("#e27-skyrange", r => r.value)); await page.waitForTimeout(500);
  check("pauză: nu mai avansează", +(await page.$eval("#e27-skyrange", r => r.value)) === v2);
  await page.click("#e27-skyplay"); await page.click('#e27-sky [data-ev="c2"]'); await page.waitForTimeout(400);
  check("un salt la contact oprește animația", (await page.getAttribute("#e27-skyplay", "aria-pressed")) === "false");
  await page.click('#e27-sky [data-ev="c3"]'); await page.click("#e27-skyplay"); await page.waitForTimeout(31000);
  check("la C4 animația se oprește singură (slider la capăt)", (await page.getAttribute("#e27-skyplay", "aria-pressed")) === "false" && +(await page.$eval("#e27-skyrange", r => r.value)) === total);
  check("0 pageerror/rețea/CSP", st.errs.length === 0 && st.net.length === 0 && (await page.evaluate(() => window.__csp)).length === 0, [st.errs, st.net]);
  await browser.close();
}

console.log("2. Alarma la contacte (ceas simulat + repetiție)");
{
  const {browser, page, st} = await launch({timezoneId: "Africa/Cairo", clock: "2027-08-02T08:00:00Z"});
  await page.waitForTimeout(1500);
  await openDlg(page); await search(page, "25.7, 32.65");
  await page.evaluate(() => { window.__v = 0; window.__o = 0; navigator.vibrate = () => { window.__v++; return true; };
    window.AudioContext = class { constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; } resume() {} createOscillator() { window.__o++; return {frequency: {}, connect() {}, start() {}, stop() {}}; } createGain() { return {gain: {setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect() {}}; } }; });
  check("caseta de alarmă există, implicit oprită, cu notă de limite", !(await page.isChecked("#e27-beep")));
  await page.click("#e27-beeptest");
  check("butonul de test sună (2 tonuri) și vibrează", (await page.evaluate(() => window.__o)) === 2 && (await page.evaluate(() => window.__v)) === 1);
  await page.click("#e27-rehbtn");           // repetiție: începe cu 30 s înainte de C2
  await page.check("#e27-beep");
  const before = await page.evaluate(() => window.__o);
  await page.clock.runFor(20000);
  check("înainte de C2 (după 20 s): fără alarmă de contact", (await page.evaluate(() => window.__o)) - before === 0, await page.evaluate(() => window.__o));
  await page.clock.runFor(12000);
  check("la C2: mesaj de alarmă + 2 tonuri", /Contact C2/.test(await page.textContent("#e27-alarmmsg")) && (await page.evaluate(() => window.__o)) - before === 2, [await page.textContent("#e27-alarmmsg"), await page.evaluate(() => window.__o)]);
  // C3: cu 10 s înainte → avertisment
  const t = await page.evaluate(() => { const r = ECL27.compute(25.7, 32.65, 0, ""); return {c2: Date.parse(r.c2.utc), c3: Date.parse(r.c3.utc)}; });
  const tot = t.c3 - t.c2;
  await page.clock.runFor(tot - 12000 - 5000);   // ne aflăm cu ≈ 15 s înainte de C3 (după cele 12 s deja trecute)
  const o1 = await page.evaluate(() => window.__o);
  await page.clock.runFor(6000);
  check("cu 10 s înainte de C3: avertisment „pregătește filtrul”", /pregătește filtrul/.test(await page.textContent("#e27-alarmmsg")), await page.textContent("#e27-alarmmsg"));
  await page.clock.runFor(12000);
  check("la C3: „pune filtrul solar la loc ACUM”", /Contact C3/.test(await page.textContent("#e27-alarmmsg")) && /ACUM/.test(await page.textContent("#e27-alarmmsg")));
  check("după avertisment + C3 au sunat tonurile (3 + 2)", (await page.evaluate(() => window.__o)) - o1 === 5, (await page.evaluate(() => window.__o)) - o1);
  await page.uncheck("#e27-beep"); const o2 = await page.evaluate(() => window.__o);
  await page.clock.runFor(30000);
  check("alarma oprită: nu mai sună", (await page.evaluate(() => window.__o)) === o2);
  check("0 pageerror/rețea/CSP", st.errs.length === 0 && st.net.length === 0 && (await page.evaluate(() => window.__csp)).length === 0, [st.errs, st.net]);
  await browser.close();
}

console.log("3. Legătura către Bolta (aplicații separate)");
{
  const {browser, page, st} = await launch({timezoneId: "Africa/Cairo", w: 360, h: 740});
  await page.waitForTimeout(2000);
  const a = await page.$eval("#bolta-sister a", x => [x.href, x.rel, x.target]);
  check("linie statică: link către Bolta, noopener, filă nouă", a[0] === "https://chiuta.github.io/Bolta/" && /noopener/.test(a[1]) && a[2] === "_blank", a);
  check("textul spune că aplicațiile sunt separate", /separate/i.test(await page.textContent("#bolta-sister")));
  await openDlg(page); await search(page, "25.7, 32.65");
  const d = await page.$eval("#e27-bolta a", x => [x.href, x.rel, x.title.length > 20]);
  check("link și în dialog (cu explicație)", d[0] === "https://chiuta.github.io/Bolta/" && /noopener/.test(d[1]) && d[2], d);
  check("fără depășire orizontală pe 360 px", (await hOverflow(page)) <= 0, await hOverflow(page));
  check("0 cereri de rețea (linkul nu se accesează singur)", st.net.length === 0, st.net);
  await browser.close();
}
summary();
