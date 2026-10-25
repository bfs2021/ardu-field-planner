/* FMP log collector (#12) — a Google Apps Script web app, no server of our own.
 *
 * The app POSTs {device, version, platform, ua, log} as JSON; each report becomes one .txt
 * in the Drive folder FOLDER of the account that deployed the script. The raw device id is
 * never stored, only a salted hash, so reports from one phone group without naming it.
 * Deploy steps: collector/README.md.
 */
const FOLDER = "FMP logs";
const MAX_CHARS = 1500000;   // a real log is ~600 KB
const DAILY_CAP = 300;       // the URL ships inside a public APK: bound what spam can cost

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    // Bad input still answers 200 (ok:false): the app would only resend it forever.
    if (raw.length > MAX_CHARS) return reply_({ ok: false, error: "too big" });
    const p = JSON.parse(raw);
    if (typeof p.log !== "string" || !p.log) return reply_({ ok: false, error: "no log" });
    const props = PropertiesService.getScriptProperties();
    if (!takeDailySlot_(props)) return reply_({ ok: false, error: "daily cap" });
    const dev = deviceHash_(String(p.device || ""), props);
    const now = new Date();
    const name = Utilities.formatDate(now, "UTC", "yyyyMMdd-HHmmss") + "_" + tag_(p.platform) + "_" +
      tag_(p.version) + "_" + dev + ".txt";
    const head = "device: " + dev + "\nversion: " + tag_(p.version) + "\nplatform: " + tag_(p.platform) +
      "\nua: " + String(p.ua || "").slice(0, 200) + "\nreceived: " + now.toISOString() + "\n\n";
    folder_().createFile(name, head + p.log, MimeType.PLAIN_TEXT);
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function reply_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Filename-safe short field (version, platform).
function tag_(v) { return String(v || "-").replace(/[^0-9A-Za-z.\-]/g, "").slice(0, 20) || "-"; }

function takeDailySlot_(props) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const day = Utilities.formatDate(new Date(), "UTC", "yyyy-MM-dd");
    const n = props.getProperty("day") === day ? Number(props.getProperty("count") || 0) : 0;
    if (n >= DAILY_CAP) return false;
    props.setProperties({ day: day, count: String(n + 1) });
    return true;
  } finally {
    lock.releaseLock();
  }
}

function deviceHash_(device, props) {
  let salt = props.getProperty("salt");
  if (!salt) { salt = Utilities.getUuid(); props.setProperty("salt", salt); }
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + device, Utilities.Charset.UTF_8);
  return bytes.slice(0, 6).map((b) => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
