import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getManagerIdForUser } from './accessControlService';
import { MEDICAL_SPECIALTIES, PROFESSIONAL_ROLES } from '../utils/professionalConstants';

type RegistryKind = 'types' | 'specialties';

type RegistryPayload = {
  types: string[];
  specialties: string[];
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'erp_settings';
const SETTINGS_DOCUMENT = 'professional_registry';
const isPermissionDenied = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === 'permission-denied';

const normalizeLabel = (value: string) => value.trim();

const sortLabels = (values: string[]) =>
  Array.from(new Set(values.map(normalizeLabel).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  );

const buildDefaults = (): RegistryPayload => ({
  types: sortLabels(PROFESSIONAL_ROLES),
  specialties: sortLabels(MEDICAL_SPECIALTIES),
});

export const getProfessionalRegistry = async (targetManagerId?: string): Promise<RegistryPayload> => {
  const currentUser = auth.currentUser;
  if (!currentUser && !targetManagerId) {
    return buildDefaults();
  }

  const managerId = targetManagerId || (currentUser ? await getManagerIdForUser(currentUser.uid) : null);
  if (!managerId) return buildDefaults();

  try {
    const registryRef = doc(db, 'users', managerId, SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
    const snapshot = await getDoc(registryRef);
    const defaults = buildDefaults();

    if (!snapshot.exists()) {
      return defaults;
    }

    const data = snapshot.data() as Partial<RegistryPayload>;
    return {
      types: sortLabels([...(data.types || []), ...defaults.types]),
      specialties: sortLabels([...(data.specialties || []), ...defaults.specialties]),
    };
  } catch (error) {
    if (!isPermissionDenied(error)) {
      console.error('Erro ao carregar registro profissional compartilhado:', error);
    }
    return buildDefaults();
  }
};

export const getProfessionalTypeOptions = async (targetManagerId?: string) => {
  const registry = await getProfessionalRegistry(targetManagerId);
  return registry.types;
};

export const getSpecialtyOptions = async (targetManagerId?: string) => {
  const registry = await getProfessionalRegistry(targetManagerId);
  return registry.specialties;
};

export const ensureProfessionalRegistryValue = async (
  kind: RegistryKind,
  value: string,
  targetManagerId?: string
) => {
  const normalized = normalizeLabel(value);
  if (!normalized || normalized.toLowerCase() === 'outro') return;

  const currentUser = auth.currentUser;
  if (!currentUser && !targetManagerId) return;

  const managerId = targetManagerId || (currentUser ? await getManagerIdForUser(currentUser.uid) : null);
  if (!managerId) return;

  const registry = await getProfessionalRegistry(managerId);
  const nextPayload: RegistryPayload = {
    ...registry,
    [kind]: sortLabels([...(registry[kind] || []), normalized]),
  };

  const registryRef = doc(db, 'users', managerId, SETTINGS_COLLECTION, SETTINGS_DOCUMENT);
  await setDoc(
    registryRef,
    {
      ...nextPayload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return nextPayload[kind];
};
