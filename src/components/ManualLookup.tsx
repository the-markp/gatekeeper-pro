import React, { useState } from 'react';
import { VehicleRecord, AccessLog, GateSettings } from '../types';
import { verifyPlate } from '../utils/plateMatcher';
import { playGrantedSound, playDeniedSound, triggerHaptic, speakGateAnnouncement } from '../utils/audio';
import { VerificationCard } from './VerificationCard';
import { SignalLight } from './SignalLight';
import { Search, Delete, CheckCircle2, RotateCcw, Shield, ArrowRight } from 'lucide-react';

interface ManualLookupProps {
  vehicles: VehicleRecord[];
  settings: GateSettings;
  onNewLog: (log: AccessLog) => void;
  onQuickRegister: (plate: string) => void;
}

export const ManualLookup: React.FC<ManualLookupProps> = ({
  vehicles,
  settings,
  onNewLog,
  onQuickRegister,
}) => {
  const [plateInput, setPlateInput] = useState('');
  const [verifiedPlate, setVerifiedPlate] = useState('');
  const [record, setRecord] = useState<VehicleRecord | undefined>(undefined);
  const [status, setStatus] = useState<'IDLE' | 'GRANTED' | 'DENIED'>('IDLE');
  const [reason, setReason] = useState('');
  const [timestamp, setTimestamp] = useState('');

  // Handle Verify Plate
  const handleVerify = (inputPlate: string = plateInput) => {
    if (!inputPlate.trim()) return;

    const result = verifyPlate(inputPlate, vehicles);
    const time = new Date().toISOString();

    setVerifiedPlate(result.plateNumber);
    setRecord(result.record);
    setStatus(result.status);
    setReason(result.reason);
    setTimestamp(time);

    // Audio & Haptic feedback
    if (settings.soundEnabled) {
      if (result.status === 'GRANTED') {
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
      triggerHaptic(result.status === 'GRANTED' ? 'granted' : 'denied');
    }

    // Save log
    const newLog: AccessLog = {
      id: `manual-log-${Date.now()}`,
      timestamp: time,
      plateNumber: result.plateNumber,
      status: result.status,
      direction: settings.defaultDirection,
      gateId: settings.gateId,
      guardName: settings.guardName,
      record: result.record,
      reason: result.reason,
      manualOverride: false,
    };
    onNewLog(newLog);
  };

  // Virtual Keypad helper
  const handleKeyPress = (char: string) => {
    if (plateInput.length < 10) {
      const next = plateInput + char;
      setPlateInput(next);
    }
  };

  const handleBackspace = () => {
    setPlateInput(plateInput.slice(0, -1));
  };

  const handleClear = () => {
    setPlateInput('');
    setStatus('IDLE');
    setVerifiedPlate('');
    setRecord(undefined);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Signal Light */}
      <SignalLight status={status} reason={reason} />

      {/* Manual Input Container */}
      <div className="bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-zinc-400 font-bold uppercase text-xs tracking-wider flex items-center gap-1.5 font-mono">
            <Search className="w-4 h-4 text-cyan-400" />
            Manual License Plate Entry
          </label>
          <span className="text-[11px] text-zinc-500">For dirty or obscured plates</span>
        </div>

        {/* Big Plate Display Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify();
              }}
              placeholder="ENTER PLATE (e.g. NBA4821)"
              className="w-full bg-zinc-950 text-white font-mono font-black text-2xl sm:text-3xl tracking-widest text-center py-3.5 px-4 rounded-2xl border-2 border-zinc-700 focus:outline-none focus:border-cyan-400 uppercase shadow-inner"
            />
            {plateInput && (
              <button
                type="button"
                onClick={handleBackspace}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white"
              >
                <Delete className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={!plateInput.trim()}
            className="py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 shrink-0"
          >
            <span>Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fast Virtual Keypad for Phone Screen */}
        <div className="bg-black/40 p-2.5 rounded-2xl border border-zinc-800/80 space-y-2">
          {/* Numbers Row */}
          <div className="grid grid-cols-10 gap-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white font-mono font-bold text-sm border border-zinc-700/60 transition-colors"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Letters QWERTY Rows */}
          <div className="grid grid-cols-10 gap-1">
            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-mono font-semibold text-xs border border-zinc-700/50 transition-colors"
              >
                {char}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-9 gap-1 px-2">
            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-mono font-semibold text-xs border border-zinc-700/50 transition-colors"
              >
                {char}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-4">
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-mono font-semibold text-xs border border-zinc-700/50 transition-colors"
              >
                {char}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-1.5"
            >
              <Delete className="w-3.5 h-3.5" />
              Backspace
            </button>
          </div>
        </div>
      </div>

      {/* Verification Card */}
      <VerificationCard
        status={status}
        plateNumber={verifiedPlate}
        record={record}
        reason={reason}
        timestamp={timestamp}
        onClear={() => {
          setStatus('IDLE');
          setVerifiedPlate('');
          setRecord(undefined);
          setPlateInput('');
        }}
        onQuickRegister={onQuickRegister}
      />
    </div>
  );
};
