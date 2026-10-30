# Development / Розробка

Build, run and test Field Mission Planner from source.
For using the app, see the [README](../README.md).

## Build from source / Встановлення з коду

Requires **Python 3.11+** (desktop / browser modes).

```bash
git clone https://github.com/tecelskyyivan-alt/ardu-field-planner
cd ardu-field-planner
python3 -m venv .venv
# macOS / Linux:  source .venv/bin/activate
# Windows:        .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Leaflet and the planning engine are self-hosted (no CDN), so the app loads and plans
with no connection; the satellite map still needs internet unless you pre-cache the area.

## Run / Запуск

**Native desktop** — a Qt / QtWebEngine window:
```bash
python app_qt.py
```
The HTTP backend (`serve.py`) runs on a background thread; the UI is served at
`http://127.0.0.1:8731/`.

**Browser mode:**
```bash
python serve.py      # then open the printed http://127.0.0.1:<port>/
```

**Android / iOS** — build the native app from `android/` (Gradle, JDK 17, Android SDK)
or `ios/` (Xcode). See [THIRD_PARTY.md](../THIRD_PARTY.md). Google Play notes:
[play-release.md](play-release.md).

## Architecture / Архітектура

```
app_qt.py            # native window (PySide6 / QtWebEngine) + serve.start()
serve.py             # stdlib HTTP server (:8731) + /api/* routing
backend/
  api.py             # bridge: build_route (time / sections / anchor / calibration), export, MAVLink
  coverage.py        # boustrophedon snake, cut-outs, margin, auto-angle, areas, mission time, splits
  mission.py         # export .waypoints / .plan / geofence / .fence / .geojson
  mavlink_link.py    # live MAVLink over cable (COM) / UDP / TCP: telemetry + mission upload
  geo.py, flight_calib.py
web-stable/          # Leaflet + Leaflet.draw frontend (index.html · app.js · i18n.js · mav/*)
                     # deployed to GitHub Pages; the engine runs in the browser via Pyodide
android/  ios/       # native shells (USB-serial + MAVLink-over-WiFi bridges)
firmware/            # ELRS TX Backpack patch: MAVLink over WebSocket for phone browsers
```

## Engine features without UI

The engine supports more than the app currently exposes. Reachable by calling
`build_route` directly:

- **Split into sorties** — `split.mode` = `n_area` / `battery_time`
  (see `tests/test_split_budget.py`).
- **Spray-liquid planning** — rate (l/ha) × sprayed area → working liquid + tank refills
  (`flow_lha`, `tank_l`).

## Tests / Тести

```bash
python tests/test_core.py        # coverage / mission / geo
python tests/test_features.py    # margin, auto-angle, cut-outs, liquid, export
python tests/test_ui.py          # app.js element ids <-> index.html
python tests/test_serve.py       # HTTP layer
python tests/test_mavlink.py     # MAVLink over a fake UDP drone
python tests/test_sitl.py        # E2E against a real ArduCopter SITL (upload -> verify -> download)
```

The full CI set is in [.github/workflows/tests.yml](../.github/workflows/tests.yml).

## Mission format / Формат місії

- WP0 = HOME (field centroid, absolute frame) — the GCS overwrites it with the real home on upload.
- Take-off `MAV_CMD_NAV_TAKEOFF` (GLOBAL_RELATIVE_ALT); waypoints `MAV_CMD_NAV_WAYPOINT`;
  end `MAV_CMD_NAV_RETURN_TO_LAUNCH` (if RTL).
- Geofence: an inclusion polygon of the field + one exclusion polygon per obstacle.
