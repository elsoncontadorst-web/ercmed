import { addDoc, Bytes, collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { FiscalFileArchive } from '../types/clinicErp';

const CHUNK_SIZE = 600 * 1024;
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-140) || 'documento.xml';

export const archiveFiscalXml = async (
  managerId: string,
  importedBy: string,
  file: File,
  metadata: Partial<FiscalFileArchive>
) => {
  const data = new Uint8Array(await file.arrayBuffer());
  const chunkCount = Math.ceil(data.length / CHUNK_SIZE);
  const archiveRef = await addDoc(collection(db, 'users', managerId, 'fiscal_files'), {
    originalFileName: file.name,
    contentType: file.type || 'application/xml',
    fileSize: file.size,
    chunkCount,
    importedBy,
    importedAt: serverTimestamp(),
    ...metadata
  });
  await Promise.all(Array.from({ length: chunkCount }, (_, index) =>
    setDoc(doc(db, 'users', managerId, 'fiscal_files', archiveRef.id, 'chunks', String(index).padStart(5, '0')), {
      index,
      data: Bytes.fromUint8Array(data.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE))
    })
  ));
  return archiveRef.id;
};

export const getFiscalFileArchives = async (managerId: string): Promise<FiscalFileArchive[]> => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'fiscal_files'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as FiscalFileArchive))
    .sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
};

export const updateFiscalFileProfessional = async (
  managerId: string,
  archiveId: string,
  professional?: { id: string; name: string }
) => updateDoc(doc(db, 'users', managerId, 'fiscal_files', archiveId), {
  professionalId: professional?.id || '',
  professionalName: professional?.name || ''
});

const readArchivedFile = async (managerId: string, archiveId: string) => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'fiscal_files', archiveId, 'chunks'));
  const parts = snapshot.docs
    .map(item => ({ index: Number(item.data().index || 0), data: (item.data().data as Bytes).toUint8Array() }))
    .sort((a, b) => a.index - b.index)
    .map(item => item.data);
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});
const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const u16 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255]);
const u32 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
const join = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
};
const makeZip = (files: Array<{ name: string; data: Uint8Array }>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = join([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data]);
    localParts.push(local);
    centralParts.push(join([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local.length;
  }
  const central = join(centralParts);
  return join([...localParts, central, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)]);
};

export const downloadAllFiscalXml = async (managerId: string, clinicId?: string) => {
  const archives = (await getFiscalFileArchives(managerId)).filter(item => !clinicId || item.clinicId === clinicId);
  if (!archives.length) throw new Error('Nenhum XML arquivado foi encontrado para esta empresa.');
  const usedNames = new Map<string, number>();
  const files = await Promise.all(archives.map(async item => {
    const baseName = safeName(item.originalFileName.toLowerCase().endsWith('.xml') ? item.originalFileName : `${item.originalFileName}.xml`);
    const count = usedNames.get(baseName) || 0;
    usedNames.set(baseName, count + 1);
    return {
      name: count ? baseName.replace(/\.xml$/i, `_${count + 1}.xml`) : baseName,
      data: await readArchivedFile(managerId, item.id)
    };
  }));
  const blob = new Blob([makeZip(files)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `xml-fiscais-${new Date().toISOString().slice(0, 10)}.zip`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return files.length;
};
