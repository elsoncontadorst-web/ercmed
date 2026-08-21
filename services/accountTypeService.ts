import { httpsCallable } from 'firebase/functions';
import { getCloudFunctions } from './firebase';

export type AccountType = 'clinic' | 'accountant';
export type AccountantRegistration = { name: string; crc?: string; officeName?: string; officeCNPJ?: string; phone?: string };

export const changeOwnAccountType = async (accountType: AccountType, accountantProfile?: AccountantRegistration) => {
  const change = httpsCallable(getCloudFunctions(), 'changeOwnAccountType');
  await change({ accountType, accountantProfile });
  window.dispatchEvent(new CustomEvent('ercmed:user-profile-updated'));
};
