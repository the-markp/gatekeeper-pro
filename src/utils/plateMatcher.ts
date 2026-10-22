import { VehicleRecord } from '../types';
import { normalizePlate } from './csv';

export interface VerificationResult {
  status: 'GRANTED' | 'DENIED';
  plateNumber: string;
  record?: VehicleRecord;
  reason: string;
  isFuzzyMatch?: boolean;
}

/**
 * Common OCR character confusion replacements for secondary fallback
 */
function getPlateFingerprint(plate: string): string {
  return plate
    .replace(/[O0]/g, '#')
    .replace(/[I1L]/g, '!')
    .replace(/[B8]/g, '@')
    .replace(/[S5]/g, '$')
    .replace(/[Z2]/g, '%');
}

/**
 * Checks a scanned plate against the vehicle registry.
 */
export function verifyPlate(
  rawPlate: string,
  vehicles: VehicleRecord[]
): VerificationResult {
  const cleanPlate = normalizePlate(rawPlate);

  if (!cleanPlate) {
    return {
      status: 'DENIED',
      plateNumber: rawPlate || 'UNKNOWN',
      reason: 'No legible license plate provided',
    };
  }

  // 1. Direct exact match
  const exactMatch = vehicles.find((v) => normalizePlate(v.plateNumber) === cleanPlate);

  if (exactMatch) {
    if (exactMatch.status === 'Suspended') {
      return {
        status: 'DENIED',
        plateNumber: cleanPlate,
        record: exactMatch,
        reason: 'PERMIT SUSPENDED: Vehicle entry restricted by administration',
      };
    }
    if (exactMatch.status === 'Flagged') {
      return {
        status: 'DENIED',
        plateNumber: cleanPlate,
        record: exactMatch,
        reason: 'SECURITY ALERT: Vehicle is flagged for security inspection',
      };
    }
    if (exactMatch.status === 'Expired') {
      return {
        status: 'DENIED',
        plateNumber: cleanPlate,
        record: exactMatch,
        reason: 'PERMIT EXPIRED: Vehicle pass has expired',
      };
    }

    return {
      status: 'GRANTED',
      plateNumber: cleanPlate,
      record: exactMatch,
      reason: `Authorized: Registered under ${exactMatch.classification}`,
    };
  }

  // 2. Fuzzy match against common OCR visual confusions
  const inputFingerprint = getPlateFingerprint(cleanPlate);
  const fuzzyMatch = vehicles.find(
    (v) => getPlateFingerprint(normalizePlate(v.plateNumber)) === inputFingerprint
  );

  if (fuzzyMatch) {
    if (fuzzyMatch.status === 'Suspended') {
      return {
        status: 'DENIED',
        plateNumber: cleanPlate,
        record: fuzzyMatch,
        reason: 'PERMIT SUSPENDED (OCR corrected match)',
        isFuzzyMatch: true,
      };
    }

    return {
      status: 'GRANTED',
      plateNumber: fuzzyMatch.plateNumber, // Use official registered plate
      record: fuzzyMatch,
      reason: `Authorized (Matched ${fuzzyMatch.plateNumber}): Registered under ${fuzzyMatch.classification}`,
      isFuzzyMatch: true,
    };
  }

  // 3. Not registered -> Denied
  return {
    status: 'DENIED',
    plateNumber: cleanPlate,
    reason: 'UNREGISTERED: Vehicle not in authorized entry list',
  };
}
