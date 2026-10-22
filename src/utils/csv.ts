import { VehicleClassification, VehicleRecord, VehicleStatus, AccessLog } from '../types';

/**
 * Normalizes a license plate: removes whitespace, dashes, special characters, uppercase.
 * Example: "abc-1234" -> "ABC1234"
 */
export function normalizePlate(plate: string): string {
  if (!plate) return '';
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Formats a normalized plate for clear human readability.
 * E.g. "ABC1234" -> "ABC 1234"
 */
export function formatPlateDisplay(plate: string): string {
  const clean = normalizePlate(plate);
  if (clean.length > 4 && /^[A-Z]{2,4}\d{2,4}$/.test(clean)) {
    // Splits letters and numbers nicely if standard format
    const match = clean.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      return `${match[1]} ${match[2]}`;
    }
  }
  return clean || plate;
}

/**
 * Robust CSV parser that handles quotes, commas, and newlines.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Converts parsed CSV rows into VehicleRecord items.
 */
export function parseVehiclesFromCSV(csvText: string): {
  success: boolean;
  records: VehicleRecord[];
  errors: string[];
  totalRows: number;
} {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  const records: VehicleRecord[] = [];

  if (rows.length < 2) {
    return {
      success: false,
      records: [],
      errors: ['The CSV file is empty or does not have enough rows.'],
      totalRows: 0,
    };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Helper to find header index by aliases
  const findIndex = (aliases: string[]): number => {
    return rawHeaders.findIndex((h) => aliases.some((alias) => h === alias || h.includes(alias)));
  };

  const plateIdx = findIndex(['plate', 'licenseplate', 'platenumber', 'plateno']);
  const registrantIdx = findIndex(['registrant', 'registrantname', 'owner', 'name', 'registeredto', 'driver']);
  const classIdx = findIndex(['classification', 'category', 'type', 'clasification']);
  const studentIdx = findIndex(['student', 'studentname', 'students', 'passenger', 'ward']);
  const modelIdx = findIndex(['vehiclemodel', 'model', 'vehicle', 'make', 'carmodel', 'car']);
  const colorIdx = findIndex(['color', 'colour']);
  const contactIdx = findIndex(['contact', 'phone', 'mobile', 'contactnumber', 'tel']);
  const statusIdx = findIndex(['status', 'state']);
  const permitIdx = findIndex(['permit', 'permitnumber', 'passid', 'badge']);
  const notesIdx = findIndex(['notes', 'remarks', 'comment']);
  const expiryIdx = findIndex(['expiry', 'expirydate', 'validuntil', 'expiration']);

  if (plateIdx === -1 || registrantIdx === -1) {
    return {
      success: false,
      records: [],
      errors: [
        'Could not find required columns. Please ensure CSV has "Plate Number" and "Registrant Name" columns.',
      ],
      totalRows: rows.length - 1,
    };
  }

  const validClasses: VehicleClassification[] = ['School Service', 'Private', 'Employee', 'Student'];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawPlate = row[plateIdx] || '';
    const rawRegistrant = row[registrantIdx] || '';

    if (!rawPlate.trim() && !rawRegistrant.trim()) {
      continue; // Skip blank rows
    }

    const cleanPlate = normalizePlate(rawPlate);
    if (!cleanPlate) {
      errors.push(`Row ${r + 1}: Missing or invalid plate number.`);
      continue;
    }

    // Determine classification
    let rawClass = (classIdx !== -1 ? row[classIdx] : '') || '';
    let classification: VehicleClassification = 'Private';
    const cleanClass = rawClass.toLowerCase();
    if (cleanClass.includes('school') || cleanClass.includes('service') || cleanClass.includes('shuttle') || cleanClass.includes('bus')) {
      classification = 'School Service';
    } else if (cleanClass.includes('employee') || cleanClass.includes('faculty') || cleanClass.includes('staff') || cleanClass.includes('teacher')) {
      classification = 'Employee';
    } else if (cleanClass.includes('student')) {
      classification = 'Student';
    } else {
      classification = 'Private';
    }

    // Determine status
    let rawStatus = (statusIdx !== -1 ? row[statusIdx] : '') || 'Active';
    let status: VehicleStatus = 'Active';
    const cleanStatus = rawStatus.toLowerCase();
    if (cleanStatus.includes('suspend')) {
      status = 'Suspended';
    } else if (cleanStatus.includes('flag')) {
      status = 'Flagged';
    } else if (cleanStatus.includes('expir')) {
      status = 'Expired';
    }

    const record: VehicleRecord = {
      id: `veh-${Date.now()}-${r}`,
      plateNumber: cleanPlate,
      registrantName: rawRegistrant.trim() || 'Registered Vehicle',
      classification,
      studentName: studentIdx !== -1 ? row[studentIdx]?.trim() : '',
      vehicleModel: modelIdx !== -1 ? row[modelIdx]?.trim() : '',
      color: colorIdx !== -1 ? row[colorIdx]?.trim() : '',
      contactNumber: contactIdx !== -1 ? row[contactIdx]?.trim() : '',
      status,
      permitNumber: permitIdx !== -1 ? row[permitIdx]?.trim() : `PRM-${cleanPlate.slice(-4)}`,
      notes: notesIdx !== -1 ? row[notesIdx]?.trim() : '',
      expiryDate: expiryIdx !== -1 ? row[expiryIdx]?.trim() : '',
    };

    records.push(record);
  }

  return {
    success: records.length > 0,
    records,
    errors,
    totalRows: rows.length - 1,
  };
}

/**
 * Generates sample CSV template for download
 */
export function generateSampleCSV(): string {
  const headers = [
    'Plate Number',
    'Registrant Name',
    'Classification',
    'Student Name',
    'Vehicle Model',
    'Color',
    'Contact Number',
    'Status',
    'Permit Number',
    'Notes',
    'Expiry Date',
  ];

  const sampleRows = [
    [
      'NBA4821',
      'Manila School Transport Coop (Driver: Mang Ramon)',
      'School Service',
      'Lucas Alcantara (G7), Maya Tan (G9), Ethan Reyes (G5)',
      'Toyota HiAce Commuter Bus',
      'School Yellow & Green',
      '+63 917 555 0192',
      'Active',
      'SVC-2026-084',
      'Morning route pick-up and afternoon drop-off #12',
      '2026-12-31',
    ],
    [
      'SHS7712',
      'Sunshine Kidz Transit Inc.',
      'School Service',
      'Chloe Bautista (G3), Daniel Bautista (G6)',
      'Nissan NV350 Urvan',
      'Bright Yellow',
      '+63 919 772 1040',
      'Active',
      'SVC-2026-019',
      'Official accredited school service line 04',
      '2026-12-31',
    ],
    [
      'WXY9021',
      'Elena Rostova-Cruz',
      'Private',
      'Julian Cruz (Grade 11 - STEM)',
      'Honda CR-V AWD',
      'Modern Steel Gray',
      '+63 920 888 4311',
      'Active',
      'PVT-2026-302',
      'Mother / Guardian authorized carpool drop-off pass',
      '2026-12-31',
    ],
    [
      'XYZ7890',
      'Maria Victoria Legaspi',
      'Private',
      'Gabriel Legaspi (Grade 8-A)',
      'Mitsubishi Montero Sport',
      'Diamond White',
      '+63 917 222 9015',
      'Active',
      'PVT-2026-149',
      'Authorized parent guardian vehicle',
      '2026-12-31',
    ],
    [
      'ABC1234',
      'Dr. Arthur Pendelton',
      'Employee',
      'N/A (Faculty Member)',
      'Subaru Forester 2.0i',
      'Dark Forest Pearl',
      '+63 918 333 7741',
      'Active',
      'EMP-FAC-044',
      'Dean of Sciences - Reserved Faculty slot B4',
      '2027-06-30',
    ],
    [
      'EMP5501',
      'Sarah Jenkins',
      'Employee',
      'N/A (Administrative Staff)',
      'Mazda CX-5',
      'Soul Red Crystal',
      '+63 928 909 3321',
      'Active',
      'EMP-ADM-012',
      'Registrar Office Supervisor',
      '2027-05-15',
    ],
    [
      'NBT8930',
      'Karlo Mendoza',
      'Student',
      'Karlo Mendoza (Grade 12 - Senior High)',
      'Toyota Vios 1.5G',
      'Super White',
      '+63 927 444 8920',
      'Active',
      'STU-2026-118',
      'Student driver permit holder. Parking Area C.',
      '2026-11-30',
    ],
    [
      'ZXC9988',
      'Mateo De Silva',
      'Student',
      'Mateo De Silva (Grade 12 - ABM)',
      'Honda Civic RS Turbo',
      'Rallye Red',
      '+63 939 123 4567',
      'Suspended',
      'STU-2026-077',
      'PERMIT SUSPENDED: Multiple speeding violations inside campus zone',
      '2026-09-01',
    ],
  ];

  const escapeCol = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escapeCol).join(','),
    ...sampleRows.map((row) => row.map(escapeCol).join(',')),
  ];

  return lines.join('\n');
}

/**
 * Exports current vehicle database to CSV text
 */
export function exportVehiclesToCSV(vehicles: VehicleRecord[]): string {
  const headers = [
    'Plate Number',
    'Registrant Name',
    'Classification',
    'Student Name',
    'Vehicle Model',
    'Color',
    'Contact Number',
    'Status',
    'Permit Number',
    'Notes',
    'Expiry Date',
  ];

  const escapeCol = (val: string | undefined) => `"${(val || '').replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escapeCol).join(','),
    ...vehicles.map((v) =>
      [
        v.plateNumber,
        v.registrantName,
        v.classification,
        v.studentName || '',
        v.vehicleModel || '',
        v.color || '',
        v.contactNumber || '',
        v.status,
        v.permitNumber || '',
        v.notes || '',
        v.expiryDate || '',
      ]
        .map(escapeCol)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

/**
 * Exports access log history to CSV text
 */
export function exportLogsToCSV(logs: AccessLog[]): string {
  const headers = [
    'Log ID',
    'Timestamp',
    'Plate Number',
    'Access Status',
    'Direction',
    'Registrant Name',
    'Classification',
    'Student Name',
    'Vehicle Model',
    'Gate ID',
    'Guard Name',
    'Reason',
  ];

  const escapeCol = (val: string | undefined) => `"${(val || '').replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escapeCol).join(','),
    ...logs.map((log) =>
      [
        log.id,
        new Date(log.timestamp).toLocaleString(),
        log.plateNumber,
        log.status,
        log.direction,
        log.record?.registrantName || 'Unknown',
        log.record?.classification || 'N/A',
        log.record?.studentName || 'N/A',
        log.record?.vehicleModel || 'N/A',
        log.gateId,
        log.guardName,
        log.reason || '',
      ]
        .map(escapeCol)
        .join(',')
    ),
  ];

  return lines.join('\n');
}

/**
 * Triggers browser file download of CSV content
 */
export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
