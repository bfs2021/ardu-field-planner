/* Log collector (#12): run collector/Code.gs against stubbed Apps Script services and check
 * what lands in Drive — above all what must NOT (the raw device id) — plus the spam bounds.
 * Also checks the collector URL is the same in the web app, the APK and the iOS shell.
 *
 * Run:  node test_collector.mjs
 */
import fs from "fs";
import vm from "vm";
import crypto from "crypto";

let failed = 0;
const check = (name, cond) => { console.log((cond ? "  OK  " : " FAIL ") + name); if (!cond) failed++; };

// ---- the three copies of the URL must agree
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const urls = [
  read("../web-stable/app.js").match(/const REPORT_LOG_URL = "([^"]*)"/),
  read("../android/app/src/main/java/com/fmp/planner/LogBridge.kt").match(/const val REPORT_LOG_URL = "([^"]*)"/),
  read("../ios/App/ViewController.swift").match(/static let LOG_URL = "([^"]*)"/),
].map((m) => (m ? m[1] : null));
check("collector URL found in app.js, LogBridge.kt, ViewController.swift", urls.every((u) => u !== null));
check("collector URL identical in all three", new Set(urls).size === 1);

// ---- Apps Script stubs
const files = [];
const props = new Map();
const sandbox = {
  JSON, String, Number, Math, Date, Array,
  ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ body: s, setMimeType() { return this; } }) },
  MimeType: { PLAIN_TEXT: "text/plain" },
  PropertiesService: { getScriptProperties: () => ({
    getProperty: (k) => (props.has(k) ? props.get(k) : null),
    setProperty: (k, v) => props.set(k, String(v)),
    setProperties: (o) => { for (const k in o) props.set(k, String(o[k])); },
  }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    formatDate: (d, tz, f) => (f === "yyyy-MM-dd" ? d.toISOString().slice(0, 10) : d.toISOString().replace(/\D/g, "").slice(0, 14)),
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
    computeDigest: (alg, s) => [...crypto.createHash("sha256").update(s).digest()].map((b) => (b > 127 ? b - 256 : b)),  // Java bytes are signed
  },
  DriveApp: {
    getFoldersByName: () => ({ hasNext: () => false }),
    createFolder: () => ({ createFile: (name, body) => { files.push({ name, body }); } }),
  },
};
vm.runInNewContext(read("../collector/Code.gs"), sandbox, { filename: "Code.gs" });
const post = (obj) => JSON.parse(sandbox.doPost({ postData: { contents: typeof obj === "string" ? obj : JSON.stringify(obj) } }).body);

const RAW_ID = "d7k2m9xq1abc";
const r1 = post({ device: RAW_ID, version: "2.5.86", platform: "apk", ua: "test", log: "=== лог ===\nJS ERROR boom" });
check("valid report accepted", r1.ok === true && files.length === 1);
const f = files[0] || { name: "", body: "" };
check("file holds the log", f.body.includes("JS ERROR boom"));
check("raw device id NOT in file name", !f.name.includes(RAW_ID));
check("raw device id NOT in file body", !f.body.includes(RAW_ID));
post({ device: RAW_ID, version: "2.5.86", platform: "apk", log: "x" });
post({ device: "other-device", version: "2.5.86", platform: "apk", log: "x" });
const hashOf = (file) => (file.body.match(/^device: (\w+)/) || [])[1];
check("same device -> same hash", hashOf(files[0]) && hashOf(files[0]) === hashOf(files[1]));
check("different device -> different hash", hashOf(files[0]) !== hashOf(files[2]));
check("hostile version can't escape the file name", (post({ device: "a", version: "../../x/y", platform: "apk", log: "x" }), !files.at(-1).name.includes("/")));

check("malformed JSON answered ok:false, nothing written", (() => { const n = files.length; return post("{nope").ok === false && files.length === n; })());
check("empty log refused", post({ device: "a", log: "" }).ok === false);
check("oversized body refused", post({ device: "a", log: "x".repeat(1500001) }).ok === false);

// daily cap: 300 in total today, then refused
let accepted = files.length;
while (accepted < 300 && post({ device: "spam", log: "x" }).ok) accepted++;
check("cap lets 300 through in a day", accepted === 300);
check("301st report of the day refused", post({ device: "spam", log: "x" }).ok === false && files.length === 300);
props.set("day", "2000-01-01");   // a new day resets the counter
check("next day accepted again", post({ device: "spam", log: "x" }).ok === true);

console.log("\nRESULT: " + (failed ? failed + " FAILURE(S)" : "ALL CHECKS PASSED"));
process.exit(failed ? 1 : 0);
