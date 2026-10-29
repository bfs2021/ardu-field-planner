package com.fmp.planner

/**
 * Which UDP sender is "the drone". Anyone on the WiFi could otherwise become the peer with
 * one packet: get our commands and feed fake telemetry. The first sender is kept; another
 * one takes over only after the current peer has been silent for [holdMs].
 */
class PeerLock(private val holdMs: Long = 3000) {
    private var peer: Any? = null
    private var lastMs = 0L

    /** True = accept this packet (its sender is, or now becomes, the peer); false = drop it. */
    @Synchronized fun accept(sender: Any, nowMs: Long): Boolean {
        if (peer != null && sender != peer && nowMs - lastMs < holdMs) return false
        peer = sender
        lastMs = nowMs
        return true
    }

    @Synchronized fun reset() { peer = null; lastMs = 0L }
}
