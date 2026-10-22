import React, { useState, useEffect } from 'react';
import { VehicleRecord, AccessLog, GateSettings } from './types';
import { DEFAULT_VEHICLES } from './data/defaultVehicles';
import { GateScanner } from './components/GateScanner';
import { ManualLookup } from './components/ManualLookup';
import { AccessLogHistory } from './components/AccessLogHistory';
import { DatabaseManager } from './components/DatabaseManager';
import { SettingsModal } from './components/SettingsModal';
import { AndroidDockerHub } from './components/AndroidDockerHub';
import {
  Camera,
  Search,
  History,
  FileSpreadsheet,
  Settings,
  Shield,
  Upload,
  ArrowRightLeft,
  Smartphone,
  CheckCircle2,
  Container,
} from 'lucide-react';

type ActiveTab = 'scanner' | 'manual' | 'logs' | 'database' | 'docker';

const DEFAULT_SETTINGS: GateSettings = {
  gateId: 'GATE-01',
  gateName: 'Gate 1 - Main Campus Access',
  guardName: 'Officer Santos',
  soundEnabled: true,
  vibrationEnabled: true,
  autoScanInterval: 3,
  autoResetTime: 6,
  defaultDirection: 'ENTRY',
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quickAddPlate, setQuickAddPlate] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<GateSettings>(() => {
    try {
      const saved = localStorage.getItem('gatekeeper_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Vehicles Database State
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(() => {
    try {
      const saved = localStorage.getItem('gatekeeper_vehicles');
      return saved ? JSON.parse(saved) : DEFAULT_VEHICLES;
    } catch {
      return DEFAULT_VEHICLES;
    }
  });

  // Access Logs State
  const [logs, setLogs] = useState<AccessLog[]>(() => {
    try {
      const saved = localStorage.getItem('gatekeeper_logs');
      if (saved) return JSON.parse(saved);
      // Default initial log entry for demonstration
      return [
        {
          id: 'log-seed-1',
          timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          plateNumber: 'NBA4821',
          status: 'GRANTED',
          direction: 'ENTRY',
          gateId: 'GATE-01',
          guardName: 'Officer Santos',
          record: DEFAULT_VEHICLES[0],
          reason: 'Authorized: Registered under School Service',
        },
      ];
    } catch {
      return [];
    }
  });

  // Persist Settings
  useEffect(() => {
    try {
      localStorage.setItem('gatekeeper_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Persist Vehicles
  useEffect(() => {
    try {
      localStorage.setItem('gatekeeper_vehicles', JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  // Persist Logs
  useEffect(() => {
    try {
      localStorage.setItem('gatekeeper_logs', JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Append new access log
  const handleNewLog = (newLog: AccessLog) => {
    setLogs((prev) => [newLog, ...prev.slice(0, 499)]); // Store up to 500 recent logs
  };

  // Reset to default sample campus data
  const handleResetDefaultVehicles = () => {
    setVehicles(DEFAULT_VEHICLES);
    localStorage.setItem('gatekeeper_vehicles', JSON.stringify(DEFAULT_VEHICLES));
  };

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem('gatekeeper_logs');
  };

  // Quick Register redirect
  const handleQuickRegister = (plate: string) => {
    setQuickAddPlate(plate);
    setActiveTab('database');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-20 sm:pb-0 select-none">
      {/* Top Security Gate Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 shadow-md">
        <div className="max-w-5xl mx-auto px-3.5 py-2.5 flex items-center justify-between gap-3">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/40">
              <Shield className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-wider text-white">
                  GATEKEEPER
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded border border-emerald-500/40">
                  ALPR ACCESS
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{settings.gateName}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-zinc-500">Guard: {settings.guardName}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-1.5">
            {/* Direction In/Out Switch */}
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  defaultDirection: s.defaultDirection === 'ENTRY' ? 'EXIT' : 'ENTRY',
                }))
              }
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1 ${
                settings.defaultDirection === 'ENTRY'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-700/60'
              }`}
              title="Toggle Entry / Exit Mode"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>{settings.defaultDirection}</span>
            </button>

            {/* Quick CSV upload icon */}
            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`p-2 rounded-xl border transition-all ${
                activeTab === 'database'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Vehicle Database & CSV Upload"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {/* Docker & Android Hub Header Shortcut */}
            <button
              type="button"
              onClick={() => setActiveTab('docker')}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                activeTab === 'docker'
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-800 text-cyan-400 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Docker Container & Android App Hub"
            >
              <Container className="w-4 h-4" />
              <span className="hidden md:inline">Android & Docker</span>
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
              title="Gate Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block border-t border-zinc-800/80 bg-zinc-900/60">
          <div className="max-w-5xl mx-auto px-4 flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'scanner'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scanner (Live ALPR)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'manual'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Manual Plate Search</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'logs'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Security Access Logs ({logs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'database'
                  ? 'border-emerald-400 text-emerald-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Registry Database ({vehicles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('docker')}
              className={`py-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'docker'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Container className="w-4 h-4 text-cyan-400" />
              <span>Docker & Android</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-5">
        {activeTab === 'scanner' && (
          <GateScanner
            vehicles={vehicles}
            settings={settings}
            onNewLog={handleNewLog}
            onQuickRegister={handleQuickRegister}
          />
        )}

        {activeTab === 'manual' && (
          <ManualLookup
            vehicles={vehicles}
            settings={settings}
            onNewLog={handleNewLog}
            onQuickRegister={handleQuickRegister}
          />
        )}

        {activeTab === 'logs' && (
          <AccessLogHistory logs={logs} onClearLogs={handleClearLogs} />
        )}

        {activeTab === 'database' && (
          <DatabaseManager
            vehicles={vehicles}
            onUpdateVehicles={setVehicles}
            onResetDefault={handleResetDefaultVehicles}
            initialOpenUpload={false}
          />
        )}

        {activeTab === 'docker' && (
          <AndroidDockerHub />
        )}
      </main>

      {/* Mobile Android Fixed Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 px-1.5 py-1.5 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'scanner'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'manual'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all relative ${
              activeTab === 'logs'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Logs</span>
            {logs.length > 0 && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'database'
                ? 'text-emerald-400 font-bold bg-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">CSV List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docker')}
            className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === 'docker'
                ? 'text-cyan-400 font-bold bg-cyan-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Container className="w-4 h-4 mb-0.5 text-cyan-400" />
            <span className="text-[9px]">Android</span>
          </button>
        </div>
      </nav>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
