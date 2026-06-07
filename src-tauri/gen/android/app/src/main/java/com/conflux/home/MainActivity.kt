package com.conflux.home

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

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
