import { AppView, UserRole } from '../types';
import { UserPermissions } from '../types/users';

const SUPPORT_VIEWS = new Set<AppView>([
  AppView.HOW_TO_USE,
  AppView.SUPPORT_DOCUMENTATION,
  AppView.FEEDBACK,
  AppView.USER_PROFILE,
]);

const PROFESSIONAL_VIEWS = new Set<AppView>([
  AppView.DASHBOARD,
  AppView.HEALTH_DASHBOARD,
  AppView.APPOINTMENTS,
  AppView.PATIENTS,
  AppView.ATTENDANCES,
  AppView.PRODUCTION_ENTRY,
]);

const RECEPTION_VIEWS = new Set<AppView>([
  AppView.DASHBOARD,
  AppView.HEALTH_DASHBOARD,
  AppView.APPOINTMENTS,
  AppView.PATIENTS,
  AppView.BILLING_PRIVATE,
  AppView.BILLING_INSURANCE,
  AppView.BILLING_GUIDES,
  AppView.CASH_ACCOUNTS,
  AppView.COLLECTIONS,
]);

const BILLER_VIEWS = new Set<AppView>([
  AppView.DASHBOARD,
  AppView.HEALTH_DASHBOARD,
  AppView.BILLING_MANAGEMENT,
  AppView.BILLING_PRODUCTION,
  AppView.BILLING_PRIVATE,
  AppView.BILLING_INSURANCE,
  AppView.BILLING_GUIDES,
  AppView.BILLING_GLOSAS,
  AppView.BILLING_AUDIT,
  AppView.TISS_BILLING,
  AppView.REPASSE_DASHBOARD,
]);

const PROFESSIONAL_ROLES = new Set<string>([
  UserRole.HEALTH_PROFESSIONAL,
  'professional',
  'autonomous_provider',
]);

export const canAccessView = (
  view: AppView,
  role: UserRole | string | null,
  permissions: UserPermissions,
  isAdmin: boolean,
): boolean => {
  if (isAdmin) return true;
  if (SUPPORT_VIEWS.has(view)) return true;

  if (role && PROFESSIONAL_ROLES.has(role)) {
    return PROFESSIONAL_VIEWS.has(view);
  }

  if (role === 'receptionist') {
    return RECEPTION_VIEWS.has(view);
  }

  if (role === UserRole.BILLER || role === 'biller') {
    return BILLER_VIEWS.has(view);
  }

  if ([AppView.APPOINTMENTS].includes(view)) return permissions.canManageAppointments;
  if ([AppView.PATIENTS, AppView.ATTENDANCES].includes(view)) return permissions.canManagePatients;
  if ([
    AppView.ACCOUNTS_RECEIVABLE, AppView.ACCOUNTS_PAYABLE, AppView.CASH_ACCOUNTS,
    AppView.BANKS, AppView.CASH_FLOW, AppView.BANK_RECONCILIATION, AppView.COLLECTIONS,
    AppView.BILLING_MANAGEMENT, AppView.TISS_BILLING, AppView.REPASSE_DASHBOARD,
  ].includes(view)) return permissions.canManageBilling;
  if ([AppView.INVENTORY].includes(view)) return permissions.canManageInventory;
  if ([AppView.CONTRACTS, AppView.SERVICE_CATALOG].includes(view)) return permissions.canManageContracts;
  if ([AppView.USERS_MANAGEMENT].includes(view)) return permissions.canManageUsers;
  if ([AppView.CLINICS, AppView.PERMISSIONS_MANAGEMENT].includes(view)) return permissions.canManageSettings;

  return false;
};

export const getDefaultViewForRole = (
  role: UserRole | string | null,
  isAdmin: boolean,
): AppView => {
  if (isAdmin) return AppView.HEALTH_DASHBOARD;
  if (role === UserRole.BILLER || role === 'biller') return AppView.BILLING_MANAGEMENT;
  return AppView.HEALTH_DASHBOARD;
};
