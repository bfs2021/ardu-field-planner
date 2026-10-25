/* Bug report without a server (#11): boot web-stable/app.js as if served from GitHub Pages,
 * click «Надіслати поштою» / «Створити issue» and check what actually leaves the page —
 * the mailto:/issue URL, its size, and that a public issue carries no coordinates.
 * Same stubbed-DOM idea as test_boot.mjs; here the few elements under test are real objects
 * so their listeners and style can be inspected.
 *
 * Run:  node test_report.mjs
 */
import fs from "fs";
import vm from "vm";

let failed = 0;
const check = (name, cond) => { console.log((cond ? "  OK  " : " FAIL ") + name); if (!cond) failed++; };

function makeStub(name) {
  const fn = function () { return makeStub(name + "()"); };
  return new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === "toString") return () => "";
      if (p === "value" || p === "textContent" || p === "innerHTML") return "";
      if (p === "checked" || p === "disabled") return false;
      if (p === "classList") return { add() {}, remove() {}, toggle() {}, contains: () => false };
      if (p === "style") return {};
      if (p === "length") return 0;
      if (p === Symbol.iterator) return function* () {};
      return makeStub(name + "." + String(p));
    },
    set() { return true; },
    apply() { return makeStub(name + "()"); },
    construct() { return makeStub("new " + name); },
  });
}

const htmlSrc = fs.readFileSync(new URL("./web-stable/index.html", import.meta.url), "utf8");
const DECLARED_IDS = new Set([...htmlSrc.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
function realEl() {
  const listeners = {};
  return { listeners, style: {}, addEventListener(ev, f) { listeners[ev] = f; }, classList: { add() {}, remove() {}, toggle() {} } };
}
const REAL = Object.fromEntries(["report-mail", "report-issue", "sync-box"].map((id) => [id, realEl()]));

const documentStub = new Proxy({}, {
  get(t, p) {
    if (p === "getElementById") return (id) => REAL[id] || (DECLARED_IDS.has(id) ? makeStub("#" + id) : null);
    if (p === "createTreeWalker") return () => ({ nextNode: () => null, currentNode: null });
    if (p === "querySelector" || p === "querySelectorAll") return () => (p === "querySelectorAll" ? [] : null);
    if (p === "createElement") return () => makeStub("el");
    if (p === "addEventListener" || p === "removeEventListener") return () => {};
    if (p === "body" || p === "documentElement" || p === "head") return makeStub("docpart");
    if (p === "hidden") return false;
    if (p === "visibilityState") return "visible";
    return makeStub("document." + String(p));
  },
  set() { return true; },
});

let clipboard = "", opened = [];
const loc = { protocol: "https:", pathname: "/ardu-field-planner/", search: "", hash: "",
  origin: "https://tecelskyyivan-alt.github.io", hostname: "tecelskyyivan-alt.github.io", reload() {},
  _href: "https://tecelskyyivan-alt.github.io/ardu-field-planner/",
  get href() { return this._href; }, set href(v) { opened.push(String(v)); } };
const storage = new Map();
// A long previous session (with coordinates in it) so the URL cap and the scrub both have work to do.
storage.set("fmp_log", Array.from({ length: 400 }, (_, i) => "[t] подія " + i + " позиція 48.1234567,35.7654321 — довгий рядок події для перевірки ліміту").join("\n"));
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, JSON, Math, Date, Promise,
  parseFloat, parseInt, isNaN, isFinite, encodeURIComponent, decodeURIComponent, RegExp,
  Object, Array, String, Number, Boolean, Error, Map, Set, Symbol, Proxy, Reflect, Intl,
  Uint8Array, ArrayBuffer, DataView, Infinity, NaN, undefined,
  document: documentStub,
  localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k), key: () => null, length: 0 },
  // A coordinate in the user agent lands in the report header — the issue must not carry it.
  navigator: { userAgent: "test-report 50.4501234,30.5234567", language: "uk", onLine: false,
    geolocation: makeStub("geo"), clipboard: { writeText: async (s) => { clipboard = s; } } },
  location: loc,
  open: (u) => { opened.push(String(u)); },
  fetch: () => new Promise(() => {}),
  L: makeStub("L"), ClipperLib: makeStub("ClipperLib"), MAVLINK: makeStub("MAVLINK"), MAV_LINK: makeStub("MAV_LINK"),
  confirm: () => false, alert: () => {}, prompt: () => null,
  indexedDB: { open: () => makeStub("idbreq") },
  URL: Object.assign(function (u) { return { href: String(u) }; }, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }),
  Blob: function () {}, FileReader: function () { return makeStub("fr"); },
  requestAnimationFrame: (f) => setTimeout(f, 0), performance: { now: () => 0 }, screen: { width: 1000, height: 800 },
  Notification: undefined, caches: undefined,
  NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2, FILTER_SKIP: 3 },
  MutationObserver: function () { return { observe() {}, disconnect() {} }; },
  ResizeObserver: function () { return { observe() {}, disconnect() {} }; },
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
  matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  history: { replaceState() {}, pushState() {} },
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;

const src = fs.readFileSync(new URL("./web-stable/app.js", import.meta.url), "utf8");
vm.runInNewContext(src, sandbox, { filename: "app.js", timeout: 30000 });

check("sync block hidden on a static host", REAL["sync-box"].style.display === "none");

await REAL["report-mail"].listeners.click();
const mail = opened.pop() || "";
check("mail goes to the README address", mail.startsWith("mailto:teselskyy@gmail.com?subject="));
check("mail URL fits (<= 7500)", mail.length > 0 && mail.length <= 7500);
check("full log copied to the clipboard", clipboard.includes("діагностичний лог"));

await REAL["report-issue"].listeners.click();
const issue = opened.pop() || "";
const body = decodeURIComponent((issue.split("&body=")[1] || ""));
check("issue opens the repo's new-issue page", issue.startsWith("https://github.com/tecelskyyivan-alt/ardu-field-planner/issues/new?title="));
check("issue URL fits (<= 7500)", issue.length > 0 && issue.length <= 7500);
check("issue body has the report header", body.includes("версія:"));
check("issue body has no coordinates", !/\d{1,3}\.\d{4,}/.test(body) && !body.includes("50.4501234"));

console.log("\nRESULT: " + (failed ? failed + " FAILURE(S)" : "ALL CHECKS PASSED"));
process.exit(failed ? 1 : 0);
