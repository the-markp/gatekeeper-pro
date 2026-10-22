import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScanStatus, VehicleRecord, AccessLog, GateSettings } from '../types';
import { recognizeLicensePlate } from '../services/ocrService';
import { verifyPlate } from '../utils/plateMatcher';
import { playGrantedSound, playDeniedSound, playShutterSound, triggerHaptic, speakGateAnnouncement } from '../utils/audio';
import { SignalLight } from './SignalLight';
import { VerificationCard } from './VerificationCard';
import {
  Camera,
  CameraOff,
  Zap,
  ZapOff,
  RefreshCw,
  Upload,
  Play,
  Square,
  Sparkles,
  Info,
  Sliders,
  ChevronRight,
  Shield,
  Volume2,
} from 'lucide-react';

interface GateScannerProps {
  vehicles: VehicleRecord[];
  settings: GateSettings;
  onNewLog: (log: AccessLog) => void;
  onQuickRegister: (plate: string) => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  vehicles,
  settings,
  onNewLog,
  onQuickRegister,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Scan state
  const [scanStatus, setScanStatus] = useState<ScanStatus>('IDLE');
  const [currentPlate, setCurrentPlate] = useState<string>('');
  const [currentRecord, setCurrentRecord] = useState<VehicleRecord | undefined>(undefined);
  const [currentReason, setCurrentReason] = useState<string>('');
  const [currentTimestamp, setCurrentTimestamp] = useState<string>('');
  const [currentConfidence, setCurrentConfidence] = useState<number | undefined>(undefined);

  // Auto-scan timer
  const [autoScanEnabled, setAutoScanEnabled] = useState<boolean>(false);
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start Camera
  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      // Check torch support
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setTorchAvailable(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to access camera. You can test using sample vehicles or upload vehicle photos.'
      );
    }
  }, [facingMode, stream]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
    setTorchOn(false);
  }, [stream]);

  // Toggle Torch on Android
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  // Flip Front/Rear Camera
  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Lifecycle for initial camera start
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, []);

  // Verification & Log Handler
  const processPlateVerification = useCallback(
    (plateText: string, confidence?: number, snapshotBase64?: string) => {
      const result = verifyPlate(plateText, vehicles);
      const isGranted = result.status === 'GRANTED';
      const timestamp = new Date().toISOString();

      setCurrentPlate(result.plateNumber);
      setCurrentRecord(result.record);
      setCurrentReason(result.reason);
      setCurrentTimestamp(timestamp);
      setCurrentConfidence(confidence);
      setScanStatus(result.status);

      // Audio & Haptic feedback
      if (settings.soundEnabled) {
        if (isGranted) {
          playGrantedSound();
          if (result.record?.registrantName) {
            speakGateAnnouncement(`Authorized: ${result.record.registrantName}`);
          }
        } else {
          playDeniedSound();
          speakGateAnnouncement('Warning: Entry denied');
        }
      }

      if (settings.vibrationEnabled) {
        triggerHaptic(isGranted ? 'granted' : 'denied');
      }

      // Record to Access Logs
      const newLog: AccessLog = {
        id: `log-${Date.now()}`,
        timestamp,
        plateNumber: result.plateNumber,
        status: result.status,
        direction: settings.defaultDirection,
        gateId: settings.gateId,
        guardName: settings.guardName,
        record: result.record,
        confidence,
        snapshotUrl: snapshotBase64,
        reason: result.reason,
      };
      onNewLog(newLog);

      // Auto-reset status after configured seconds if set
      if (settings.autoResetTime > 0) {
        setTimeout(() => {
          setScanStatus((prev) => (prev === result.status ? 'IDLE' : prev));
        }, settings.autoResetTime * 1000);
      }
    },
    [vehicles, settings, onNewLog]
  );

  // Capture current frame and send to OCR
  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanStatus === 'SCANNING') return;

    playShutterSound();
    triggerHaptic('click');
    setScanStatus('SCANNING');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Use video dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Crop or focus on central 60% reticle area for faster, sharper license plate recognition
    const cropX = canvas.width * 0.15;
    const cropY = canvas.height * 0.25;
    const cropW = canvas.width * 0.7;
    const cropH = canvas.height * 0.5;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }

    const imageBase64 = cropCanvas.toDataURL('image/jpeg', 0.85);
    const thumbnail = cropCanvas.toDataURL('image/jpeg', 0.5);

    try {
      const ocrResult = await recognizeLicensePlate(imageBase64);

      if (ocrResult.detected && ocrResult.plate) {
        processPlateVerification(ocrResult.plate, ocrResult.confidence, thumbnail);
      } else {
        // No plate recognized in frame
        setScanStatus('DENIED');
        setCurrentPlate('NO PLATE DETECTED');
        setCurrentRecord(undefined);
        setCurrentReason(ocrResult.error || 'No readable license plate recognized in camera frame. Adjust angle or lighting.');
        setCurrentTimestamp(new Date().toISOString());
        if (settings.soundEnabled) playDeniedSound();
      }
    } catch (err: any) {
      setScanStatus('DENIED');
      setCurrentPlate('SCAN ERROR');
      setCurrentRecord(undefined);
      setCurrentReason('OCR Service error. Please try again or enter plate manually.');
    }
  };

  // Continuous Auto-Scan mode
  useEffect(() => {
    if (autoScanEnabled && cameraActive) {
      autoScanTimerRef.current = setInterval(() => {
        if (scanStatus !== 'SCANNING') {
          captureAndScan();
        }
      }, (settings.autoScanInterval || 3) * 1000);
    } else {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    }

    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, [autoScanEnabled, cameraActive, scanStatus, settings.autoScanInterval]);

  // Handle uploaded vehicle image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      setScanStatus('SCANNING');
      playShutterSound();

      try {
        const ocrResult = await recognizeLicensePlate(base64);
        if (ocrResult.detected && ocrResult.plate) {
          processPlateVerification(ocrResult.plate, ocrResult.confidence, base64);
        } else {
          setScanStatus('DENIED');
          setCurrentPlate('IMAGE SCAN FAILED');
          setCurrentRecord(undefined);
          setCurrentReason(ocrResult.error || 'Could not detect a license plate in this image.');
          setCurrentTimestamp(new Date().toISOString());
        }
      } catch (err) {
        setScanStatus('DENIED');
        setCurrentPlate('ERROR');
        setCurrentReason('Failed to process image');
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Test Vehicle Simulation
  const handleSimulateVehicle = (plate: string, _description: string) => {
    // Generate a clean plate image on canvas for realistic thumbnail
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 300;
    testCanvas.height = 120;
    const ctx = testCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 300, 120);
      ctx.fillStyle = '#f8fafc';
      ctx.roundRect(10, 10, 280, 100, 8);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plate, 150, 60);
    }
    const thumbnail = testCanvas.toDataURL('image/jpeg', 0.8);
    processPlateVerification(plate, 0.99, thumbnail);
  };

  return (
    <div className="space-y-4">
      {/* Real-time Gate Signal Light */}
      <SignalLight
        status={scanStatus}
        reason={currentReason}
      />

      {/* Camera Viewfinder & HUD Container */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl aspect-[4/3] sm:aspect-video flex items-center justify-center">
        {/* Hidden internal canvas for frame processing */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <CameraOff className="w-12 h-12 text-zinc-600 mx-auto" />
            <div className="text-zinc-300 font-bold text-sm">Camera Offline</div>
            <p className="text-zinc-500 text-xs max-w-xs mx-auto">
              {cameraError || 'Allow camera permission or start the scanner to scan vehicle plates live.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => startCamera()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Start Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-all border border-zinc-700 flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* Tactical HUD Overlay for License Plate Aiming */}
        {cameraActive && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
            {/* Top HUD Bar */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-700/80 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono font-bold text-zinc-200">
                  {settings.gateName} | {settings.defaultDirection}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-all border ${
                      torchOn
                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_#f59e0b]'
                        : 'bg-black/60 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                    title="Toggle Flashlight Torch"
                  >
                    {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={flipCamera}
                  className="p-2 rounded-full bg-black/60 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 transition-all"
                  title="Flip Front/Rear Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central License Plate Target Guide / Reticle */}
            <div className="relative mx-auto w-4/5 sm:w-3/5 h-28 sm:h-36 flex items-center justify-center">
              {/* Outer Glow Box */}
              <div
                className={`absolute inset-0 border-2 rounded-xl transition-all duration-300 ${
                  scanStatus === 'GRANTED'
                    ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_#10b981]'
                    : scanStatus === 'DENIED'
                    ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_25px_#f43f5e]'
                    : scanStatus === 'SCANNING'
                    ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_#f59e0b]'
                    : 'border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                }`}
              >
                {/* 4 Tactical Corner Accents */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-white rounded-tl-sm" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-white rounded-tr-sm" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-white rounded-bl-sm" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-white rounded-br-sm" />

                {/* Laser scan line animation */}
                <div
                  className={`absolute inset-x-0 h-0.5 shadow-[0_0_8px_#06b6d4] ${
                    scanStatus === 'SCANNING'
                      ? 'bg-amber-400 animate-bounce'
                      : 'bg-cyan-400/80 animate-pulse'
                  }`}
                  style={{ top: '50%' }}
                />
              </div>

              {/* Guide Label */}
              <div className="bg-black/75 px-3 py-0.5 rounded-full border border-cyan-400/40 text-[10px] font-mono tracking-widest text-cyan-300 uppercase shadow">
                Align License Plate Inside Frame
              </div>
            </div>

            {/* Bottom Camera Action Bar */}
            <div className="flex items-center justify-between pointer-events-auto">
              {/* Auto Scan Mode Toggle */}
              <button
                type="button"
                onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                  autoScanEnabled
                    ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_#f59e0b]'
                    : 'bg-black/70 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {autoScanEnabled ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>AUTO-SCAN: {autoScanEnabled ? 'ON' : 'OFF'}</span>
              </button>

              {/* Upload image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-black/70 text-zinc-300 border border-zinc-700 hover:bg-zinc-800 p-2 rounded-full transition-all"
                title="Scan photo from device gallery"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Mobile Trigger Button (Big touch target for Android guards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={captureAndScan}
          disabled={!cameraActive || scanStatus === 'SCANNING'}
          className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg tracking-wider uppercase transition-all duration-200 shadow-xl flex items-center justify-center gap-3 ${
            scanStatus === 'SCANNING'
              ? 'bg-amber-600 text-white animate-pulse'
              : !cameraActive
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-98'
          }`}
        >
          <Camera className="w-6 h-6" />
          <span>{scanStatus === 'SCANNING' ? 'READING LICENSE PLATE...' : 'SCAN VEHICLE PLATE'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (cameraActive) {
              stopCamera();
            } else {
              startCamera();
            }
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm border border-zinc-700 transition-all flex items-center justify-center gap-2"
        >
          {cameraActive ? (
            <>
              <CameraOff className="w-4 h-4 text-rose-400" />
              <span>Pause Camera</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Turn Camera On</span>
            </>
          )}
        </button>
      </div>

      {/* Verification Card with Registrant, Classification & Student Names */}
      <VerificationCard
        status={scanStatus}
        plateNumber={currentPlate}
        record={currentRecord}
        reason={currentReason}
        timestamp={currentTimestamp}
        onClear={() => {
          setScanStatus('IDLE');
          setCurrentPlate('');
          setCurrentRecord(undefined);
          setCurrentReason('');
        }}
        onQuickRegister={onQuickRegister}
      />

      {/* Quick Test Vehicle Simulator (Essential for testing all green/red scenarios without a car) */}
      <div className="bg-zinc-900/80 rounded-2xl p-3.5 border border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Quick Test Simulator (Instant 1-Tap Trigger)
          </span>
          <span className="text-[11px] text-zinc-500">Tap to test Gatekeeper lights</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* 1. School Service */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('NBA4821', 'School Van #12')}
            className="p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-800/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-amber-300 text-xs">NBA 4821</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Expected: Green" />
            </div>
            <div className="text-[11px] font-semibold text-zinc-200 mt-1 truncate">
              School Service Van
            </div>
            <div className="text-[10px] text-zinc-400 truncate">Lucas, Maya, Ethan</div>
          </button>

          {/* 2. Private / Parent */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('WXY9021', 'Parent Honda CR-V')}
            className="p-2.5 rounded-xl bg-sky-950/30 hover:bg-sky-900/40 border border-sky-800/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sky-300 text-xs">WXY 9021</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Expected: Green" />
            </div>
            <div className="text-[11px] font-semibold text-zinc-200 mt-1 truncate">
              Private (Elena Cruz)
            </div>
            <div className="text-[10px] text-zinc-400 truncate">Julian Cruz (Gr 11)</div>
          </button>

          {/* 3. Employee */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('ABC1234', 'Faculty Forester')}
            className="p-2.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-purple-300 text-xs">ABC 1234</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Expected: Green" />
            </div>
            <div className="text-[11px] font-semibold text-zinc-200 mt-1 truncate">
              Faculty / Employee
            </div>
            <div className="text-[10px] text-zinc-400 truncate">Dr. Arthur Pendelton</div>
          </button>

          {/* 4. Student */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('NBT8930', 'Student Vios')}
            className="p-2.5 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-emerald-300 text-xs">NBT 8930</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Expected: Green" />
            </div>
            <div className="text-[11px] font-semibold text-zinc-200 mt-1 truncate">
              Student Driver
            </div>
            <div className="text-[10px] text-zinc-400 truncate">Karlo Mendoza (Gr 12)</div>
          </button>

          {/* 5. Suspended (RED LIGHT) */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('ZXC9988', 'Suspended Permit')}
            className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-rose-300 text-xs">ZXC 9988</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Expected: Red" />
            </div>
            <div className="text-[11px] font-semibold text-rose-200 mt-1 truncate">
              Suspended Permit
            </div>
            <div className="text-[10px] text-rose-400 truncate">Speeding violation</div>
          </button>

          {/* 6. Unregistered (RED LIGHT) */}
          <button
            type="button"
            onClick={() => handleSimulateVehicle('XYZ9999', 'Unregistered Van')}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-zinc-300 text-xs">XYZ 9999</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Expected: Red" />
            </div>
            <div className="text-[11px] font-semibold text-zinc-200 mt-1 truncate">
              Unregistered Vehicle
            </div>
            <div className="text-[10px] text-zinc-400 truncate">Not in entry list</div>
          </button>
        </div>
      </div>
    </div>
  );
};
