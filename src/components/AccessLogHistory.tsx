import React, { useState, useMemo } from 'react';
import { AccessLog } from '../types';
import { formatPlateDisplay, exportLogsToCSV, downloadFile } from '../utils/csv';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Download,
  Trash2,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Bus,
  Car,
  Briefcase,
  GraduationCap,
  Image as ImageIcon,
  Clock,
  User,
  X,
} from 'lucide-react';

interface AccessLogHistoryProps {
  logs: AccessLog[];
  onClearLogs: () => void;
}

export const AccessLogHistory: React.FC<AccessLogHistoryProps> = ({ logs, onClearLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRANTED' | 'DENIED' | 'SCHOOL_SERVICE'>('ALL');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (statusFilter === 'GRANTED' && log.status !== 'GRANTED') return false;
      if (statusFilter === 'DENIED' && log.status !== 'DENIED') return false;
      if (
        statusFilter === 'SCHOOL_SERVICE' &&
        log.record?.classification !== 'School Service'
      )
        return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = log.plateNumber.toLowerCase().includes(q);
        const matchesRegistrant = log.record?.registrantName.toLowerCase().includes(q);
        const matchesStudent = log.record?.studentName?.toLowerCase().includes(q);
        const matchesGuard = log.guardName.toLowerCase().includes(q);
        const matchesGate = log.gateId.toLowerCase().includes(q);
        const matchesReason = log.reason?.toLowerCase().includes(q);
        return (
          matchesPlate ||
          matchesRegistrant ||
          matchesStudent ||
          matchesGuard ||
          matchesGate ||
          matchesReason
        );
      }

      return true;
    });
  }, [logs, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const granted = logs.filter((l) => l.status === 'GRANTED').length;
    const denied = logs.filter((l) => l.status === 'DENIED').length;
    const schoolServices = logs.filter((l) => l.record?.classification === 'School Service').length;
    return { total, granted, denied, schoolServices };
  }, [logs]);

  const handleExportCSV = () => {
    const csvContent = exportLogsToCSV(logs);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `gatekeeper-access-logs-${dateStr}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Security Analytics Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
          <span className="text-[11px] text-zinc-400 uppercase font-mono block">Total Scans</span>
          <span className="text-xl sm:text-2xl font-black text-white block mt-0.5">{stats.total}</span>
          <span className="text-[10px] text-zinc-500">Security event log</span>
        </div>

        <div className="bg-emerald-950/30 p-3 rounded-2xl border border-emerald-800/40">
          <span className="text-[11px] text-emerald-400 uppercase font-mono block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Green (Passed)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-300 block mt-0.5">
            {stats.granted}
          </span>
          <span className="text-[10px] text-emerald-500/80">
            {stats.total > 0 ? Math.round((stats.granted / stats.total) * 100) : 0}% authorized
          </span>
        </div>

        <div className="bg-rose-950/30 p-3 rounded-2xl border border-rose-800/40">
          <span className="text-[11px] text-rose-400 uppercase font-mono block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Red (Denied)
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-300 block mt-0.5">
            {stats.denied}
          </span>
          <span className="text-[10px] text-rose-500/80">
            {stats.total > 0 ? Math.round((stats.denied / stats.total) * 100) : 0}% flagged
          </span>
        </div>

        <div className="bg-amber-950/30 p-3 rounded-2xl border border-amber-800/40">
          <span className="text-[11px] text-amber-400 uppercase font-mono block flex items-center gap-1">
            <Bus className="w-3 h-3" />
            School Vans
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-300 block mt-0.5">
            {stats.schoolServices}
          </span>
          <span className="text-[10px] text-amber-500/80">Services checked</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, registrant, student name, gate..."
              className="w-full bg-zinc-800/80 text-zinc-100 placeholder-zinc-500 text-xs rounded-xl pl-9 pr-3 py-2 border border-zinc-700/80 focus:outline-none focus:border-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons: Export CSV & Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all security access logs?')) {
                  onClearLogs();
                }
              }}
              disabled={logs.length === 0}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 disabled:opacity-40 text-xs border border-zinc-700 transition-all"
              title="Clear log history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All Events ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('GRANTED')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'GRANTED'
                ? 'bg-emerald-500 text-zinc-950 font-bold shadow-[0_0_12px_#10b981]'
                : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Green Passed ({stats.granted})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('DENIED')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'DENIED'
                ? 'bg-rose-500 text-white font-bold shadow-[0_0_12px_#f43f5e]'
                : 'bg-zinc-800 text-rose-400 hover:bg-zinc-700'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Red Denied ({stats.denied})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('SCHOOL_SERVICE')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'SCHOOL_SERVICE'
                ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_#f59e0b]'
                : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            School Services ({stats.schoolServices})
          </button>
        </div>
      </div>

      {/* Log Feed List */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-8 text-center border border-zinc-800">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <div className="text-zinc-400 font-semibold text-sm">No Security Logs Found</div>
            <p className="text-zinc-600 text-xs mt-1">
              {searchQuery
                ? 'No events match your search query.'
                : 'Scanned vehicles will be automatically logged here with timestamp and classification.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isGranted = log.status === 'GRANTED';
            const record = log.record;

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isGranted
                    ? 'bg-zinc-900/90 border-zinc-800 hover:border-emerald-500/40'
                    : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500/50'
                }`}
              >
                {/* Left: Indicator, Plate, Snapshot */}
                <div className="flex items-start sm:items-center gap-3">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isGranted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                    }`}
                  >
                    {isGranted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>

                  {/* Thumbnail if present */}
                  {log.snapshotUrl && (
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshot(log.snapshotUrl || null)}
                      className="w-12 h-9 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-black hover:opacity-80 transition-opacity"
                      title="View camera capture snapshot"
                    >
                      <img
                        src={log.snapshotUrl}
                        alt="Plate Capture"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}

                  {/* Plate & Timestamp */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-white text-base tracking-wider bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                        {formatPlateDisplay(log.plateNumber)}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          isGranted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {isGranted ? 'GREEN LIGHT' : 'RED LIGHT'}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                      <span className="font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span>•</span>
                      <span>{log.gateId}</span>
                      <span>•</span>
                      <span>Guard: {log.guardName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Registrant, Classification & Student Names */}
                <div className="w-full sm:w-auto text-left sm:text-right pl-12 sm:pl-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                  {record ? (
                    <div>
                      <div className="text-zinc-100 font-bold text-sm">
                        {record.registrantName}
                      </div>

                      <div className="flex sm:justify-end items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            record.classification === 'School Service'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : record.classification === 'Private'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : record.classification === 'Employee'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {record.classification === 'School Service' && <Bus className="w-3 h-3" />}
                          {record.classification === 'Private' && <Car className="w-3 h-3" />}
                          {record.classification === 'Employee' && <Briefcase className="w-3 h-3" />}
                          {record.classification === 'Student' && <GraduationCap className="w-3 h-3" />}
                          {record.classification}
                        </span>

                        {record.studentName && record.studentName !== 'N/A' && (
                          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 truncate max-w-xs">
                            🎓 {record.studentName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-rose-400 text-xs font-semibold">
                        {log.reason || 'Unregistered Vehicle'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 max-w-lg w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 text-sm font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Security Camera Capture Snapshot
              </span>
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black border border-zinc-800">
              <img
                src={selectedSnapshot}
                alt="Enlarged Plate"
                className="w-full max-h-96 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
