# Gatekeeper Android Front-End Application

This is the native Android application front-end for **Gatekeeper License Plate Gate Access Control**. It connects directly to your Dockerized Gatekeeper container backend or cloud endpoint, providing hardware camera access, low-latency ALPR plate recognition, native vibration haptics, and flashlight torch control.

---

## Architecture Overview

- **Engine**: Native Kotlin with hardware-accelerated WebView and Android CameraX & WebRTC bridging.
- **Native Bridge (`GatekeeperNativeBridge`)**: Exposes hardware vibration, camera torch control, and device preferences to the gate interface.
- **Network Compatibility**: Includes Android Network Security Config permitting `http://10.0.2.2:3000` (Android emulator loopback) or local LAN Wi-Fi IPs (`http://192.168.x.x:3000`), as well as HTTPS production URLs.

---

## Quick Build & Installation

### Option 1: Open in Android Studio
1. Open **Android Studio** (Giraffe, Hedgehog, Iguana, Ladybug or newer).
2. Click **File > Open** and select the `/android` directory.
3. Allow Gradle sync to complete.
4. Select your connected Android device or launch an Android Virtual Device (AVD).
5. Click **Run** (`Shift + F10`).

### Option 2: Build APK via Terminal / Command Line
From the `/android` directory:

```bash
# On Linux / macOS
chmod +x gradlew
./gradlew assembleDebug

# On Windows
gradlew.bat assembleDebug
```

The compiled APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

To install directly to a connected Android phone via ADB:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Connecting to your Dockerized Gatekeeper Container

1. **Running Docker on your development PC**:
   ```bash
   docker compose up --build
   ```
2. **If using Android Emulator**:
   The default server URL in the app is `http://10.0.2.2:3000`, which automatically routes to `localhost:3000` on your host machine.
3. **If using a physical Android Phone**:
   Ensure your phone is on the same Wi-Fi network as your computer, and enter your computer's local IP (e.g. `http://192.168.1.50:3000`).
4. **If using Cloud Run / Remote URL**:
   Enter the full `https://your-applet-domain.run.app` in the app's server endpoint prompt.

---

## Troubleshooting

### "Incompatible Gradle JVM version" (e.g. Java 25 selected)
Gradle 8.11 and the Android Gradle Plugin run on **Java 17** or **Java 21 LTS**. If your IDE or system defaulted to Java 25:

**In Android Studio**:
1. Go to **Settings** (or **Preferences** on macOS) `⌘ + ,` or `Ctrl + Alt + S`.
2. Navigate to: **Build, Execution, Deployment > Build Tools > Gradle**.
3. Under **Gradle JDK**, change the dropdown from Java 25 to:
   - **`Embedded JDK (version 17 or 21)`** or **`jbr-17 / jbr-21`** (bundled with Android Studio).
4. Click **Apply** > **OK**, then click **File > Sync Project with Gradle Files**.

**In Terminal / Command Line**:
Set `JAVA_HOME` to Java 17 or Java 21 before building:
* **macOS**: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
* **Linux**: `export JAVA_HOME="/usr/local/android-studio/jbr"`
* **Windows**: `set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
