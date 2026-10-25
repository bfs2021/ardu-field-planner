# FMP log collector (Google Apps Script)

Receives the app's automatic diagnostic logs without a server of our own (#12).
Each report becomes a `.txt` in the Drive folder **FMP logs** of the account that deploys it.

## Deploy (once, ~5 min)

1. Open <https://script.google.com> → **New project**, name it `FMP log collector`.
2. Replace the contents of `Code.gs` with [`Code.gs`](Code.gs) from this folder, save.
3. **Deploy → New deployment** → type **Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
4. Approve the Drive permission prompt.
5. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`) and put it in
   `REPORT_LOG_URL` in all three places — `test_collector.mjs` checks they match:
   - `web-stable/app.js`
   - `android/app/src/main/java/com/fmp/planner/LogBridge.kt`
   - `ios/App/ViewController.swift` (`LOG_URL`)

Changing `Code.gs` later: **Deploy → Manage deployments → Edit → New version** keeps the same URL.

## Limits

- At most 300 reports a day (the URL is inside a public APK, so spam is bounded); bodies over 1.5 M characters are refused.
- The raw device id is never stored, only a salted SHA-256 prefix.
