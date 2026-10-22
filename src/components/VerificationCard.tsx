import React from 'react';
import { VehicleRecord, VehicleClassification, ScanStatus } from '../types';
import { formatPlateDisplay } from '../utils/csv';
import {
  Bus,
  Car,
  Briefcase,
  GraduationCap,
  User,
  AlertTriangle,
  FileText,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  Tag,
  Shield,
} from 'lucide-react';

interface VerificationCardProps {
  status: ScanStatus;
  plateNumber: string;
  record?: VehicleRecord;
  reason?: string;
  timestamp?: string;
  onClear?: () => void;
  onQuickRegister?: (plate: string) => void;
}

export const VerificationCard: React.FC<VerificationCardProps> = ({
  status,
  plateNumber,
  record,
  reason,
  timestamp,
  onClear,
  onQuickRegister,
}) => {
  if (status === 'IDLE' && !plateNumber) {
    return null;
  }

  const isGranted = status === 'GRANTED';
  const isDenied = status === 'DENIED';

  // Classification styling helper
  const getClassificationBadge = (classification?: VehicleClassification) => {
    switch (classification) {
      case 'School Service':
        return {
          icon: <Bus className="w-4 h-4 text-amber-300" />,
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          badgeText: 'SCHOOL SERVICE',
        };
      case 'Private':
        return {
          icon: <Car className="w-4 h-4 text-sky-300" />,
          bg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
          badgeText: 'PRIVATE VEHICLE',
        };
      case 'Employee':
        return {
          icon: <Briefcase className="w-4 h-4 text-purple-300" />,
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
          badgeText: 'FACULTY / EMPLOYEE',
        };
      case 'Student':
        return {
          icon: <GraduationCap className="w-4 h-4 text-emerald-300" />,
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          badgeText: 'STUDENT DRIVER',
        };
      default:
        return {
          icon: <Shield className="w-4 h-4 text-zinc-300" />,
          bg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          badgeText: classification || 'GENERAL',
        };
    }
  };

  const classBadge = getClassificationBadge(record?.classification);

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${
        isGranted
          ? 'bg-zinc-900/95 border-emerald-500/40 ring-1 ring-emerald-500/20'
          : isDenied
          ? 'bg-zinc-900/95 border-rose-500/40 ring-1 ring-rose-500/20'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Header with Plate & Verification Badge */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          isGranted
            ? 'bg-emerald-950/40 border-emerald-800/50'
            : isDenied
            ? 'bg-rose-950/40 border-rose-800/50'
            : 'bg-zinc-800/60 border-zinc-700/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Embossed License Plate Box */}
          <div className="bg-gradient-to-b from-zinc-100 to-zinc-200 text-zinc-900 font-mono font-black text-xl tracking-wider px-3.5 py-1 rounded-md border-2 border-zinc-400 shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>{formatPlateDisplay(plateNumber || record?.plateNumber || '---')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          </div>

          {timestamp && (
            <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5">
          {isGranted ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-emerald-950 shadow-[0_0_12px_#10b981]">
              <CheckCircle className="w-3.5 h-3.5" />
              AUTHORIZED
            </span>
          ) : isDenied ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-[0_0_12px_#f43f5e]">
              <XCircle className="w-3.5 h-3.5" />
              DENIED
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 space-y-3.5">
        {record ? (
          <>
            {/* Primary Details: Registrant Name & Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-zinc-800/80">
              {/* Registrant Name */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Registrant Name
                </label>
                <div className="text-white font-bold text-lg sm:text-xl mt-0.5 leading-snug">
                  {record.registrantName}
                </div>
              </div>

              {/* Classification */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  Classification
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${classBadge.bg}`}
                  >
                    {classBadge.icon}
                    {classBadge.badgeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Name Box - Prominently Displayed */}
            <div
              className={`p-3 rounded-xl border ${
                record.studentName && record.studentName !== 'N/A'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-zinc-800/30 border-zinc-700/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  Verified Student Name
                </span>
                {record.classification === 'School Service' && (
                  <span className="text-[10px] text-amber-300 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                    Service Route Students
                  </span>
                )}
              </div>
              <div
                className={`text-base font-bold mt-1 ${
                  record.studentName && record.studentName !== 'N/A'
                    ? 'text-emerald-300'
                    : 'text-zinc-400 font-normal italic'
                }`}
              >
                {record.studentName || 'Not applicable / No student assigned'}
              </div>
            </div>

            {/* Secondary Vehicle Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Vehicle Specs</span>
                <span className="text-zinc-200 font-medium block truncate">
                  {record.vehicleModel || 'Unknown model'}
                </span>
                {record.color && <span className="text-zinc-400 text-[11px] block">{record.color}</span>}
              </div>

              <div className="bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">Permit / Badge</span>
                <span className="text-zinc-200 font-mono font-semibold block">
                  {record.permitNumber || 'N/A'}
                </span>
                <span
                  className={`text-[10px] font-bold block ${
                    record.status === 'Active'
                      ? 'text-emerald-400'
                      : record.status === 'Suspended'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  Status: {record.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Notes or Contact Info if available */}
            {(record.notes || record.contactNumber) && (
              <div className="text-xs text-zinc-400 bg-black/30 p-2.5 rounded-lg border border-zinc-800/70 flex items-start gap-2">
                <FileText className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {record.notes && <p className="text-zinc-300 text-[11px]">{record.notes}</p>}
                  {record.contactNumber && (
                    <p className="text-zinc-400 text-[11px] flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      {record.contactNumber}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Unregistered Vehicle Notice */
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300 text-sm">Vehicle Not Found In Database</p>
                <p className="text-zinc-300 mt-1">
                  License plate <span className="font-mono font-bold text-white">{plateNumber}</span> does
                  not match any registered School Service, Private, Employee, or Student permit.
                </p>
                {reason && <p className="text-zinc-400 text-[11px] mt-1 italic">{reason}</p>}
              </div>
            </div>

            {onQuickRegister && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onQuickRegister(plateNumber)}
                  className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Add to Registry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clear Action button */}
        {onClear && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-zinc-500 hover:text-zinc-300 py-1 px-3 rounded border border-transparent hover:border-zinc-800 transition-colors"
            >
              Reset Gate Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
