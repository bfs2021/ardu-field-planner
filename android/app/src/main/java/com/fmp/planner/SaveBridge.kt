package com.fmp.planner

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.io.File

/**
 * Saves a text export (KML, .waypoints, .plan, fences, flight log, CSV) into the phone's
 * Downloads. Exposed to the WebView as `window.AndroidSave.save(name, mime, text)` ->
 * JSON {ok, where} or {ok:false, error}.
 *
 * The WebView has no Web Share API and ignores <a download> on blob: URLs, so before this
 * every export said "saved" while no file appeared anywhere (found by the 2026-10-29 sweep).
 * Android 10+: MediaStore Downloads (no storage permission; a clashing name gets " (1)").
 * Older: the app's own Downloads folder (no permission either).
 */
class SaveBridge(private val ctx: Context) {

    @JavascriptInterface
    fun save(name: String, mime: String, text: String): String = try {
        val safe = name.replace(Regex("[\\\\/:*?\"<>|]"), "_").ifBlank { "fmp-export.txt" }
        val bytes = text.toByteArray(Charsets.UTF_8)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, safe)
                put(MediaStore.Downloads.MIME_TYPE, mime.ifBlank { "text/plain" })
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val r = ctx.contentResolver
            val uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("MediaStore insert failed")
            r.openOutputStream(uri)!!.use { it.write(bytes) }
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            r.update(uri, values, null, null)
            JSONObject().put("ok", true).put("where", "Завантаження/$safe").toString()
        } else {
            val dir = ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: ctx.filesDir
            val f = File(dir, safe)
            f.writeBytes(bytes)
            JSONObject().put("ok", true).put("where", f.absolutePath).toString()
        }
    } catch (e: Exception) {
        JSONObject().put("ok", false).put("error", e.toString()).toString()
    }
}
