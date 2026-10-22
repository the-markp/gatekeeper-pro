# Proguard rules for Gatekeeper Android
-keepattributes *Annotation*
-keepattributes JavascriptInterface

# Keep JavaScript Interface methods so WebView bridge doesn't get stripped in release builds
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.gatekeeper.app.GatekeeperNativeBridge {
    public *;
}

# Keep ML Kit text recognition
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
