# Gatekeeper — Vehicle License Plate Scanner & Gate Access Control

**Gatekeeper** is a high-speed vehicle access control system designed for security booths, school campuses, and gated facilities. It reads incoming vehicle license plates (ALPR), checks them against an authorized database, displays registrant, classification, and student details, and triggers instant **Green (Authorized)** or **Red (Denied)** visual and auditory status indicators with complete security log tracking.

---

## Operational Architecture: Standalone vs. Connected Server

Gatekeeper supports **two flexible deployment modes**, allowing you to run completely offline on a mobile phone or connect multiple gate booths to a centralized Docker container.

### Comparison Matrix

| Feature | 100% Standalone Android App (Offline) | Connected Server / Docker Mode |
| :--- | :--- | :--- |
| **Server Connection** | **Zero server or internet required** | Connects to Docker container or Cloud URL |
| **CSV Entry Database** | Stored and parsed directly on the phone | Centralized database accessible across multiple gates |
| **Verification & Matching** | On-device instant exact and fuzzy matching | Centralized audit sync + on-device fallback |
| **Registrant & Student Info** | Displays registrant, classification, student name | Displays registrant, classification, student name |
| **Green / Red Signal Lights** | Instant visual status, audio chimes, phone vibration | Instant visual status, audio chimes, phone vibration |
| **Plate Recognition (OCR)** | **On-Device via Google ML Kit** (`play-services-mlkit-text-recognition`) | **AI Vision via Gemini 3.8 Flash** on Docker container |
| **Audit Log History** | Stored on the phone; exportable to CSV on-device | Synced across all gate booths (Gate 1, 2, 3, etc.) |
| **Network Resilience** | Immune to internet or Wi-Fi outages | Automatic failover to on-device OCR if disconnected |
| **Recommended For** | Mobile security patrols, remote gates, rural facilities | Multi-lane gated campuses, centralized security operations |

---

### 1. Mode 1: 100% Standalone On-Device Android App (Zero Server)

In this mode, Gatekeeper functions as a self-contained, fully offline security device:

* **Local Database Storage**: You upload or load your vehicle list in CSV format directly into the app. All records (including registrant names, classifications, and student names) are stored in persistent device storage.
* **On-Device Optical Recognition (OCR)**: The native Android app utilizes **Google ML Kit Text Recognition** (`com.google.android.gms:play-services-mlkit-text-recognition`). Processing runs locally on the phone's CPU/NPU with sub-100ms latency without transmitting data over the internet.
* **Instant Verification**: When a vehicle approaches, the app normalizes the plate number, matches it against the local registry, and triggers:
  * 🟢 **Green Light**: Authorized pass with dual-tone melodic chime and double haptic vibration.
  * 🔴 **Red Light**: Unauthorized or suspended vehicle with an alert buzzer and warning vibration.
  * **Registrant, Classification, and Student Details**: Clearly displayed on the screen for the guard to verify.
* **On-Device Audit Logging**: Every scan is recorded in the local log history with timestamps, entry direction, and capture thumbnails. Logs can be exported to CSV directly from the phone.

---

### 2. Mode 2: Connected Server / Docker Hybrid Mode

In this mode, Gatekeeper runs as a containerized service that bridges multiple gate booths:

* **Centralized Database**: A single CSV database is shared across all gates (e.g., Main Gate, Service Gate, North Gate).
* **Gemini 3.8 Flash Vision ALPR**: The server runs an automated ALPR pipeline (`/api/ocr-plate`) using Gemini 3.8 Flash, delivering high accuracy on heavily weathered, angled, or low-light plates.
* **Multi-Gate Synchronized Logs**: Security administrators have a real-time, consolidated audit trail of all campus vehicle movements.
* **Automatic Offline Failover**: If the Wi-Fi or server connection drops, the Android client automatically switches to on-device mode so gate operations remain uninterrupted.

---

## Quickstart & Deployment

### Option A: Running with Docker

Gatekeeper includes a multi-stage production `Dockerfile` based on `node:22-alpine` with health checking and non-root security.

```bash
# 1. Clone the repository and configure your environment (optional GEMINI_API_KEY)
cp .env.example .env

# 2. Build and launch the container
docker compose up --build -d

# 3. View container status and logs
docker compose ps
docker compose logs -f
```

The application will be accessible at `http://localhost:3000`.

---

### Option B: Building the Native Android Front-End (`/android`)

The `/android` directory contains a native Kotlin Android project with hardware acceleration, CameraX and WebRTC camera bridging, flashlight torch controls, and Google ML Kit on-device recognition.

#### Prerequisites
* Android Studio (Giraffe, Hedgehog, Iguana, Ladybug, or newer)
* Android SDK 35 (minimum supported: Android 8.0 Oreo / API 26)

#### Compiling the APK:
```bash
cd android

# Linux / macOS
chmod +x gradlew
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug
```

The generated APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Installing via ADB:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### Connecting Android to your Docker Host:
* **Android Emulator**: Uses `http://10.0.2.2:3000` (pre-configured default loopback to host).
* **Physical Android Phone**: Connect your phone to the same Wi-Fi network and enter your host computer's local IP (e.g., `http://192.168.1.50:3000`).
* **Cloud Deployment**: Enter your HTTPS Cloud Run or production URL.

---

### Option C: Instant Progressive Web App (PWA) Install

If you do not wish to compile an APK, open the Gatekeeper URL in **Google Chrome** on your Android phone:
1. Tap the browser menu (`⋮`).
2. Tap **Add to Home screen** or **Install App**.
3. Gatekeeper will install as a standalone, full-screen Android application with full camera and hardware haptic support.

---

## CSV Database Format

You can upload your vehicle entry list in CSV format before initializing gate operations or at any time.

### Supported Columns

| Column Header | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| **Plate Number** | **Yes** | Vehicle registration plate | `NBA4821` |
| **Registrant Name** | **Yes** | Registered driver, owner, or organization | `Manila School Transport Coop` |
| **Classification** | **Yes** | `School Service`, `Private`, `Employee`, or `Student` | `School Service` |
| **Student Name** | Optional | Assigned student passenger(s) or student driver | `Lucas Alcantara (G7), Maya Tan (G9)` |
| **Vehicle Model** | Optional | Make and model | `Toyota HiAce Commuter Bus` |
| **Color** | Optional | Vehicle exterior color | `School Yellow & Green` |
| **Contact Number** | Optional | Phone number of driver or registrant | `+63 917 555 0192` |
| **Status** | Optional | `Active`, `Suspended`, `Flagged`, or `Expired` | `Active` |
| **Permit Number** | Optional | Campus pass or gate badge ID | `SVC-2026-084` |
| **Notes** | Optional | Special gate instructions or route details | `Morning and afternoon pickup route #12` |

A sample template can be downloaded directly from the in-app **CSV Registry** tab.

---

## Key Access Control Features

1. **High-Speed Camera Viewfinder**: Tactical rectangular aiming reticle with alignment guides, flashlight torch toggle, and continuous auto-scan mode.
2. **Instant Verification Display**:
   * **License Plate Badge**: Formatted alphanumeric display (e.g., `NBA 4821`).
   * **Registrant Name**: Clear high-contrast text.
   * **Classification Badges**: Distinct badges for *School Service* (Yellow), *Private* (Blue), *Employee* (Purple), and *Student* (Emerald).
   * **Student Name Highlight**: Prominently highlights verified student passengers.
3. **Gate Status Lights**: Dual-lens STOP/PASS indicators with barrier control status (`▲ OPEN` vs. `▼ LOCKED`).
4. **Quick Vehicle Simulator**: 1-tap test buttons for 6 realistic vehicle scenarios (*School Van, Parent SUV, Faculty Dean, Student Driver, Suspended Speeding Violation, and Unregistered Truck*) to test green/red outputs immediately.
5. **Manual Keypad Lookup**: On-screen touch keypad and quick-search for muddy, damaged, or obscured license plates.
6. **Security Audit Log**: Complete history with timestamps, entry direction, gate ID, guard on duty, thumbnail snapshots, and 1-click CSV export.
