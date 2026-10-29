// UdpBridge peer pinning on real UDP sockets (macOS; not in CI — Ubuntu has no Network.framework).
// Run: swiftc -o /tmp/udp_peer ios/App/UdpBridge.swift ios/test_udp_peer.swift && /tmp/udp_peer
import Foundation
import Network
// Two senders (drone, intruder) hit the bridge; check who gets through and where write() goes.
let port: UInt16 = 24661
let b = UdpBridge()
var got: [String] = []
let lk = NSLock()
b.onData = { d in lk.lock(); got.append(String(decoding: d, as: UTF8.self)); lk.unlock() }
b.open(port: port)
Thread.sleep(forTimeInterval: 0.5)
func sock() -> Int32 { let s = socket(AF_INET, SOCK_DGRAM, 0); var a = sockaddr_in(); a.sin_family = sa_family_t(AF_INET); a.sin_addr.s_addr = inet_addr("127.0.0.1"); _ = withUnsafePointer(to: &a) { $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(s, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } }; var tv = timeval(tv_sec: 1, tv_usec: 0); setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size)); return s }
func send(_ s: Int32, _ m: String) { var a = sockaddr_in(); a.sin_family = sa_family_t(AF_INET); a.sin_port = port.bigEndian; a.sin_addr.s_addr = inet_addr("127.0.0.1"); let d = Array(m.utf8); _ = withUnsafePointer(to: &a) { $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { sendto(s, d, d.count, 0, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } } }
func recvStr(_ s: Int32) -> String { var buf = [UInt8](repeating: 0, count: 64); let n = recv(s, &buf, 64, 0); return n > 0 ? String(decoding: buf[0..<n], as: UTF8.self) : "" }
let drone = sock(), intruder = sock()
send(drone, "d1"); Thread.sleep(forTimeInterval: 0.3)
send(intruder, "evil"); Thread.sleep(forTimeInterval: 0.3)
b.write("cmd".data(using: .utf8)!)
let droneGot = recvStr(drone), intruderGot = recvStr(intruder)
var fails = 0
func check(_ n: String, _ c: Bool) { print((c ? "  OK  " : " FAIL ") + n); if !c { fails += 1 } }
lk.lock(); let g1 = got; lk.unlock()
check("drone telemetry delivered", g1.contains("d1"))
check("intruder packet dropped while drone talks", !g1.contains("evil"))
check("command goes to the drone", droneGot == "cmd")
check("intruder gets no command", intruderGot == "")
Thread.sleep(forTimeInterval: 3.2)                       // drone silent > 3 s
send(intruder, "new"); Thread.sleep(forTimeInterval: 0.3)
b.write("cmd2".data(using: .utf8)!)
lk.lock(); let g2 = got; lk.unlock()
check("after 3 s silence a new sender takes over", g2.contains("new") && recvStr(intruder) == "cmd2")
print(fails == 0 ? "RESULT: ALL CHECKS PASSED" : "RESULT: FAILURES"); exit(fails == 0 ? 0 : 1)
