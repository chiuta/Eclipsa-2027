// Ajutoare comune pentru testele Playwright (rețea blocată, CSP real, axe opțional).
// [fff-portable] axe-core: FFF_AXE / AXE_PATH, apoi pachetul `axe-core` (npm i -D axe-core). Dacă lipsește: undefined (testele cu axe pică cu mesaj clar).
import {createRequire as __fffCR} from 'node:module';
const __fffAxe = () => process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return __fffCR(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return undefined; } })();
import {createRequire} from "module";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
const require = createRequire(process.env.PW_ROOT || import.meta.url);
export const {chromium} = require("playwright");
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const INDEX = path.resolve(HERE, "..", "index.html");
export const REF = JSON.parse(fs.readFileSync(path.join(HERE, "ref-c3a.json"), "utf8"));
const AXE_PATH = process.env.AXE_PATH || __fffAxe();
export const AXE = (AXE_PATH && fs.existsSync(AXE_PATH)) ? fs.readFileSync(AXE_PATH, "utf8") : null;
let fails = 0, passes = 0;
export function check(name, cond, extra) { if (cond) { passes++; console.log("  ok  " + name); } else { fails++; console.log("FAIL  " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); } }
export function summary() { console.log(`\n${passes} reușite, ${fails} eșuate`); process.exit(fails ? 1 : 0); }
/** Pornește pagina cu rețeaua blocată. opts: w,h,bypassCSP,perm,geo,clock (ISO), colorScheme, locale, geoSpy */
export async function launch({w = 1280, h = 800, bypassCSP = false, perm = [], geo, clock, colorScheme, locale = "ro-RO", geoSpy = false, timezoneId} = {}) {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined});
  const ctx = await browser.newContext({viewport: {width: w, height: h}, bypassCSP, permissions: perm, geolocation: geo, colorScheme, locale, timezoneId, acceptDownloads: true});
  await ctx.route(/^https?:/, r => r.abort());
  const page = await ctx.newPage();
  const st = {errs: [], net: []};
  page.on("pageerror", e => st.errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") st.errs.push("console:" + m.text()); });
  page.on("request", r => { if (/^https?:/.test(r.url())) st.net.push(r.url()); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", e => window.__csp.push(e.violatedDirective + " " + e.blockedURI)); });
  if (geoSpy) await page.addInitScript(() => { window.__geoCalls = 0; const g = navigator.geolocation; if (g) { const o = g.getCurrentPosition.bind(g); g.getCurrentPosition = function () { window.__geoCalls++; return o.apply(g, arguments); }; } });
  if (clock) await page.clock.install({time: new Date(clock)});
  await page.goto("file://" + INDEX);
  return {browser, ctx, page, st};
}
export async function axeRun(page) {
  if (!AXE) return null;
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({content: AXE});
  return page.evaluate(async () => { const r = await window.axe.run(document, {resultTypes: ["violations"]}); return r.violations.map(v => v.id + ":" + v.nodes.length + ":" + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join("|")); });
}
export async function hOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }

/** Comută limba interfeței (selectorul #langBtn) */
export async function setLang(page, l, sel = "#langBtn") { await page.selectOption(sel, l); await page.waitForTimeout(200); }
