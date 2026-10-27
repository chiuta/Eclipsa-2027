// Eclipsa-2027 2.2.0 — „Umbra pe hartă”: poziția și conturul umbrei Lunii pe harta Leaflet, din elementele Besselian ale kitului.
// Verificări independente: centrul = punctele liniei centrale calculate de kit (path.samples), lățimea conturului = lățimea benzii (greatest.pathWidthKm).
// Rulare: node tests/umbra-pe-harta.test.mjs   (PW_ROOT / CHROMIUM_PATH ca la celelalte teste)
import {launch, check, summary, hOverflow, axeRun} from "./_lib.mjs";
const {browser, page, st} = await launch({w: 1100, h: 800, locale: "en-US"});
await page.waitForTimeout(2500);
check("butonul „Umbra pe hartă” există și e vizibil", await page.isVisible("#filmBtn"), await page.textContent("#filmBtn"));
check("nu pornește singur: bara ascunsă, niciun contur", !(await page.isVisible("#filmBar")) && (await page.locator("path.film-umbra").count()) === 0);

// 1. Geometrie, verificată independent de desen
const G = await page.evaluate(() => {
  const P = ECL27.getPath(), R = (a, b) => a * Math.PI / 180, rad = Math.PI / 180;
  const hav = (a, b) => { const dLa = (b[0] - a[0]) * rad, dLo = (b[1] - a[1]) * rad, h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLo / 2) ** 2; return 2 * 6371.0088 * Math.asin(Math.sqrt(h)); };
  const central = P.features.find(f => f.properties.kind === "central-line").geometry.coordinates.map(c => [c[1], c[0]]);
  // distanța minimă la linia centrală (interpolare fină pe segmente)
  const dLine = pt => { let m = 1e9; for (let i = 0; i < central.length - 1; i++) for (let k = 0; k <= 20; k++) { const q = [central[i][0] + (central[i + 1][0] - central[i][0]) * k / 20, central[i][1] + (central[i + 1][1] - central[i][1]) * k / 20]; m = Math.min(m, hav(pt, q)); } return m; };
  const out = {samples: [], widths: null};
  P.properties.samples.filter((s, i) => i % 3 === 0 && s.central).forEach(s => { const r = E27FILM.at(s.tt); out.samples.push({dKm: r.center ? hav([r.center.lat, r.center.lon], [s.central[1], s.central[0]]) : null, n: r.ring.length}); });
  const g = FFF.ephem.eclipse.greatest(), r = E27FILM.at(g.tt);
  const ds = r.ring.map(dLine), dc = r.ring.map(p => hav(p, [r.center.lat, r.center.lon])); out.widths = {pathWidthKm: g.pathWidthKm, ringMax: Math.max(...ds), alongMax: Math.max(...dc), n: r.ring.length, centerVsGreatest: hav([r.center.lat, r.center.lon], [g.lat, g.lon])};
  out.range = E27FILM.range(); out.range = {t0: out.range.t0, t1: out.range.t1, minutes: (out.range.t1 - out.range.t0) * 1440};
  return out;
});
check("centrul umbrei coincide cu linia centrală a kitului (≤ 1 km) la toate probele", G.samples.length > 10 && G.samples.every(s => s.dKm != null && s.dKm < 1), G.samples.map(s => s.dKm));
check("conturul are 72 de puncte la maxim", G.widths.n === 72, G.widths.n);
check("jumătate din lățimea benzii (" + (G.widths.pathWidthKm / 2).toFixed(0) + " km) ≈ distanța maximă contur–linie centrală (±4 km)", Math.abs(G.widths.ringMax - G.widths.pathWidthKm / 2) < 4, G.widths);
check("la maxim conturul e aproape circular la maxim (extensie pe direcția mersului / semilățime între 0,95 și 1,3)", G.widths.alongMax / G.widths.ringMax > 0.95 && G.widths.alongMax / G.widths.ringMax < 1.3, G.widths);
check("centrul la maxim = punctul maximului global (≤ 1 km)", G.widths.centerVsGreatest < 1, G.widths.centerVsGreatest);
check("intervalul filmului: ~ 3–4 ore reale", G.range.minutes > 150 && G.range.minutes < 260, G.range.minutes);

// 2. Interfața
await page.click("#filmBtn"); await page.waitForTimeout(700);
check("după clic: bara vizibilă, contur pe hartă, redare pornită", (await page.isVisible("#filmBar")) && (await page.locator("path.film-umbra").count()) === 1 && (await page.evaluate(() => E27FILM.state().playing)));
const p0 = await page.evaluate(() => E27FILM.state().prog); await page.waitForTimeout(2000); const p1 = await page.evaluate(() => E27FILM.state().prog);
check("avansează ≈ 2 s / 30 s (6,7 %)", Math.abs((p1 - p0) - 2 / 30) < 0.03, [p0, p1]);
await page.click("#filmPlay"); const p2 = await page.evaluate(() => E27FILM.state().prog); await page.waitForTimeout(600);
check("pauză: nu mai avansează; butonul spune „Redare”", (await page.evaluate(() => E27FILM.state().prog)) === p2 && (await page.getAttribute("#filmPlay", "aria-label")) === "Play");
await page.fill("#filmRange", "500"); await page.dispatchEvent("#filmRange", "input"); await page.waitForTimeout(200);
const info = await page.textContent("#filmInfo");
check("cursor la 50 %: ora UTC și centrul afișate (≈ 10 h UTC)", /^(09|10|11):\d\d:\d\d UTC · umbra centre \d+\.\d\d, \d+\.\d\d · speed ×\d+/.test(info), info);
check("la 50 % contur de 72 de puncte pe hartă", (await page.locator("path.film-umbra").count()) === 1 && (await page.evaluate(() => E27FILM.state().hasRing)));
await page.fill("#filmRange", "0"); await page.dispatchEvent("#filmRange", "input"); await page.waitForTimeout(150);
check("la început (umbra abia atinge Pământul) conturul e parțial sau lipsește, fără erori", st.errs.length === 0, st.errs);
check("nota de onestitate vizibilă (aproximare, fără penumbră, nu e instrument de siguranță)", /72 points|approximated/i.test(await page.textContent("#filmNote")) && /not a safety tool/i.test(await page.textContent("#filmNote")) && /penumbra/i.test(await page.textContent("#filmNote")));
check("360 px: fără depășire orizontală cu bara deschisă", await (async () => { await page.setViewportSize({width: 360, height: 740}); await page.waitForTimeout(300); return (await hOverflow(page)) <= 0; })());
await page.setViewportSize({width: 1100, height: 800});
await page.click("#filmClose"); await page.waitForTimeout(200);
check("închidere: bara ascunsă, conturul scos de pe hartă", !(await page.isVisible("#filmBar")) && (await page.locator("path.film-umbra").count()) === 0 && (await page.evaluate(() => E27FILM.state()) == null));
// RO
await page.evaluate(() => { const s = document.getElementById("langBtn"); s.value = "ro"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await page.waitForTimeout(400);
check("RO: butonul spune „Umbra pe hartă”", /Umbra pe hartă/.test(await page.textContent("#filmBtn")), await page.textContent("#filmBtn"));
await page.click("#filmBtn"); await page.waitForTimeout(500);
check("RO: nota în română", /Contur aproximat din 72 de puncte/.test(await page.textContent("#filmNote")));
await page.click("#filmBtn"); await page.waitForTimeout(200);
check("al doilea clic pe buton oprește filmul", !(await page.isVisible("#filmBar")));
check("0 pageerror/rețea/CSP", st.errs.length === 0 && st.net.length === 0 && (await page.evaluate(() => window.__csp)).length === 0, [st.errs, st.net]);
await browser.close();
{ // axe, cu CSP ocolit doar pentru injectarea bibliotecii de test
  const {browser: b2, page: p2} = await launch({w: 1100, h: 800, locale: "en-US", bypassCSP: true}); await p2.waitForTimeout(2500);
  await p2.click("#filmBtn"); await p2.waitForTimeout(600); await p2.click("#filmPlay");
  const ax0 = await axeRun(p2), ax = ax0 && ax0.filter(v => !/^landmark-complementary-is-top-level:1:#tf-donate/.test(v)); /* #tf-donate: blocul standard de donații, preexistent și neatins aici */ if (ax !== null) check("axe: 0 violări noi cu bara deschisă", ax.length === 0, ax); else check("axe indisponibil (omis)", true);
  await b2.close();
}
summary();
