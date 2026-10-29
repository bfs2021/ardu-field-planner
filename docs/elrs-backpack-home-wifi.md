# Internet + MAVLink at the same time: ELRS backpack on a shared WiFi

**Recommended setup.** By default the ELRS TX backpack runs its own access point
(`ExpressLRS TX Backpack XXXXXX`). A device joined to it gets MAVLink but loses the internet:
no map tiles, no address search, no reports. Instead, let the backpack join a **shared WiFi
network that has internet** (backpack "Home WiFi", station mode): an LTE modem or MiFi, a field
or home router, any access point, or a phone hotspot. Every phone, tablet or laptop on that
network keeps the internet, and MAVLink arrives over the same network on UDP `14550`.

Requirements ([ExpressLRS MAVLink docs](https://www.expresslrs.org/software/mavlink/)):
ESP-based TX module, TX/RX firmware **3.5.0+**, TX Backpack **1.5.0+**.

## Setup (once)

1. Pick the network you fly with and keep its name and password fixed.
2. ExpressLRS Configurator → **TX Backpack** → fill **Home WiFi SSID / Password** with that
   network → flash.
3. On the radio: ELRS Lua → **Backpack** → **Telemetry** → **WiFi**.

## Each flight

1. Power the router / modem / access point, then the radio. The backpack joins the network.
2. Join the same network from the phone, tablet or computer running FMP. The computer may
   sit on the router's 5 GHz band; only the backpack needs 2.4 GHz.
3. **Web version on a computer only:** a browser can't receive UDP, so start the bridge
   once per session: `python3 scripts/udp_ws_bridge.py` (stdlib, no installs). On Connect,
   FMP on GitHub Pages opens a small bridge window (`127.0.0.1:14550/relay.html`) and talks
   to the drone through it, because Chrome won't let a public site reach the computer
   directly. Keep that window open; allow pop-ups for the site if Chrome blocks it.
   FMP can also be opened from the bridge itself at http://127.0.0.1:14550 (no window).
   The Android and iOS apps need no bridge.
4. FMP → **Flight** → link type **UDP**, leave the address empty (auto) → **Connect**.

FMP needs no special mode for this: the Android and iOS apps listen on every interface and
learn the backpack's address from its first packet.

## Notes

- **One network only.** The backpack stores a single Home WiFi. Use one network everywhere,
  or give every router or access point you use the same SSID and password.
- **Changing the network without reflashing:** if the backpack can't find its Home WiFi it
  falls back to its own access point; join it, open `http://10.0.0.1` and set the new network.
- **Client isolation** (often on guest networks and public access points) blocks traffic
  between devices; the backpack and FMP then can't see each other. Use a network without it.
- If FMP shows no telemetry, check on the bench first: one user report has the backpack
  not opening port 14550 ([ArduPilot forum](https://discuss.ardupilot.org/t/elrs-bidirectional-mavlink-telemetry-and-rc-control-not-working/121947)).

---

**UA коротко.** Рекомендовано: прошити в бекпак ELRS **Home WiFi** = спільну мережу з
інтернетом (LTE-модем, роутер, точка доступу, хотспот телефона), на пульті Backpack → Telemetry
→ **WiFi**. Тоді всі пристрої в цій мережі лишаються в інтернеті (карта, пошук, звіти), а
MAVLink іде тією ж мережею на UDP `14550`; у FMP — **UDP `0.0.0.0:14550`**. Мережа в бекпаку
одна: тримай одну скрізь або однаковий SSID/пароль на всіх точках. Гостьові мережі з
ізоляцією клієнтів не підходять. Змінити без перепрошивки — через точку бекпака й
`http://10.0.0.1`.
