# Build the banner route with FMP's real engine (backend.api.Api.build_route) and
# write it in banner pixel coords (field-local frame, y down) to route.json.
import json, math, sys
sys.path.insert(0, sys.argv[1])
from backend.api import Api

LAT0, LNG0 = 48.381, 32.619
MPX = 20 / 12                     # banner: 20 m swath = 12 px
FW, FH = 336, 240
ISL = dict(x=54, y=-4, rx=28, ry=17)
HOLE = (ISL["x"] - ISL["rx"] - 8, ISL["x"] + ISL["rx"] + 8, ISL["y"] - ISL["ry"] - 8, ISL["y"] + ISL["ry"] + 8)
k_lat = 1 / 111320; k_lng = 1 / (111320 * math.cos(math.radians(LAT0)))

def ll(px, py):                   # px right = east, py down = south
    return {"lat": LAT0 - py * MPX * k_lat, "lng": LNG0 + px * MPX * k_lng}
def px(p):
    return [round((p["lng"] - LNG0) / k_lng / MPX, 2), round(-(p["lat"] - LAT0) / k_lat / MPX, 2)]

hx, hy = FW / 2 - 3, FH / 2 - 3
boundary = [ll(-hx, -hy), ll(hx, -hy), ll(hx, hy), ll(-hx, hy)]
x0, x1, y0, y1 = HOLE
hole = [ll(x0, y0), ll(x1, y0), ll(x1, y1), ll(x0, y1)]
mode = sys.argv[3] if len(sys.argv) > 3 else "copter"
params = {"boundary": boundary, "exclusions": [hole], "spacing": 20.0, "angle": float(sys.argv[4]) if len(sys.argv) > 4 else 0.0, "auto_angle": False,
          "margin": 0.0, "alt": 20.0, "speed": 8.0, "rtl": False, "plane_turn": mode == "plane"}
res = Api().build_route(params)
assert res.get("ok"), res
wps = res["waypoints"]
out = {"waypoints": [px(p) for p in wps], "keys": sorted(res.keys()), "count": res.get("count"),
       "flights": res.get("flights"), "first": wps[0], "plane_skipped": res.get("plane_skipped")}
json.dump(out, open(sys.argv[2], "w"))
print(len(wps), "wps; keys", out["keys"])
print("first 4", out["waypoints"][:4], "last", out["waypoints"][-2:])
