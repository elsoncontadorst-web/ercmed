import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  agency?: string;
  account?: string;
  openingBalance: number;
  active: boolean;
  clinicId?: string;
}

export interface BankStatementEntry {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  amount: number;
  matchedTransactionId?: string;
  status: 'pending' | 'matched';
  clinicId?: string;
}

interface BankingData {
  accounts: BankAccount[];
  statementEntries: BankStatementEntry[];
}

const bankingRef = (managerId: string) => doc(db, 'users', managerId, 'financial_control', 'banking');

export const getBankingData = async (managerId: string): Promise<BankingData> => {
  const snapshot = await getDoc(bankingRef(managerId));
  if (!snapshot.exists()) return { accounts: [], statementEntries: [] };
  const data = snapshot.data();
  return {
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
    statementEntries: Array.isArray(data.statementEntries) ? data.statementEntries : [],
  };
};

export const saveBankAccounts = async (managerId: string, accounts: BankAccount[], clinicId?: string | null) => {
  if (!clinicId) {
    await setDoc(bankingRef(managerId), { accounts, updatedAt: serverTimestamp() }, { merge: true });
    return;
  }
  const current = await getBankingData(managerId);
  const otherClinics = current.accounts.filter(item => item.clinicId !== clinicId);
  const scopedAccounts = accounts.map(item => ({ ...item, clinicId }));
  await setDoc(bankingRef(managerId), { accounts: [...otherClinics, ...scopedAccounts], updatedAt: serverTimestamp() }, { merge: true });
};

export const saveStatementEntries = async (managerId: string, statementEntries: BankStatementEntry[], clinicId?: string | null) => {
  if (!clinicId) {
    await setDoc(bankingRef(managerId), { statementEntries, updatedAt: serverTimestamp() }, { merge: true });
    return;
  }
  const current = await getBankingData(managerId);
  const otherClinics = current.statementEntries.filter(item => item.clinicId !== clinicId);
  const scopedEntries = statementEntries.map(item => ({ ...item, clinicId }));
  await setDoc(bankingRef(managerId), { statementEntries: [...otherClinics, ...scopedEntries], updatedAt: serverTimestamp() }, { merge: true });
};

export const parseBankCsv = (text: string, bankAccountId: string): BankStatementEntry[] => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const countSeparator = (line: string, separator: string) => {
    let count = 0;
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && line[index] === separator) count += 1;
    }
    return count;
  };
  const separator = countSeparator(lines[0], ';') >= countSeparator(lines[0], ',') ? ';' : ',';
  const parseLine = (line: string) => {
    const values: string[] = [];
    let value = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (character === separator && !quoted) {
        values.push(value.trim());
        value = '';
      } else value += character;
    }
    values.push(value.trim());
    return values;
  };
  const normalizeHeader = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const headers = parseLine(lines[0]).map(normalizeHeader);
  const findIndex = (...names: string[]) => headers.findIndex(header => names.some(name => header.includes(name)));
  const dateIndex = findIndex('data', 'date');
  const descriptionIndex = findIndex('descri', 'hist', 'memo', 'description');
  const amountIndex = findIndex('valor', 'amount');
  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) return [];

  return lines.slice(1).map((line, index) => {
    const columns = parseLine(line);
    const rawAmount = columns[amountIndex] || '0';
    const normalizedAmount = rawAmount.includes(',')
      ? rawAmount.replace(/\./g, '').replace(',', '.')
      : rawAmount;
    const rawDate = columns[dateIndex] || '';
    const dateOnly = rawDate.trim().split(/\s+/)[0];
    const dateParts = dateOnly.split(/[\/\-.]/);
    const date = dateParts[0]?.length === 4
      ? dateOnly
      : dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}` : rawDate;
    return {
      id: `stmt_${Date.now()}_${index}`,
      bankAccountId,
      date,
      description: columns[descriptionIndex] || 'Movimentação bancária',
      amount: Number(normalizedAmount) || 0,
      status: 'pending' as const,
    };
  }).filter(entry => entry.date && entry.amount !== 0);
};
