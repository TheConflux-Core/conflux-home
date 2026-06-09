package com.conflux.home

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/** Native logger — JS calls window.AndroidLog.log(tag, msg) to write to logcat.
 *  Survives release builds because it's a native call, not console.log. */
class AndroidLog {
    @JavascriptInterface
    fun log(tag: String, msg: String) {
        Log.d("ConfluxJS", "[$tag] $msg")
    }
    @JavascriptInterface
    fun error(tag: String, msg: String) {
        Log.e("ConfluxJS", "[$tag] $msg")
    }
}

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Enable Chrome DevTools remote debugging BEFORE super.onCreate() creates the WebView
    WebView.setWebContentsDebuggingEnabled(true)

    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    // Inject native logger so JS can call window.AndroidLog.log()
    // Survives release builds (console.log is stripped by bundler)
    try {
        webView.addJavascriptInterface(AndroidLog(), "AndroidLog")
        Log.d("ConfluxNative", "AndroidLog JS interface injected")
    } catch (e: Exception) {
        Log.e("ConfluxNative", "Failed to inject AndroidLog: ${e.message}")
    }
  }

    // ── Edge-to-Edge: let content draw behind system bars ──
    // This MUST come after super.onCreate() — the WebView is created there.
    WindowCompat.setDecorFitsSystemWindows(window, false)

    // Make status bar and navigation bar transparent
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT

    // Handle display cutout (notch / punch-hole) — extend into cutout area
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
    }

    // ── Immersive mode: hide status bar + navigation bar ──
    // Use the compat controller for broad API support
    val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
    windowInsetsController.apply {
      hide(WindowInsetsCompat.Type.systemBars())
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    // Keep screen on while app is active
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
}
