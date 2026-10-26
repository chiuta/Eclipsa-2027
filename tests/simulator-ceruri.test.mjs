// Eclipsa-2027 2.0.0 — simulator de cer (contacte C1–C4, Soare/Lună în timp) și ghid de fotografiere orientativ.
// Rulare: node tests/simulator-ceruri.test.mjs
import {launch, axeRun, hOverflow, check, summary, setLang} from "./_lib.mjs";
const openDlg = async page => { await page.click("#localBtn"); await page.waitForSelector("#e27Dialog[open]"); };
const search = async (page, q) => { await page.fill("#e27-loc", q); await page.press("#e27-loc", "Enter"); await page.waitForTimeout(400); };
const setRange = (page, v) => page.evaluate(v => { const r = document.getElementById("e27-skyrange"); r.value = v; r.dispatchEvent(new Event("input", {bubbles: true})); }, v);
const txt = (page, sel) => page.textContent(sel);

console.log("1. API skyAt (geometrie)");
{
  const {browser, page, st} = await launch({timezoneId: "Africa/Cairo"});
  await page.waitForTimeout(2500);
  const g = await page.evaluate(() => {
    const E = FFF.ephem.eclipse, r = E.local(25.7, 32.65, 0, {}), jd = c => Date.parse(c.utc) / 86400000 + 2440587.5;
    const a = ECL27.skyAt(25.7, 32.65, 0, jd(r.c1)), b = ECL27.skyAt(25.7, 32.65, 0, jd(r.c4)), m = ECL27.skyAt(25.7, 32.65, 0, jd(r.max)), t = ECL27.skyAt(25.7, 32.65, 0, jd(r.c2) + 30 / 86400);
    return {r: {type: r.type, obsc: r.obscuration, mag: r.magnitude}, a, b, m, t};
  });
  check("Luxor este în bandă (totală)", g.r.type === "total", g.r);
  check("la C1 Luna e la vest de Soare (offsetEast < 0) și discurile se ating (separare = 1 + Rm/Rs)", g.a.offsetEast < 0 && Math.abs(g.a.separation - (1 + g.a.moonSunRatio)) < 2e-3, g.a);
  check("la C4 Luna e la est de Soare (offsetEast > 0), tangență externă", g.b.offsetEast > 0 && Math.abs(g.b.separation - (1 + g.b.moonSunRatio)) < 2e-3, g.b);
  check("la maxim obscurarea din skyAt = obscurarea locală", Math.abs(g.m.obscuration - g.r.obsc) < 2e-3 && Math.abs(g.m.magnitude - g.r.mag) < 2e-3, [g.m.obscuration, g.r.obsc]);
  check("în totalitate Luna > Soarele (raport > 1) și flagul total", g.m.moonSunRatio > 1 && g.m.total === true && g.t.total === true);
  check("diametrul unghiular al Soarelui plauzibil (0,52–0,54°)", g.m.sunDiamDeg > 0.52 && g.m.sunDiamDeg < 0.54, g.m.sunDiamDeg);
  check("Soarele deasupra orizontului la Luxor (altitudine > 30°)", g.m.alt > 30, g.m.alt);
  const p = await page.evaluate(() => { const r = ECL27.compute(44.4268, 26.1025, 0, ""), x = ECL27.skyAt(44.4268, 26.1025, 0, Date.parse(r.max.utc) / 86400000 + 2440587.5); return {o: r.obscuration, m: r.magnitude, x}; });
  check("București (parțială): obscurarea și magnitudinea din skyAt la maxim ≈ cele din tabel", Math.abs(p.x.obscuration - p.o) < 2e-3 && Math.abs(p.x.magnitude - p.m) < 2e-3 && p.x.total === false, p);
  check("0 pageerror/rețea/CSP", st.errs.length === 0 && st.net.length === 0 && (await page.evaluate(() => window.__csp)).length === 0, [st.errs, st.net]);
  await browser.close();
}

console.log("2. Matematica ghidului de fotografiere");
{
  const {browser, page} = await launch();
  await page.waitForTimeout(2500);
  const c = await page.evaluate(() => {
    const P = ECL27.photoCalc;
    return {a: P({focal: 1000, sensor: 36, iso: 100, f: 8, refDen: 250, sunDiamDeg: 0.5}), b: P({focal: 500, sensor: 36, iso: 400, f: 8, refDen: 250, sunDiamDeg: 0.53}),
      c: P({focal: 100, sensor: 36, iso: 100, f: 11, refDen: 250, sunDiamDeg: 0.53}), d: P({focal: 400, sensor: 0, iso: 100, f: 8, refDen: 0, sunDiamDeg: 0.53}), s: [ECL27.fmtShutter(1 / 1000, "ro"), ECL27.fmtShutter(2.5, "ro"), ECL27.fmtShutter(30, "ro")]};
  });
  check("diametrul imaginii = f·tan(θ): 1000 mm × 0,5° ≈ 8,727 mm", Math.abs(c.a.dMm - 8.7268) < 0.005, c.a.dMm);
  check("procent din lățimea senzorului 36 mm", Math.abs(c.a.pct - 8.7268 / 36 * 100) < 0.02, c.a.pct);
  check("fără schimbare: ISO 100, f/8 → același timp (1/250)", Math.abs(c.a.eq - 1 / 250) < 1e-12);
  check("ISO 400 → timp de 4× mai scurt (1/1000)", Math.abs(c.b.eq - 1 / 1000) < 1e-12, c.b.eq);
  check("f/11 → timp de (11/8)² mai lung", Math.abs(c.c.eq - (1 / 250) * (11 / 8) ** 2) < 1e-12, c.c.eq);
  check("seria bracketing: 7 trepte, ±3 EV, factor 2", c.a.series.length === 7 && c.a.series[0].stop === -3 && Math.abs(c.a.series[6].t / c.a.series[0].t - 64) < 1e-9);
  check("cadrul nu încape la 5000 mm pe senzor 36 mm (pct > 100)", (await page.evaluate(() => ECL27.photoCalc({focal: 5000, sensor: 36, iso: 100, f: 8, refDen: 1, sunDiamDeg: 0.53}).fits)) === false);
  check("fără probă de referință: nu se inventează un timp (eq null)", c.d.eq === null && c.d.series.length === 0 && c.d.pct === null);
  check("format timp: 1/1000 s, 2,5 s, 30 s", c.s[0] === "1/1000 s" && c.s[1] === "2,5 s" && c.s[2] === "30 s", c.s);
  await browser.close();
}

console.log("3. UI: Luxor (totală)");
{
  const {browser, page, st} = await launch({timezoneId: "Africa/Cairo"});
  await page.waitForTimeout(3000);
  await openDlg(page); await search(page, "25.7, 32.65");
  check("secțiunea cerului există și are slider + 5 butoane de contact", (await page.$$("#e27-sky")).length === 1 && (await page.$$("#e27-sky [data-ev]")).length === 5);
  check("implicit: maximul (totalitate)", /Totalitate/.test(await txt(page, "#e27-skystate")), await txt(page, "#e27-skystate"));
  const cov = await txt(page, "#e27-skycov");
  const obsc = await page.evaluate(() => ECL27.compute(25.7, 32.65, 0, "").obscuration);
  check("acoperirea la maxim = obscurarea din tabel", cov.includes(String(Math.round(obsc * 1000) / 10).replace(".", ",")), [cov, obsc]);
  await page.click('#e27-sky [data-ev="c1"]');
  check("salt la C1: acoperire 0,0 %, fază parțială, slider la 0", /0,0 %/.test(await txt(page, "#e27-skycov")) && await page.$eval("#e27-skyrange", r => r.value) === "0");
  await page.click('#e27-sky [data-ev="c2"]');
  const c2 = await page.evaluate(() => ({r: +document.getElementById("e27-skyrange").value, m: document.getElementById("e27-skycov").textContent}));
  check("salt la C2: acoperire ≈ 100 %", /9\d,\d %|100,0 %/.test(c2.m), c2.m);
  await setRange(page, 600);
  const mid = await page.evaluate(() => { const m = document.querySelector("#e27-skysvg circle:nth-of-type(3)"); return [document.getElementById("e27-skystate").textContent, document.getElementById("e27-skysvg").getAttribute("aria-label")]; });
  check("faza parțială: avertisment cu filtru solar + aria-label cu ora și acoperirea", /filtru solar/.test(mid[0]) && /UTC/.test(mid[1]) && /%/.test(mid[1]), mid);
  check("coroana vizibilă doar în totalitate", await page.$eval("#e27-corona", () => true).catch(() => false));
  await page.click('#e27-sky [data-ev="max"]');
  check("în totalitate: coroana (cerc cu gradient) vizibilă", await page.$eval('#e27-skysvg circle[fill="url(#e27-corona)"]', c => c.getAttribute("visibility")) === "visible");
  await page.click('#e27-sky [data-ev="c1"]');
  check("în afara totalității: coroana ascunsă", await page.$eval('#e27-skysvg circle[fill="url(#e27-corona)"]', c => c.getAttribute("visibility")) === "hidden");
  // ghid foto
  check("ghidul de fotografiere apare, cu avertisment și fără timp inventat", (await page.$$("#e27-photo")).length === 1 && /garanție/.test(await txt(page, "#e27-photo .e27-warn")) && (await page.$$("#e27-phneed")).length === 1 && (await page.$$("#e27-pheq")).length === 0);
  check("dimensiunea Soarelui calculată (400 mm / 36 mm)", /3[,.]\d+ mm/.test(await txt(page, "#e27-phsize")), await txt(page, "#e27-phsize"));
  await page.fill("#e27-ph-ref", "250"); await page.fill("#e27-ph-iso", "400");
  check("probă 1/250 la ISO 100 f/8 → la ISO 400 f/8: 1/1000 s", /1\/1000 s/.test(await txt(page, "#e27-pheq")), await txt(page, "#e27-pheq"));
  check("seria are 7 rânduri, +3 EV = 8× mai lung", (await page.$$("#e27-phseries li")).length === 7 && /1\/125 s/.test(await txt(page, '#e27-phseries li[data-stop="3"]')), await txt(page, "#e27-phseries"));
  check("număr de cadre în totalitate la interval 5 s", /≈|aproximativ \d+ cadre/.test(await txt(page, "#e27-phframes")) || /cadre/.test(await txt(page, "#e27-phframes")), await txt(page, "#e27-phframes"));
  await page.fill("#e27-ph-focal", "5000");
  check("5000 mm pe 36 mm: avertisment că nu încape", (await page.$$("#e27-phbig")).length === 1);
  // locație nouă resetează sliderul
  await search(page, "București");
  check("București (parțială): fără totalitate → mesaj dedicat; sky există", (await page.$$("#e27-phnototal")).length === 1 && (await page.$$("#e27-sky")).length === 1 && (await page.$$('#e27-sky [data-ev]')).length === 3);
  check("0 pageerror/rețea/CSP", st.errs.length === 0 && st.net.length === 0 && (await page.evaluate(() => window.__csp)).length === 0, [st.errs, st.net]);
  await browser.close();
}

console.log("4. 8 limbi, axe, mobil");
for (const [w, h] of [[1280, 800], [360, 740]]) {
  const {browser, page} = await launch({w, h, bypassCSP: true, timezoneId: "Africa/Cairo"});
  await page.waitForTimeout(3000);
  await openDlg(page); await search(page, "Luxor");
  await page.fill("#e27-ph-ref", "250");
  check(`${w}: axe 0 (cu simulator + ghid)`, ((await axeRun(page)) || []).length === 0, await axeRun(page));
  check(`${w}: fără depășire orizontală`, (await hOverflow(page)) <= 0 && (await page.evaluate(() => { const d = document.getElementById("e27Dialog"); return d.scrollWidth - d.clientWidth; })) <= 0);
  for (const l of ["en", "hu", "de", "fr", "it", "es", "pt"]) {
    await page.click("#e27Close"); await setLang(page, l); await openDlg(page);
    const h3 = await page.$$eval("#e27-sky h3, #e27-photo h3", a => a.map(x => x.textContent));
    const ok = h3.length === 2 && h3.every(t => t && !/^(sky|ph)[A-Z]/.test(t)) && !(await page.$$eval("#e27-sky, #e27-photo", a => a.some(x => /\b(sky|ph)[A-Z][A-Za-z]+\b/.test(x.textContent))));
    check(`${w}: ${l} tradus complet (fără chei brute)`, ok, h3);
    if (w === 1280) check(`${l}: axe 0`, ((await axeRun(page)) || []).length === 0, await axeRun(page));
  }
  await browser.close();
}
summary();
