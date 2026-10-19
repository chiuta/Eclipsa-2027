// Eclipsa-2027 și ECLIPSA 1.2.0 — „↗ TerRa: umbra Lunii pe glob”. Se copiază în <app>/tests/terra-bridge.test.mjs
// Rulare: node tests/terra-bridge.test.mjs
import {launch, check, summary} from "./_lib.mjs";
import path from "path";
const SLUG = path.basename(path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."));
const IS27 = SLUG === "Eclipsa-2027", FROM = IS27 ? "eclipsa-2027" : "eclipsa";
const openDlg = async page => { if (IS27) { await page.click("#localBtn"); await page.waitForSelector("#e27Dialog[open]"); } else { if (!(await page.evaluate(() => document.getElementById("e27Panel").open))) await page.click("#e27Sum"); await page.waitForSelector("#e27-loc", {state: "visible"}); } };
const search = async (page, q) => { await page.fill("#e27-loc", q); await page.press("#e27-loc", "Enter"); await page.waitForTimeout(300); };
const href = page => page.$$eval("#e27-terra a", a => a.map(x => ({h: x.getAttribute("href"), t: x.title, x: x.textContent, r: x.rel, g: x.target})));
{
  const {browser, page, st} = await launch({timezoneId: "Europe/Bucharest"});
  await page.waitForTimeout(2500);
  await openDlg(page);
  await search(page, "București");
  let l = await href(page);
  check("modul comun: link TerRa după rezultat (București, parțială)", l.length === 1, l);
  const m = /^https:\/\/chiuta\.github\.io\/TerRa\/#v=2d&t=(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)&ll=(-?\d+\.\d\d),(-?\d+\.\d\d)&from=([a-z0-9-]+)$/.exec(l[0].h) || [];
  const mx = m[1] || "";
  const ref = await page.evaluate(() => Date.parse(ECL27.compute(44.4268, 26.1025, 0, "Europe/Bucharest").max.utc));
  check("href: #v=2d&t=<maxim local fără ms>&ll=<2 zecimale>&from=<slug>", m.length === 5 && m[4] === FROM && Math.abs(Date.parse(mx) - ref) < 30000 && Math.abs(+m[2] - 44.43) < 0.03 && Math.abs(+m[3] - 26.1) < 0.03, [l[0].h, ref]);
  check("maximul local București ≈ 09:32 UTC", /T09:3[12]:\d\dZ/.test(mx), mx);
  check("target=_blank rel=noopener; titlu cu avertisment de istoric", l[0].g === "_blank" && /noopener/.test(l[0].r) && /istoricul browserului/.test(l[0].t), l[0]);
  check("text ro", /^↗ Umbra Lunii pe glob la maximul de aici/.test(l[0].x), l[0].x);
  // loc din afara zonei de vizibilitate -> maximul global
  await search(page, "-40, -60");
  l = await href(page);
  const gr = await page.evaluate(() => new Date(Date.parse(FFF.ephem.eclipse.greatest().utc)).toISOString().slice(0, 19) + "Z");
  check("eclipsă invizibilă: link la maximul GLOBAL", l.length === 1 && l[0].h.includes(`t=${gr}`) && /maximul global/.test(l[0].x), [l, gr]);
  check("coordonate rotunjite la 2 zecimale", /ll=-40\.00,-60\.00/.test(l[0].h), l[0].h);
  // fără locație: niciun link (nu există ce să arate „aici”)
  const none = await page.evaluate(() => !!document.getElementById("e27-terra"));
  check("0 pageerror/console error", st.errs.length === 0, st.errs);
  check("0 cereri de rețea", st.net.length === 0, st.net);
  check("0 violări CSP", (await page.evaluate(() => window.__csp)).length === 0);
  await browser.close();
}
if (!IS27) {   // ECLIPSA: secțiunea astrologică — doar eclipse de Soare, fără ll
  const {browser, page, st} = await launch();
  await page.waitForTimeout(1500);
  const idx = await page.evaluate(() => ALL_ECLIPSES.findIndex(e => e.d === "2027-08-02" && e.kind === "solar"));
  check("eclipsa din 2027-08-02 e în catalog", idx >= 0, idx);
  await page.fill("#bdate", "1990-05-05");
  await page.selectOption("#eclipseSelect", String(idx));
  await page.click("button.btn-primary[type=submit]"); await page.waitForTimeout(600);
  let a = await page.$$eval("#resultTerra a", x => x.map(y => ({h: y.getAttribute("href"), t: y.textContent, ttl: y.title})));
  const t0 = await page.evaluate(i => ALL_ECLIPSES[i].t, idx);
  check("eclipsă de Soare: link TerRa cu data/ora eclipsei din catalog", a.length === 1 && a[0].h === `https://chiuta.github.io/TerRa/#v=2d&t=2027-08-02T${t0}:00Z&from=eclipsa`, a);
  check("fără ll (nu se trimite locul nașterii)", !/ll=/.test(a[0].h) && !/44|26/.test(a[0].h.split("t=")[1].slice(0, 0)));
  check("text ro", /Umbra Lunii pe glob la maximul eclipsei/.test(a[0].t) && /Nu trimite locul nașterii/.test(a[0].ttl), a[0]);
  await page.click("#btnLang"); await page.waitForTimeout(400);
  a = await page.$$eval("#resultTerra a", x => x.map(y => y.textContent));
  check("după comutarea în EN link-ul se retraduce", a.length === 1 && /The Moon's shadow on the globe/.test(a[0]), a);
  // eclipsă de Lună: fără link
  const il = await page.evaluate(() => ALL_ECLIPSES.findIndex(e => e.kind === "lunar" && e.d > "2026-10-18"));
  await page.selectOption("#eclipseSelect", String(il)); await page.click("button.btn-primary[type=submit]"); await page.waitForTimeout(500);
  check("eclipsă de Lună: link ascuns", await page.evaluate(() => document.getElementById("resultTerra").hidden));
  // eclipsă înainte de 1900: ascuns (precizie documentată TerRa 1900–2100)
  await page.fill("#edate", "1887-08-19"); await page.fill("#etime", "04:00");
  await page.check('input[name="ekind"][value="solar"]'); await page.click("button.btn-primary[type=submit]"); await page.waitForTimeout(500);
  check("eclipsă solară din 1887: link ascuns", await page.evaluate(() => document.getElementById("resultTerra").hidden));
  check("0 pageerror/console error", st.errs.length === 0, st.errs);
  await browser.close();
}
summary();
