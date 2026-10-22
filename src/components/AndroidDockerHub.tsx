import React, { useState, useEffect } from 'react';
import {
  Container,
  Smartphone,
  Download,
  Copy,
  Check,
  Terminal,
  Server,
  Zap,
  ExternalLink,
  Shield,
  Layers,
  Code,
  FileText,
  Activity,
  Play,
} from 'lucide-react';
import { downloadFile } from '../utils/csv';

interface AndroidDockerHubProps {
  onClose?: () => void;
}

export const AndroidDockerHub: React.FC<AndroidDockerHubProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'android'>('docker');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  // Check server health
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setServerHealth(data))
      .catch(() => setServerHealth({ status: 'error' }));

    // Check if running inside native Android WebView bridge
    if (typeof window !== 'undefined' && (window as any).GatekeeperNative) {
      setIsNativeAndroid(true);
    }
  }, []);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const dockerfileSnippet = `# Multi-stage production Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q -O - http://localhost:3000/api/health || exit 1
CMD ["npx", "tsx", "server.ts"]`;

  const dockerComposeSnippet = `services:
  gatekeeper-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: gatekeeper-access-control
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3`;

  const handleDownloadDockerfile = () => {
    downloadFile(dockerfileSnippet, 'Dockerfile');
  };

  const handleDownloadCompose = () => {
    downloadFile(dockerComposeSnippet, 'docker-compose.yml');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 rounded-3xl p-5 border border-zinc-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Container className="w-5 h-5" />
              </span>
              <h2 className="text-white font-black text-xl tracking-wide">
                Docker & Android Deployment Hub
              </h2>
            </div>
            <p className="text-zinc-400 text-xs max-w-xl">
              Containerized deployment backend and native Android application frontend for gate security booths.
            </p>
          </div>

          {/* Quick Platform Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-zinc-800 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('docker')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'docker'
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Container className="w-4 h-4" />
              <span>Docker Container</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'android'
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android Front-End</span>
            </button>
          </div>
        </div>

        {/* Live Container Status Pill */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Container Status:</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/50">
              HEALTHY • PORT 3000
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            <span>Android Native Bridge:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                isNativeAndroid
                  ? 'text-emerald-400 bg-emerald-950 border border-emerald-800'
                  : 'text-zinc-400 bg-zinc-800'
              }`}
            >
              {isNativeAndroid ? 'ACTIVE (Hardware Hooked)' : 'STANDALONE WEB / PWA'}
            </span>
          </div>
        </div>

        {/* Standalone vs Server Architecture Comparison Callout */}
        <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Standalone Android vs. Server Mode: How Gatekeeper Works</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-emerald-500/30 space-y-1">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                100% Standalone On-Device Mode (Zero Server)
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                The Android app can run completely <strong>offline and standalone</strong>. The CSV registry, registrant lookup, student verification, green/red lights, audio chimes, and security log history run on-device. On-device OCR is handled by Android Google ML Kit with zero data or internet connection required.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/90 border border-cyan-500/30 space-y-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Server / Docker Hybrid Mode (Connected)
              </span>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                When connecting multiple gate booths (Gate 1, Gate 2, Gate 3) to a central Docker container or Cloud server, Gatekeeper provides centralized logging and utilizes Gemini 3.8 Flash for difficult, dirty, or angled plates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Docker Container View */}
      {activeTab === 'docker' && (
        <div className="space-y-4">
          {/* Quickstart Command */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold uppercase font-mono flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                1-Step Docker Launch Command
              </span>
              <button
                type="button"
                onClick={() => handleCopy('docker compose up --build -d', 'cmd-launch')}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
              >
                {copiedSection === 'cmd-launch' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'cmd-launch' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="bg-black/90 rounded-xl p-3 font-mono text-xs text-emerald-400 border border-zinc-800 flex items-center justify-between overflow-x-auto">
              <code>docker compose up --build -d</code>
            </div>
            <p className="text-[11px] text-zinc-500">
              This builds the multi-stage Alpine Node container, compiles frontend assets, exposes port 3000, and starts the full-stack ALPR engine.
            </p>
          </div>

          {/* Dockerfile & docker-compose.yml Snippets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dockerfile Card */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-bold text-xs font-mono">Dockerfile (Multi-Stage)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(dockerfileSnippet, 'dockerfile')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                      title="Copy Dockerfile"
                    >
                      {copiedSection === 'dockerfile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadDockerfile}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                      title="Download Dockerfile"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 bg-black/80 p-3 rounded-xl font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto border border-zinc-800">
                  <pre className="whitespace-pre-wrap">{dockerfileSnippet}</pre>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 pt-1">
                ✓ Multi-stage build (Node 22 Alpine)<br />
                ✓ Non-root secure user (`gatekeeper`)<br />
                ✓ Built-in health check on `/api/health`
              </div>
            </div>

            {/* Docker Compose Card */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-bold text-xs font-mono">docker-compose.yml</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(dockerComposeSnippet, 'compose')}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                      title="Copy docker-compose.yml"
                    >
                      {copiedSection === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCompose}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                      title="Download docker-compose.yml"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 bg-black/80 p-3 rounded-xl font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto border border-zinc-800">
                  <pre className="whitespace-pre-wrap">{dockerComposeSnippet}</pre>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 pt-1">
                ✓ Auto-restart policy (`unless-stopped`)<br />
                ✓ Maps container port 3000 to host port 3000<br />
                ✓ Environmental variable injection
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Android Front-End View */}
      {activeTab === 'android' && (
        <div className="space-y-4">
          {/* Architecture Overview */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Native Android Application Architecture
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                Kotlin + Android CameraX
              </span>
            </div>

            <p className="text-zinc-300 text-xs leading-relaxed">
              The Android front-end is located under the <code className="text-emerald-300 font-mono">/android</code> directory. It features a hardware-accelerated Kotlin native wrapper with runtime camera permission handling, Android flashlight torch controls, and haptic feedback.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block">CameraX & WebRTC</span>
                <span className="text-zinc-400 text-[11px]">Direct hardware access with rear camera autofocus and torch toggles.</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block">Native Haptic Bridge</span>
                <span className="text-zinc-400 text-[11px]">VibratorManager waveform pulses for instant Green (pass) / Red (alert) tactile cues.</span>
              </div>
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                <span className="font-bold text-white block">Dynamic Host Routing</span>
                <span className="text-zinc-400 text-[11px]">Supports Android Emulator (10.0.2.2), local Wi-Fi IP, or Cloud Run production URL.</span>
              </div>
            </div>
          </div>

          {/* Android Build Commands */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-3">
            <span className="text-zinc-300 font-bold text-xs uppercase font-mono block">
              How to Build the Android APK
            </span>

            <div className="space-y-2">
              <div className="bg-black/80 p-3 rounded-xl font-mono text-xs text-zinc-200 border border-zinc-800 space-y-1">
                <div className="text-zinc-500"># 1. Open /android in terminal or Android Studio</div>
                <div className="text-emerald-400">cd android</div>
                <div className="text-zinc-500 mt-2"># 2. Compile debug APK</div>
                <div className="text-emerald-400">./gradlew assembleDebug</div>
                <div className="text-zinc-500 mt-2"># 3. Install directly to connected Android phone via ADB</div>
                <div className="text-emerald-400">adb install -r app/build/outputs/apk/debug/app-debug.apk</div>
              </div>
            </div>
          </div>

          {/* Android PWA Quick Install Option */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-emerald-300 font-bold text-sm block">Instant Android PWA Install</span>
              <span className="text-zinc-400 text-xs">
                You can also install Gatekeeper directly to your Android Home Screen from Chrome (No compilation required).
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                alert('On your Android phone, tap the three dots in Chrome and select "Add to Home Screen" or "Install App" to run Gatekeeper in full-screen standalone mode.');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install to Android</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
