import { Clinic } from '../types/clinic';

type ClinicScopedRecord = {
  clinicId?: string;
  unitName?: string;
};

const normalizeName = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const createdAtMillis = (clinic: Clinic) => {
  const value: any = clinic.createdAt;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

/**
 * Existing tenants did not originally store an explicit "matrix" flag. The
 * first clinic created is therefore the backwards-compatible headquarters.
 */
export const getPrimaryClinic = (clinics: Clinic[]) => {
  const explicitlyPrimary = clinics.find(clinic => {
    const legacy = clinic as Clinic & Record<string, unknown>;
    return legacy.isPrimary === true || legacy.isMain === true || legacy.isHeadquarters === true ||
      legacy.type === 'matrix' || legacy.unitType === 'matrix';
  });
  if (explicitlyPrimary) return explicitlyPrimary;

  return [...clinics].sort((left, right) => {
    const byDate = createdAtMillis(left) - createdAtMillis(right);
    return byDate || left.id.localeCompare(right.id);
  })[0];
};

/**
 * Records created before clinicId existed are assigned only to the matrix.
 * If a legacy record has a unit name, that name takes precedence. This keeps
 * consolidated totals intact without leaking matrix history into a branch.
 */
export const recordMatchesClinicScope = (
  record: ClinicScopedRecord,
  selectedClinicId: string | null,
  clinics: Clinic[],
) => {
  if (!selectedClinicId) return true;
  if (record.clinicId) return record.clinicId === selectedClinicId;

  const selectedClinic = clinics.find(clinic => clinic.id === selectedClinicId);
  if (!selectedClinic) return false;

  if (record.unitName) {
    return normalizeName(record.unitName) === normalizeName(selectedClinic.name);
  }

  return getPrimaryClinic(clinics)?.id === selectedClinicId;
};
