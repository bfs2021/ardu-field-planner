import os as _root_os, sys as _root_sys  # moved from the repo root into tests/: keep the root importable
ROOT_DIR = _root_os.path.dirname(_root_os.path.dirname(_root_os.path.abspath(__file__)))
_root_sys.path.insert(0, ROOT_DIR)
"""Round-turn OFF must put WP_RADIUS_M back (ArduCopter 4.7.0 default 2 m).
Before: turn_radius_m 0 wrote nothing, so a radius left by an earlier round-turn upload kept
rounding every corner of the next mission (ardu-gps-denied FIRST_CAL_FLIGHT В4 checks
WP_RADIUS_M == 2 after the upload). None / absent = leave it (planes have no WP_RADIUS_M).
Run: .venv/bin/python test_upload_turn_radius.py"""
import sys
sys.path.insert(0, ".")
import backend.mavlink_link as ml
from backend.api import COPTER_WP_RADIUS_DEFAULT_M, Api

failed = 0
def check(name, cond):
    global failed
    print(("  OK  " if cond else " FAIL ") + name)
    if not cond: failed += 1

class FakeLink:
    def __init__(self): self.params = []
    def status(self): return {}
    def upload_mission(self, items): return {"ok": True, "count": len(items)}
    def set_param(self, name, value):
        self.params.append((name, value)); return {"ok": True}

def upload(**params):
    ml.LINK = FakeLink()
    a = Api()
    a._state = {"home": (49.5, 24.0, 0.0), "takeoff_alt": 30.0,
                "waypoints": [(49.501, 24.0), (49.502, 24.0)], "wp_alt": 30.0,
                "rtl": True, "speed": 0}
    res = a.mav_upload_mission(dict(params, verify=False))
    return dict(ml.LINK.params), res

p, r = upload(turn_radius_m=0)
check("round-turn OFF (0) -> WP_RADIUS_M back to 2 m",
      p.get("WP_RADIUS_M") == COPTER_WP_RADIUS_DEFAULT_M == 2.0 and r.get("turn_radius_set") is True)
p, _ = upload(turn_radius_m=7.5)
check("round-turn ON -> its radius", p.get("WP_RADIUS_M") == 7.5)
for kw in ({}, {"turn_radius_m": None}):
    p, r = upload(**kw)
    check(f"{kw or 'absent'} -> radius untouched",
          "WP_RADIUS_M" not in p and "WPNAV_RADIUS" not in p and "turn_radius_set" not in r)

print("\nRESULT: " + (f"{failed} FAILURE(S)" if failed else "ALL CHECKS PASSED"))
sys.exit(1 if failed else 0)
