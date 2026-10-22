import React from 'react';
import { GateSettings } from '../types';
import { Settings, Volume2, VolumeX, Smartphone, Clock, Shield, ArrowUpDown, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GateSettings;
  onUpdateSettings: (settings: GateSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-bold text-base">Gatekeeper Access Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Gate ID & Name */}
          <div>
            <label className="text-zinc-400 font-bold uppercase block mb-1">Gate Designation</label>
            <input
              type="text"
              value={settings.gateName}
              onChange={(e) => onUpdateSettings({ ...settings, gateName: e.target.value })}
              placeholder="e.g. Gate 1 - North Main Access"
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          {/* Guard on Duty */}
          <div>
            <label className="text-zinc-400 font-bold uppercase block mb-1">Security Guard on Duty</label>
            <input
              type="text"
              value={settings.guardName}
              onChange={(e) => onUpdateSettings({ ...settings, guardName: e.target.value })}
              placeholder="e.g. Officer Santos"
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          {/* Direction */}
          <div>
            <label className="text-zinc-400 font-bold uppercase block mb-1">Default Gate Direction</label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, defaultDirection: 'ENTRY' })}
                className={`py-2 rounded-lg font-bold transition-all ${
                  settings.defaultDirection === 'ENTRY'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Inbound (Entry)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, defaultDirection: 'EXIT' })}
                className={`py-2 rounded-lg font-bold transition-all ${
                  settings.defaultDirection === 'EXIT'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Outbound (Exit)
              </button>
            </div>
          </div>

          {/* Audio & Vibration Toggles */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-white font-semibold block">Gate Sound Effects & Voice</span>
                  <span className="text-zinc-400 text-[10px]">Play green/red sound chime and voice</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-white font-semibold block">Android Haptic Vibration</span>
                  <span className="text-zinc-400 text-[10px]">Vibrate phone on verify</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.vibrationEnabled}
                onChange={(e) => onUpdateSettings({ ...settings, vibrationEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Auto-Reset Light Timer */}
          <div>
            <label className="text-zinc-400 font-bold uppercase block mb-1">
              Status Light Auto-Reset (Seconds)
            </label>
            <select
              value={settings.autoResetTime}
              onChange={(e) => onUpdateSettings({ ...settings, autoResetTime: Number(e.target.value) })}
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
            >
              <option value={3}>3 Seconds</option>
              <option value={5}>5 Seconds (Recommended)</option>
              <option value={10}>10 Seconds</option>
              <option value={0}>Manual Reset Only (Never auto-clears)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
