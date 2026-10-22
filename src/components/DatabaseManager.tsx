import React, { useState, useRef, useMemo } from 'react';
import { VehicleRecord, VehicleClassification, VehicleStatus } from '../types';
import {
  parseVehiclesFromCSV,
  generateSampleCSV,
  exportVehiclesToCSV,
  downloadFile,
  formatPlateDisplay,
  normalizePlate,
} from '../utils/csv';
import {
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Bus,
  Car,
  Briefcase,
  GraduationCap,
  X,
  FileCheck,
} from 'lucide-react';

interface DatabaseManagerProps {
  vehicles: VehicleRecord[];
  onUpdateVehicles: (vehicles: VehicleRecord[]) => void;
  onResetDefault: () => void;
  initialOpenUpload?: boolean;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  vehicles,
  onUpdateVehicles,
  onResetDefault,
  initialOpenUpload = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<'ALL' | VehicleClassification>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VehicleStatus>('ALL');

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(initialOpenUpload);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importFeedback, setImportFeedback] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  // Edit / Add Modal State
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formPlate, setFormPlate] = useState('');
  const [formRegistrant, setFormRegistrant] = useState('');
  const [formClassification, setFormClassification] = useState<VehicleClassification>('School Service');
  const [formStudent, setFormStudent] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formStatus, setFormStatus] = useState<VehicleStatus>('Active');
  const [formPermit, setFormPermit] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Handle CSV File Selection
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const result = parseVehiclesFromCSV(text);
      if (result.success && result.records.length > 0) {
        if (importMode === 'replace') {
          onUpdateVehicles(result.records);
          setImportFeedback({
            success: true,
            message: `Successfully loaded ${result.records.length} vehicles from CSV into database (Replaced existing records).`,
            errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined,
          });
        } else {
          // Append mode: merge without duplicate plates
          const existingMap = new Map(vehicles.map((v) => [normalizePlate(v.plateNumber), v]));
          let addedCount = 0;
          let updatedCount = 0;

          result.records.forEach((rec) => {
            const clean = normalizePlate(rec.plateNumber);
            if (existingMap.has(clean)) {
              existingMap.set(clean, { ...rec, id: existingMap.get(clean)!.id });
              updatedCount++;
            } else {
              existingMap.set(clean, rec);
              addedCount++;
            }
          });

          onUpdateVehicles(Array.from(existingMap.values()));
          setImportFeedback({
            success: true,
            message: `Appended CSV: Added ${addedCount} new vehicles and updated ${updatedCount} existing records.`,
            errors: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined,
          });
        }
      } else {
        setImportFeedback({
          success: false,
          message: 'Failed to import CSV file.',
          errors: result.errors,
        });
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  // Open Edit Modal
  const openEditModal = (vehicle: VehicleRecord) => {
    setEditingVehicle(vehicle);
    setFormPlate(vehicle.plateNumber);
    setFormRegistrant(vehicle.registrantName);
    setFormClassification(vehicle.classification);
    setFormStudent(vehicle.studentName || '');
    setFormModel(vehicle.vehicleModel || '');
    setFormColor(vehicle.color || '');
    setFormContact(vehicle.contactNumber || '');
    setFormStatus(vehicle.status);
    setFormPermit(vehicle.permitNumber || '');
    setFormNotes(vehicle.notes || '');
  };

  // Open Add Modal
  const openAddModal = (defaultPlate = '') => {
    setEditingVehicle(null);
    setFormPlate(defaultPlate);
    setFormRegistrant('');
    setFormClassification('School Service');
    setFormStudent('');
    setFormModel('');
    setFormColor('');
    setFormContact('');
    setFormStatus('Active');
    setFormPermit(`PRM-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = normalizePlate(formPlate);
    if (!cleanPlate) {
      alert('Please enter a valid license plate number.');
      return;
    }
    if (!formRegistrant.trim()) {
      alert('Please enter registrant name.');
      return;
    }

    if (editingVehicle) {
      // Update
      const updated = vehicles.map((v) =>
        v.id === editingVehicle.id
          ? {
              ...v,
              plateNumber: cleanPlate,
              registrantName: formRegistrant.trim(),
              classification: formClassification,
              studentName: formStudent.trim(),
              vehicleModel: formModel.trim(),
              color: formColor.trim(),
              contactNumber: formContact.trim(),
              status: formStatus,
              permitNumber: formPermit.trim(),
              notes: formNotes.trim(),
            }
          : v
      );
      onUpdateVehicles(updated);
      setEditingVehicle(null);
    } else {
      // Create new
      const newRecord: VehicleRecord = {
        id: `veh-${Date.now()}`,
        plateNumber: cleanPlate,
        registrantName: formRegistrant.trim(),
        classification: formClassification,
        studentName: formStudent.trim(),
        vehicleModel: formModel.trim(),
        color: formColor.trim(),
        contactNumber: formContact.trim(),
        status: formStatus,
        permitNumber: formPermit.trim() || `PRM-${cleanPlate.slice(-4)}`,
        notes: formNotes.trim(),
      };
      onUpdateVehicles([newRecord, ...vehicles]);
      setIsAddModalOpen(false);
    }
  };

  // Delete
  const handleDeleteVehicle = (id: string) => {
    if (window.confirm('Remove this vehicle from the authorized gate database?')) {
      onUpdateVehicles(vehicles.filter((v) => v.id !== id));
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const csv = generateSampleCSV();
    downloadFile(csv, 'gatekeeper-sample-template.csv');
  };

  // Export current list
  const handleExportAll = () => {
    const csv = exportVehiclesToCSV(vehicles);
    downloadFile(csv, `gatekeeper-registered-vehicles-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (classFilter !== 'ALL' && v.classification !== classFilter) return false;
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = v.plateNumber.toLowerCase().includes(q);
        const matchesRegistrant = v.registrantName.toLowerCase().includes(q);
        const matchesStudent = v.studentName?.toLowerCase().includes(q);
        const matchesModel = v.vehicleModel?.toLowerCase().includes(q);
        const matchesPermit = v.permitNumber?.toLowerCase().includes(q);
        return matchesPlate || matchesRegistrant || matchesStudent || matchesModel || matchesPermit;
      }
      return true;
    });
  }, [vehicles, classFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Controls Banner */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-white font-black text-lg sm:text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Authorized Vehicles Registry
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              Upload CSV list before gate initialization or manage active vehicle permits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Upload CSV button */}
            <button
              type="button"
              onClick={() => {
                setImportFeedback(null);
                setIsImportModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </button>

            {/* Download Template button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-semibold text-xs border border-zinc-700 transition-all flex items-center gap-1.5"
              title="Download CSV Template with sample vehicles"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>CSV Template</span>
            </button>

            {/* Add Record button */}
            <button
              type="button"
              onClick={() => openAddModal()}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Vehicle</span>
            </button>

            {/* Export & Reset dropdown/buttons */}
            <button
              type="button"
              onClick={handleExportAll}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all"
              title="Export Database to CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset database to default sample campus dataset?')) {
                  onResetDefault();
                }
              }}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-all"
              title="Reset to Default Demo Database"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Badges */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plate, owner, student, vehicle model..."
              className="w-full bg-zinc-800/80 text-zinc-100 placeholder-zinc-500 text-xs rounded-xl pl-9 pr-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setClassFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                classFilter === 'ALL'
                  ? 'bg-zinc-100 text-zinc-900 font-bold'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              All ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setClassFilter('School Service')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                classFilter === 'School Service'
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-zinc-800 text-amber-400 hover:bg-zinc-700'
              }`}
            >
              <Bus className="w-3 h-3" />
              School Service
            </button>
            <button
              type="button"
              onClick={() => setClassFilter('Private')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                classFilter === 'Private'
                  ? 'bg-sky-400 text-black font-bold'
                  : 'bg-zinc-800 text-sky-400 hover:bg-zinc-700'
              }`}
            >
              <Car className="w-3 h-3" />
              Private
            </button>
            <button
              type="button"
              onClick={() => setClassFilter('Employee')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                classFilter === 'Employee'
                  ? 'bg-purple-400 text-black font-bold'
                  : 'bg-zinc-800 text-purple-400 hover:bg-zinc-700'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              Employee
            </button>
            <button
              type="button"
              onClick={() => setClassFilter('Student')}
              className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                classFilter === 'Student'
                  ? 'bg-emerald-400 text-black font-bold'
                  : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Student
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Table / Card Grid */}
      <div className="space-y-2">
        {filteredVehicles.length === 0 ? (
          <div className="bg-zinc-900 rounded-2xl p-8 text-center border border-zinc-800 space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-zinc-300 font-bold text-sm">No Matching Vehicles Found</div>
            <p className="text-zinc-500 text-xs">
              Upload a CSV file or add a vehicle to populate the gate database.
            </p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => {
            const isSuspended = vehicle.status === 'Suspended';
            const isFlagged = vehicle.status === 'Flagged';

            return (
              <div
                key={vehicle.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 bg-zinc-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isSuspended || isFlagged
                    ? 'border-rose-900/40 bg-rose-950/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Left: Plate and Main Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-white text-base tracking-wider bg-zinc-800 px-3 py-0.5 rounded-md border border-zinc-700">
                      {formatPlateDisplay(vehicle.plateNumber)}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        vehicle.classification === 'School Service'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : vehicle.classification === 'Private'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : vehicle.classification === 'Employee'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {vehicle.classification}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        vehicle.status === 'Active'
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                          : 'text-rose-400 bg-rose-950/80 border border-rose-800/80'
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  <div className="text-white font-bold text-sm sm:text-base">
                    {vehicle.registrantName}
                  </div>

                  {/* Student Name */}
                  {vehicle.studentName && vehicle.studentName !== 'N/A' && (
                    <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Student: {vehicle.studentName}</span>
                    </div>
                  )}

                  {/* Vehicle Model & Notes */}
                  <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                    {vehicle.vehicleModel && <span>{vehicle.vehicleModel}</span>}
                    {vehicle.color && <span>({vehicle.color})</span>}
                    {vehicle.permitNumber && (
                      <span className="font-mono text-zinc-500">#{vehicle.permitNumber}</span>
                    )}
                    {vehicle.notes && (
                      <span className="text-zinc-500 italic max-w-xs truncate">• {vehicle.notes}</span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openEditModal(vehicle)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs transition-colors"
                    title="Edit Record"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-700 text-xs transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-bold text-base">Upload Entry List (CSV)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-zinc-300 text-xs leading-relaxed">
              Upload your vehicle authorization database in CSV format before gate operations.
              The CSV should include <span className="text-white font-mono font-bold">Plate Number</span>,{' '}
              <span className="text-white font-mono font-bold">Registrant Name</span>,{' '}
              <span className="text-white font-mono font-bold">Classification</span>, and{' '}
              <span className="text-white font-mono font-bold">Student Name</span>.
            </p>

            {/* Mode Selector: Replace vs Append */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  importMode === 'replace'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Replace Database
              </button>
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  importMode === 'append'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Append / Merge List
              </button>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVUpload}
              accept=".csv,text/csv"
              className="hidden"
            />

            {/* Drop / Click Target */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-zinc-800/40 hover:bg-zinc-800/70 space-y-2"
            >
              <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-white font-bold text-sm">Click to Select CSV File</div>
              <div className="text-zinc-400 text-xs">Supports .csv files from Excel, Google Sheets, or campus databases</div>
            </div>

            {/* Download Sample CSV Button */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-500">Need the correct column format?</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </button>
            </div>

            {/* Feedback Message */}
            {importFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  importFeedback.success
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {importFeedback.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  {importFeedback.message}
                </div>
                {importFeedback.errors && importFeedback.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-zinc-400 text-[11px] space-y-0.5">
                    {importFeedback.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {(isAddModalOpen || editingVehicle) && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveVehicle}
            className="bg-zinc-900 border border-zinc-700 rounded-3xl p-5 max-w-lg w-full space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-white font-bold text-base">
                {editingVehicle ? 'Edit Vehicle Permit' : 'Register New Vehicle'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVehicle(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Plate Number */}
              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">
                  License Plate Number *
                </label>
                <input
                  type="text"
                  required
                  value={formPlate}
                  onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. NBA4821 or ABC-1234"
                  className="w-full bg-zinc-800 text-white font-mono font-bold text-base rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Registrant Name */}
              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">
                  Registrant Name (Owner / Driver / Staff) *
                </label>
                <input
                  type="text"
                  required
                  value={formRegistrant}
                  onChange={(e) => setFormRegistrant(e.target.value)}
                  placeholder="e.g. Manila School Transport / Elena Cruz"
                  className="w-full bg-zinc-800 text-white font-medium rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Classification */}
              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">
                  Classification *
                </label>
                <select
                  value={formClassification}
                  onChange={(e) => setFormClassification(e.target.value as VehicleClassification)}
                  className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400"
                >
                  <option value="School Service">School Service (Buses & Shuttles)</option>
                  <option value="Private">Private (Parents & Guardians)</option>
                  <option value="Employee">Employee (Faculty & Staff)</option>
                  <option value="Student">Student (Student Drivers)</option>
                </select>
              </div>

              {/* Student Name */}
              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">
                  Student Name (Passengers / Ward / Student Driver)
                </label>
                <input
                  type="text"
                  value={formStudent}
                  onChange={(e) => setFormStudent(e.target.value)}
                  placeholder="e.g. Lucas Alcantara (G7), Maya Tan (G9)"
                  className="w-full bg-zinc-800 text-emerald-300 font-medium rounded-xl px-3 py-2 border border-zinc-700 focus:outline-none focus:border-cyan-400"
                />
                <span className="text-[10px] text-zinc-500">
                  Required for gate verification of students transported.
                </span>
              </div>

              {/* Vehicle Model & Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 uppercase font-bold block mb-1">Vehicle Make / Model</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="e.g. Toyota HiAce"
                    className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 uppercase font-bold block mb-1">Vehicle Color</label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="e.g. Yellow / Silver"
                    className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
                  />
                </div>
              </div>

              {/* Status & Permit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 uppercase font-bold block mb-1">Gate Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as VehicleStatus)}
                    className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
                  >
                    <option value="Active">Active (Green Light)</option>
                    <option value="Suspended">Suspended (Red Light)</option>
                    <option value="Flagged">Flagged (Red Light)</option>
                    <option value="Expired">Expired (Red Light)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 uppercase font-bold block mb-1">Permit Number</label>
                  <input
                    type="text"
                    value={formPermit}
                    onChange={(e) => setFormPermit(e.target.value)}
                    placeholder="e.g. SVC-2026-084"
                    className="w-full bg-zinc-800 text-white font-mono rounded-xl px-3 py-2 border border-zinc-700"
                  />
                </div>
              </div>

              {/* Contact & Notes */}
              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="+63 917 123 4567"
                  className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
                />
              </div>

              <div>
                <label className="text-zinc-400 uppercase font-bold block mb-1">Security Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Gate instructions, special passes..."
                  className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 border border-zinc-700"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingVehicle(null);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
