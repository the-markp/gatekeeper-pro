import React from 'react';
import { ScanStatus } from '../types';
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Radio } from 'lucide-react';

interface SignalLightProps {
  status: ScanStatus;
  reason?: string;
  className?: string;
  compact?: boolean;
}

export const SignalLight: React.FC<SignalLightProps> = ({
  status,
  reason,
  className = '',
  compact = false,
}) => {
  const isGranted = status === 'GRANTED';
  const isDenied = status === 'DENIED';
  const isScanning = status === 'SCANNING';
  const isIdle = status === 'IDLE';

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
          isGranted
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : isDenied
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            : isScanning
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        } ${className}`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isGranted
              ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping'
              : isDenied
              ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping'
              : isScanning
              ? 'bg-amber-400 animate-pulse'
              : 'bg-zinc-500'
          }`}
        />
        <span>
          {isGranted
            ? 'ENTRY GRANTED'
            : isDenied
            ? 'ENTRY DENIED'
            : isScanning
            ? 'SCANNING PLATE...'
            : 'GATE READY'}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 border ${
        isGranted
          ? 'bg-emerald-950/70 border-emerald-500/60 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
          : isDenied
          ? 'bg-rose-950/70 border-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.35)]'
          : isScanning
          ? 'bg-zinc-900/90 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          : 'bg-zinc-900/80 border-zinc-800 shadow-lg'
      } ${className}`}
    >
      {/* Top Banner Indicator */}
      <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
        {/* Dual Light Physical Housing Simulator */}
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-zinc-700/60 shadow-inner">
          {/* Red Lens */}
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                isDenied
                  ? 'bg-rose-500 border-white shadow-[0_0_25px_#f43f5e] ring-4 ring-rose-500/40 animate-pulse'
                  : 'bg-rose-950/50 border-rose-900/40 opacity-40'
              }`}
            >
              {isDenied && <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />}
            </div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 mt-0.5">STOP</span>
          </div>

          <div className="w-[1px] h-8 bg-zinc-700/50" />

          {/* Green Lens */}
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                isGranted
                  ? 'bg-emerald-500 border-white shadow-[0_0_25px_#10b981] ring-4 ring-emerald-500/40 animate-pulse'
                  : 'bg-emerald-950/50 border-emerald-900/40 opacity-40'
              }`}
            >
              {isGranted && <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />}
            </div>
            <span className="text-[9px] font-mono font-bold text-zinc-400 mt-0.5">PASS</span>
          </div>
        </div>

        {/* Status Text & Icon */}
        <div className="flex-1 text-right sm:text-left sm:pl-2">
          {isGranted && (
            <div className="flex items-center justify-end sm:justify-start gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
              <div>
                <div className="text-emerald-400 font-extrabold text-lg sm:text-xl tracking-wider leading-none">
                  GREEN LIGHT: AUTHORIZED
                </div>
                <div className="text-emerald-200/90 text-xs mt-0.5 font-medium">
                  {reason || 'Vehicle verified in authorized database'}
                </div>
              </div>
            </div>
          )}

          {isDenied && (
            <div className="flex items-center justify-end sm:justify-start gap-2">
              <XCircle className="w-6 h-6 text-rose-400 animate-pulse" />
              <div>
                <div className="text-rose-400 font-extrabold text-lg sm:text-xl tracking-wider leading-none">
                  RED LIGHT: ENTRY DENIED
                </div>
                <div className="text-rose-200/90 text-xs mt-0.5 font-medium">
                  {reason || 'Vehicle not permitted for gate entry'}
                </div>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="flex items-center justify-end sm:justify-start gap-2">
              <Radio className="w-5 h-5 text-amber-400 animate-spin" />
              <div>
                <div className="text-amber-400 font-bold text-base sm:text-lg">
                  ANALYZING PLATE...
                </div>
                <div className="text-amber-300/80 text-xs">Matching with registry</div>
              </div>
            </div>
          )}

          {isIdle && (
            <div className="flex items-center justify-end sm:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="text-zinc-300 font-bold text-sm sm:text-base">
                  GATE READY FOR VEHICLE
                </div>
                <div className="text-zinc-500 text-xs">Align plate within scanner frame</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barrier Arm Graphic Indicator */}
      <div className="px-3 pb-2.5 pt-1 border-t border-zinc-800/80 flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          BARRIER CONTROL:
        </span>
        <span
          className={`font-bold font-mono tracking-wider ${
            isGranted
              ? 'text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800'
              : isDenied
              ? 'text-rose-400 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-800'
              : 'text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded'
          }`}
        >
          {isGranted ? '▲ BARRIER RAISED (OPEN)' : isDenied ? '▼ BARRIER LOCKED (CLOSED)' : '■ STANDBY'}
        </span>
      </div>
    </div>
  );
};
