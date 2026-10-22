export type VehicleClassification = 'School Service' | 'Private' | 'Employee' | 'Student';

export type VehicleStatus = 'Active' | 'Suspended' | 'Flagged' | 'Expired';

export interface VehicleRecord {
  id: string;
  plateNumber: string; // e.g. "NBC1284"
  registrantName: string; // e.g. "Carlos Santos"
  classification: VehicleClassification;
  studentName?: string; // e.g. "Sophia Santos (Gr. 10)" or multiple "Liam Cruz, Noah Cruz"
  vehicleModel?: string; // e.g. "Toyota HiAce (Yellow/White)"
  color?: string;
  contactNumber?: string;
  status: VehicleStatus;
  notes?: string;
  permitNumber?: string;
  expiryDate?: string;
}

export type ScanStatus = 'IDLE' | 'SCANNING' | 'GRANTED' | 'DENIED';

export interface AccessLog {
  id: string;
  timestamp: string; // ISO String
  plateNumber: string;
  status: 'GRANTED' | 'DENIED';
  direction: 'ENTRY' | 'EXIT';
  gateId: string;
  guardName: string;
  record?: VehicleRecord;
  confidence?: number;
  snapshotUrl?: string; // base64 preview thumbnail
  reason?: string; // e.g., 'Authorized Entry', 'Not Found in Registry', 'Vehicle Permit Suspended'
  manualOverride?: boolean;
}

export interface GateSettings {
  gateId: string;
  gateName: string;
  guardName: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoScanInterval: number; // in seconds (0 = manual only)
  autoResetTime: number; // in seconds for status light reset
  defaultDirection: 'ENTRY' | 'EXIT';
}
