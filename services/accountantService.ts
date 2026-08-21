import { collection, addDoc, getDocs, updateDoc, doc, query, where, serverTimestamp, orderBy, getDoc, setDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { InvoiceRequest, InvoiceRequestFormData, AccountingDocument, DocumentType, AccountantLink } from '../types/accountant';
import { getManagerIdForUser } from './accessControlService';

const ACCOUNTANT_LINKS = 'accountant_links';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const inviteCompany = async (accountantUid: string, companyEmail: string, accountantName: string): Promise<string> => {
    const email = normalizeEmail(companyEmail);
    const existing = await getDocs(query(
        collection(db, ACCOUNTANT_LINKS),
        where('accountantUid', '==', accountantUid),
        where('companyEmail', '==', email)
    ));
    if (!existing.empty) throw new Error('Já existe um convite ou vínculo para este e-mail.');
    const created = await addDoc(collection(db, ACCOUNTANT_LINKS), {
        accountantUid,
        accountantName: accountantName.trim() || 'Contador',
        companyEmail: email,
        status: 'pending',
        createdAt: serverTimestamp()
    });
    return created.id;
};

export const watchCompanyInvites = (companyEmail: string, callback: (links: AccountantLink[]) => void): Unsubscribe => {
    const inviteQuery = query(
        collection(db, ACCOUNTANT_LINKS),
        where('companyEmail', '==', normalizeEmail(companyEmail)),
        where('status', '==', 'pending')
    );
    return onSnapshot(inviteQuery, snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AccountantLink))));
};

export const watchAccountantLinks = (accountantUid: string, status: 'pending' | 'active', callback: (links: AccountantLink[]) => void): Unsubscribe => {
    const linksQuery = query(collection(db, ACCOUNTANT_LINKS), where('accountantUid', '==', accountantUid), where('status', '==', status));
    return onSnapshot(linksQuery, snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AccountantLink))));
};

export const getAccountantLinks = async (accountantUid: string, status: 'pending' | 'active'): Promise<AccountantLink[]> => {
    const linksQuery = query(collection(db, ACCOUNTANT_LINKS), where('accountantUid', '==', accountantUid), where('status', '==', status));
    const snapshot = await getDocs(linksQuery);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AccountantLink));
};

export const acceptCompanyInvite = async (inviteId: string, companyOwnerId: string, companyName: string, companyDocument: string): Promise<void> => {
    const inviteRef = doc(db, ACCOUNTANT_LINKS, inviteId);
    const snapshot = await getDoc(inviteRef);
    if (!snapshot.exists()) throw new Error('Convite não encontrado.');
    const invite = snapshot.data();
    const stableId = `${invite.accountantUid}_${companyOwnerId}`;
    await setDoc(doc(db, ACCOUNTANT_LINKS, stableId), {
        accountantUid: invite.accountantUid,
        accountantName: invite.accountantName,
        companyOwnerId,
        companyName: companyName.trim() || 'Clínica',
        companyDocument: companyDocument.trim(),
        companyEmail: normalizeEmail(String(invite.companyEmail || '')),
        status: 'active',
        createdAt: invite.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    await deleteDoc(inviteRef);
};

export const removeAccountantLink = (linkId: string): Promise<void> => deleteDoc(doc(db, ACCOUNTANT_LINKS, linkId));

export const resendCompanyInvite = async (link: AccountantLink): Promise<string> => {
    if (!link.companyEmail) throw new Error('Convite sem e-mail da clínica.');
    await removeAccountantLink(link.id);
    return inviteCompany(link.accountantUid, link.companyEmail, link.accountantName);
};

/**
 * Create a new invoice request
 */
export const createInvoiceRequest = async (formData: InvoiceRequestFormData): Promise<string | null> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        const requestsRef = collection(db, 'users', managerId, 'invoiceRequests');

        const docRef = await addDoc(requestsRef, {
            ...formData,
            userId: user.uid,
            managerId,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return docRef.id;
    } catch (error) {
        console.error('Error creating invoice request:', error);
        return null;
    }
};

/**
 * Get all invoice requests for the current user's manager
 */
export const getInvoiceRequests = async (): Promise<InvoiceRequest[]> => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) return [];

        const requestsRef = collection(db, 'users', managerId, 'invoiceRequests');
        const q = query(requestsRef, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as InvoiceRequest));
    } catch (error) {
        console.error('Error getting invoice requests:', error);
        return [];
    }
};

/**
 * Update invoice request status (Master only)
 */
export const updateInvoiceRequestStatus = async (
    requestId: string,
    status: InvoiceRequest['status']
): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        const requestRef = doc(db, 'users', managerId, 'invoiceRequests', requestId);

        await updateDoc(requestRef, {
            status,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error updating invoice request status:', error);
        return false;
    }
};

/**
 * Upload accounting document (Master only)
 */
export const uploadAccountingDocument = async (
    file: File,
    type: DocumentType,
    contractVersion?: string
): Promise<string | null> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user is Master
        if (user.email !== 'elsoncontador.st@gmail.com') {
            throw new Error('Only Master users can upload documents');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        // Create storage path
        const fileName = contractVersion
            ? `${type}-${contractVersion}-${Date.now()}.${file.name.split('.').pop()}`
            : `${type}-${Date.now()}.${file.name.split('.').pop()}`;

        const storagePath = `accountingDocuments/${managerId}/${type}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        // Upload file
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);

        // Save metadata to Firestore
        const documentsRef = collection(db, 'users', managerId, 'accountingDocuments');
        const docRef = await addDoc(documentsRef, {
            type,
            fileName: file.name,
            fileUrl,
            uploadedBy: user.uid,
            uploadedAt: serverTimestamp(),
            ...(contractVersion && { contractVersion })
        });

        return docRef.id;
    } catch (error) {
        console.error('Error uploading document:', error);
        return null;
    }
};

/**
 * Get all accounting documents for the current user's manager
 */
export const getAccountingDocuments = async (): Promise<AccountingDocument[]> => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) return [];

        const documentsRef = collection(db, 'users', managerId, 'accountingDocuments');
        const q = query(documentsRef, orderBy('uploadedAt', 'desc'));

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            managerId,
            ...doc.data()
        } as AccountingDocument));
    } catch (error) {
        console.error('Error getting accounting documents:', error);
        return [];
    }
};

/**
 * Get documents by type
 */
export const getDocumentsByType = async (type: DocumentType): Promise<AccountingDocument[]> => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) return [];

        const documentsRef = collection(db, 'users', managerId, 'accountingDocuments');
        const q = query(
            documentsRef,
            where('type', '==', type),
            orderBy('uploadedAt', 'desc')
        );

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            managerId,
            ...doc.data()
        } as AccountingDocument));
    } catch (error) {
        console.error('Error getting documents by type:', error);
        return [];
    }
};

/**
 * Delete accounting document (Master only)
 */
export const deleteAccountingDocument = async (documentId: string, fileUrl: string): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Check if user is Master
        if (user.email !== 'elsoncontador.st@gmail.com') {
            throw new Error('Only Master users can delete documents');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        // Delete from Storage
        const storageRef = ref(storage, fileUrl);
        await deleteObject(storageRef);

        // Delete from Firestore
        const documentRef = doc(db, 'users', managerId, 'accountingDocuments', documentId);
        await updateDoc(documentRef, {
            deleted: true,
            deletedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        return false;
    }
};
