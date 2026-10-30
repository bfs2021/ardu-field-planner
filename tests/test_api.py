import os as _root_os, sys as _root_sys  # moved from the repo root into tests/: keep the root importable
ROOT_DIR = _root_os.path.dirname(_root_os.path.dirname(_root_os.path.abspath(__file__)))
_root_sys.path.insert(0, ROOT_DIR)
"""End-to-end API + pywebview wiring smoke test (no GUI window)."""
import os

import webview
from backend.api import Api

print("webview import OK; SAVE_DIALOG =", webview.SAVE_DIALOG)

api = Api()  # window stays None -> export uses headless fallback path
res = api.build_route({
    "boundary": [
        {"lat": 50.4500, "lng": 30.5200},
        {"lat": 50.4500, "lng": 30.5240},
        {"lat": 50.4518, "lng": 30.5240},
        {"lat": 50.4518, "lng": 30.5200},
    ],
    "spacing": 25, "angle": 30, "alt": 50,
    "takeoff_alt": 10, "speed": 12, "rtl": True,
})
print("build_route ok:", res["ok"], "| count:", res["count"],
      "| len_m:", res["length_m"], "| area_ha:", res["area_ha"],
      "| dur_s:", res["duration_s"])

os.chdir(ROOT_DIR)
wp_res = api.export("waypoints")
print("export .waypoints ->", wp_res)
print("export .plan      ->", api.export("plan"))

# Show the first few lines of the generated waypoints file. Read the path back
# from the export result rather than assuming the cwd — exports moved into
# exports/ and this line had been failing silently ever since.
with open(wp_res["path"], encoding="utf-8") as f:
    head = "".join(f.readlines()[:4])
print("--- mission.waypoints (head) ---")
print(head)
