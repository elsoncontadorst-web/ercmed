const ACTIVE_CLINIC_KEY = 'ercmed_active_clinic_id';
const ACTIVE_CLINIC_EVENT = 'ercmed:active-clinic-changed';
export const GROUP_CLINIC_ID = '__group__';

export const isConsolidatedClinic = (clinicId?: string | null) => clinicId === GROUP_CLINIC_ID;

export const getActiveClinicScopeId = () => {
  const clinicId = getStoredActiveClinicId();
  return clinicId && !isConsolidatedClinic(clinicId) ? clinicId : null;
};

export const getStoredActiveClinicId = () => {
  try {
    return localStorage.getItem(ACTIVE_CLINIC_KEY);
  } catch {
    return null;
  }
};

export const setStoredActiveClinicId = (clinicId: string) => {
  try {
    localStorage.setItem(ACTIVE_CLINIC_KEY, clinicId);
    window.dispatchEvent(new CustomEvent(ACTIVE_CLINIC_EVENT, { detail: clinicId }));
  } catch {
    // no-op
  }
};

export const clearStoredActiveClinicId = () => {
  try {
    localStorage.removeItem(ACTIVE_CLINIC_KEY);
    window.dispatchEvent(new CustomEvent(ACTIVE_CLINIC_EVENT, { detail: null }));
  } catch {
    // no-op
  }
};

export const ACTIVE_CLINIC_CHANGED_EVENT = ACTIVE_CLINIC_EVENT;
