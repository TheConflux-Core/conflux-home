# Edge-to-Edge / Immersive Mode — Android

## Problem
App was not running on top of Android's status bar (top) and navigation bar (bottom).

## Root Cause
The old `MainActivity.kt` had several issues:
1. `enableEdgeToEdge()` called BEFORE `super.onCreate()` — window wasn't ready
2. Missing `setDecorFitsSystemWindows(window, false)` — WebView didn't extend behind bars
3. No transparent bar colors — bars appeared solid even with layout flags
4. No display cutout handling — content cut off at notch/punch-hole
5. Used deprecated `systemUiVisibility` flags instead of `WindowInsetsControllerCompat`

## Fix Applied

### `MainActivity.kt`
- Call `super.onCreate()` FIRST (creates the WebView via native code)
- `WindowCompat.setDecorFitsSystemWindows(window, false)` — lets content draw behind bars
- Set `window.statusBarColor` and `window.navigationBarColor` to `Color.TRANSPARENT`
- Set `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` for notch devices
- Use `WindowInsetsControllerCompat` to hide system bars (API 21+ compatible)
- `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` — bars auto-hide, swipe to temporarily show

### `themes.xml` (both day and night)
- `android:statusBarColor` = transparent
- `android:navigationBarColor` = transparent
- `android:fitsSystemWindows` = false
- `android:windowTranslucentStatus/Navigation` = false

## How It Works
1. **Theme** is applied first → transparent bars configured before onCreate
2. **super.onCreate()** → WryActivity creates the WebView natively
3. **setDecorFitsSystemWindows(false)** → WebView extends behind system bars
4. **Transparent colors** → system bars become see-through
5. **Hide systemBars()** → bars disappear entirely
6. **Swipe from edge** → bars temporarily reappear (transient)
7. **Cutout mode** → content extends into notch area

## Rebuild
```bash
cd src-tauri/gen/android
./gradlew assembleDebug   # debug build
# or
./gradlew assembleRelease # release build
```

## Notes
- `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` is the recommended behavior — bars auto-hide after appearing
- Alternative: `BEHAVIOR_DEFAULT` = bars stay visible once shown (less immersive)
- The WebView background is controlled by the CSS/HTML, not the Android theme
- On desktop, these Android-specific changes have no effect
