import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
    setDoc,
    collectionGroup,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { UserRecord, Appointment, Medication, Measurement, Patient, ClinicalNote, Prescription, ExamRequest, PatientEvolution, PatientTeamMember, Anamnesis, MixedAnamnesis, TeamInvitation, ProfessionalAnamnesis } from '../types/health';
import { createTeamQuery, getManagerIdForUser, getUserAccessSettings } from './accessControlService';
import { auth } from './firebase';

// ==================== USER MEDICAL RECORD ====================

export const createUserRecord = async (
    userId: string,
    data: Omit<UserRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<boolean> => {
    try {
        const recordRef = doc(db, 'users', userId, 'health', 'medical_record');
        await setDoc(recordRef, {
            ...data,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao criar registro médico:', error);
        return false;
    }
};

export const getUserRecord = async (userId: string): Promise<UserRecord | null> => {
    try {
        const recordRef = doc(db, 'users', userId, 'health', 'medical_record');
        const snap = await getDoc(recordRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as UserRecord;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar registro médico:', error);
        return null;
    }
};

export const updateUserRecord = async (
    userId: string,
    data: Partial<Omit<UserRecord, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const recordRef = doc(db, 'users', userId, 'health', 'medical_record');
        await updateDoc(recordRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar registro médico:', error);
        return false;
    }
};

// ==================== PATIENT MANAGEMENT ====================

export const addPatient = async (
    patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const patientsRef = collection(db, 'patients');
        const userId = auth.currentUser?.uid || '';
        const managerId = await getManagerIdForUser(userId);



        const docRef = await addDoc(patientsRef, {
            ...patient,
            managerId: managerId || userId, // Link to manager
            professionalId: userId, // Also save who created
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });


        return docRef.id;
    } catch (error) {
        console.error('[PATIENT] Erro ao adicionar paciente:', error);
        return null;
    }
};

export const getPatient = async (patientId: string): Promise<Patient | null> => {
    try {
        const patientRef = doc(db, 'patients', patientId);
        const snap = await getDoc(patientRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as Patient;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar paciente:', error);
        return null;
    }
};

const MASTER_ADMIN_EMAIL = 'elsoncontador.st@gmail.com';

export const getAllPatients = async (managerId?: string): Promise<Patient[]> => {
    try {
        const userId = auth.currentUser?.uid;
        const currentUserEmail = auth.currentUser?.email;
        const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;

        if (!userId) {
            console.log('[PATIENT] No user ID provided');
            return [];
        }

        // SECURITY: If managerId is provided, we filter by it.
        // If not provided AND not master admin, we use the user's managerId.
        // If master admin AND no managerId, we fetch everything.
        
        const patientsRef = collection(db, 'patients');
        let managedDocs = new Map<string, any>();

        if (!managerId && isMasterAdmin) {
            // Master Admin Global Fetch

            const snapshot = await getDocs(query(patientsRef, where('active', '==', true)));
            snapshot.docs.forEach(d => managedDocs.set(d.id, { id: d.id, ...d.data() }));
        } else {
            const effectiveManagerId = managerId || (await getManagerIdForUser(userId)) || userId;


            const { restrictToOwnPatients } = await getUserAccessSettings(userId);
            
            if (restrictToOwnPatients) {
                // Restricted mode: Only patients created by me OR where I am in the team
                const q2 = query(patientsRef, where('professionalId', '==', userId), where('active', '==', true));
                const snap2 = await getDocs(q2);
                snap2.docs.forEach(d => managedDocs.set(d.id, { id: d.id, ...d.data() }));
            } else {
                // Unrestricted mode: Patients of the manager and fallback to professionalId
                const queries = [
                    query(patientsRef, where('managerId', '==', effectiveManagerId), where('active', '==', true))
                ];

                if (effectiveManagerId === userId) {
                    queries.push(query(patientsRef, where('professionalId', '==', userId), where('active', '==', true)));
                }

                const snapshots = await Promise.all(queries.map(q => getDocs(q)));
                snapshots.forEach(snap => {
                    snap.docs.forEach(d => managedDocs.set(d.id, { id: d.id, ...(d.data() as any) } as Patient));
                });
            }
        }



        // 3. TEAM MEMBERSHIP QUERY: Patients where I am a team member
        const teamRef = collection(db, 'patient_teams');
        const teamQuery = query(teamRef, where('professionalId', '==', userId));
        const teamSnapshot = await getDocs(teamQuery);

        if (!teamSnapshot.empty) {

            const teamPatientIds = teamSnapshot.docs.map(doc => doc.data().patientId);
            // Fetch these patients
            const teamPatientsPromises = teamPatientIds.map(id => getPatient(id));
            const teamPatientsResults = await Promise.all(teamPatientsPromises);

            teamPatientsResults.forEach(p => {
                if (p && p.active !== false) {
                    managedDocs.set(p.id, p);
                }
            });
        }

        const allPatients = Array.from(managedDocs.values()) as Patient[];


        return allPatients.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error('[PATIENT] Error loading patients:', error);
        return [];
    }
};

export const searchPatients = async (searchQuery: string, professionalId?: string): Promise<Patient[]> => {
    try {
        const patients = await getAllPatients(professionalId);
        const lowerQuery = searchQuery.toLowerCase();
        return patients.filter(p =>
            (p.name || '').toLowerCase().includes(lowerQuery) ||
            (p.cpf || '').includes(searchQuery) ||
            (p.phone || '').includes(searchQuery)
        );
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        return [];
    }
};

export const updatePatient = async (
    patientId: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const patientRef = doc(db, 'patients', patientId);
        await updateDoc(patientRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar paciente:', error);
        return false;
    }
};

export const deletePatient = async (patientId: string): Promise<boolean> => {
    try {
        const patientRef = doc(db, 'patients', patientId);
        await deleteDoc(patientRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar paciente:', error);
        return false;
    }
};

// ==================== APPOINTMENTS ====================

export const addAppointment = async (
    userId: string,
    appointment: Omit<Appointment, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const appointmentsRef = collection(db, 'users', userId, 'appointments');
        const managerId = await getManagerIdForUser(userId);
        const docRef = await addDoc(appointmentsRef, {
            ...appointment,
            userId,
            managerId: managerId || userId, // Ensure managerId is saved
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar consulta:', error);
        return null;
    }
};

export const getAppointments = async (userId: string): Promise<Appointment[]> => {
    try {
        const appointmentsRef = collection(db, 'users', userId, 'appointments');
        const q = query(appointmentsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        return [];
    }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
    try {
        const userId = auth.currentUser?.uid;
        const currentUserEmail = auth.currentUser?.email;
        const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;
        
        if (!userId) return [];

        const appointmentsRef = collectionGroup(db, 'appointments');
        let q;

        if (isMasterAdmin) {
            // Master Admin sees ALL appointments globally

            q = query(appointmentsRef, orderBy('date', 'desc'));
        } else {
            const managerId = await getManagerIdForUser(userId);
            const effectiveManagerId = managerId || userId;
            if (!effectiveManagerId) return [];

            q = query(appointmentsRef, where('managerId', '==', effectiveManagerId));
        }

        const snapshot = await getDocs(q);
        const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        return appointments.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
            return dateB.getTime() - dateA.getTime();
        });
    } catch (error) {
        console.error('Erro ao buscar todas as consultas (Admin):', error);
        return [];
    }
};

export const getUpcomingAppointments = async (userId: string): Promise<Appointment[]> => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const appointmentsRef = collection(db, 'users', userId, 'appointments');
        const q = query(
            appointmentsRef,
            where('date', '>=', today),
            where('status', '==', 'scheduled'),
            orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    } catch (error) {
        console.error('Erro ao buscar consultas futuras:', error);
        return [];
    }
};

export const updateAppointment = async (
    userId: string,
    appointmentId: string,
    data: Partial<Omit<Appointment, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const appointmentRef = doc(db, 'users', userId, 'appointments', appointmentId);
        await updateDoc(appointmentRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar consulta:', error);
        return false;
    }
};

export const getAllUpcomingAppointments = async (): Promise<Appointment[]> => {
    try {
        const userId = auth.currentUser?.uid;
        const currentUserEmail = auth.currentUser?.email;
        const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;
        
        if (!userId) return [];

        const today = new Date().toISOString().split('T')[0];
        const appointmentsRef = collectionGroup(db, 'appointments');
        let q;

        if (isMasterAdmin) {

            q = query(appointmentsRef, where('date', '>=', today), where('status', '==', 'scheduled'));
        } else {
            const managerId = await getManagerIdForUser(userId);
            const effectiveManagerId = managerId || userId;
            if (!effectiveManagerId) return [];

            q = query(appointmentsRef, where('managerId', '==', effectiveManagerId));
        }

        const snapshot = await getDocs(q);
        const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));

        // Filter and sort client-side
        return appointments
            .filter(apt => apt.date >= today && apt.status === 'scheduled')
            .sort((a, b) => {
                const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
                const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
                return dateA.getTime() - dateB.getTime();
            });
    } catch (error) {
        console.error('Erro ao buscar todas as consultas futuras:', error);
        return [];
    }
};

export const deleteAppointment = async (userId: string, appointmentId: string): Promise<boolean> => {
    try {
        const appointmentRef = doc(db, 'users', userId, 'appointments', appointmentId);
        await deleteDoc(appointmentRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar consulta:', error);
        return false;
    }
};

// ==================== MEDICATIONS ====================

export const addMedication = async (
    userId: string,
    medication: Omit<Medication, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const medicationsRef = collection(db, 'users', userId, 'medications');
        const docRef = await addDoc(medicationsRef, {
            ...medication,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar medicamento:', error);
        return null;
    }
};

export const getMedications = async (userId: string): Promise<Medication[]> => {
    try {
        const medicationsRef = collection(db, 'users', userId, 'medications');
        const q = query(medicationsRef, orderBy('startDate', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
    } catch (error) {
        console.error('Erro ao buscar medicamentos:', error);
        return [];
    }
};

export const getActiveMedications = async (userId: string): Promise<Medication[]> => {
    try {
        const medicationsRef = collection(db, 'users', userId, 'medications');
        const q = query(
            medicationsRef,
            where('active', '==', true),
            orderBy('startDate', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication));
    } catch (error) {
        console.error('Erro ao buscar medicamentos ativos:', error);
        return [];
    }
};

export const updateMedication = async (
    userId: string,
    medicationId: string,
    data: Partial<Omit<Medication, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const medicationRef = doc(db, 'users', userId, 'medications', medicationId);
        await updateDoc(medicationRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar medicamento:', error);
        return false;
    }
};

export const deleteMedication = async (userId: string, medicationId: string): Promise<boolean> => {
    try {
        const medicationRef = doc(db, 'users', userId, 'medications', medicationId);
        await deleteDoc(medicationRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar medicamento:', error);
        return false;
    }
};

// ==================== MEASUREMENTS ====================

export const addMeasurement = async (
    userId: string,
    measurement: Omit<Measurement, 'id' | 'userId' | 'createdAt'>
): Promise<string | null> => {
    try {
        const measurementsRef = collection(db, 'users', userId, 'measurements');
        const docRef = await addDoc(measurementsRef, {
            ...measurement,
            userId,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar medição:', error);
        return null;
    }
};

export const getMeasurements = async (
    userId: string,
    type?: Measurement['type']
): Promise<Measurement[]> => {
    try {
        const measurementsRef = collection(db, 'users', userId, 'measurements');
        let q;
        if (type) {
            q = query(measurementsRef, where('type', '==', type), orderBy('date', 'desc'));
        } else {
            q = query(measurementsRef, orderBy('date', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Measurement));
    } catch (error) {
        console.error('Erro ao buscar medições:', error);
        return [];
    }
};

export const getRecentMeasurements = async (
    userId: string,
    limit: number = 10
): Promise<Measurement[]> => {
    try {
        const measurementsRef = collection(db, 'users', userId, 'measurements');
        const q = query(measurementsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const measurements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Measurement));
        return measurements.slice(0, limit);
    } catch (error) {
        console.error('Erro ao buscar medições recentes:', error);
        return [];
    }
};

export const deleteMeasurement = async (userId: string, measurementId: string): Promise<boolean> => {
    try {
        const measurementRef = doc(db, 'users', userId, 'measurements', measurementId);
        await deleteDoc(measurementRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar medição:', error);
        return false;
    }
};

// ==================== CLINICAL NOTES ====================

export const addClinicalNote = async (
    note: Omit<ClinicalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const notesRef = collection(db, 'clinical_notes');
        const docRef = await addDoc(notesRef, {
            ...note,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar evolução clínica:', error);
        return null;
    }
};

export const getClinicalNotes = async (patientId: string): Promise<ClinicalNote[]> => {
    try {
        const notesRef = collection(db, 'clinical_notes');
        const q = query(notesRef, where('patientId', '==', patientId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalNote));
    } catch (error) {
        console.error('Erro ao buscar evoluções clínicas:', error);
        return [];
    }
};

// ==================== PRESCRIPTIONS ====================

export const addPrescription = async (
    prescription: Omit<Prescription, 'id' | 'createdAt'>
): Promise<string | null> => {
    try {
        const prescriptionsRef = collection(db, 'prescriptions');
        const docRef = await addDoc(prescriptionsRef, {
            ...prescription,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar prescrição:', error);
        return null;
    }
};

export const getPrescriptions = async (patientId: string): Promise<Prescription[]> => {
    try {
        const prescriptionsRef = collection(db, 'prescriptions');
        const q = query(prescriptionsRef, where('patientId', '==', patientId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
    } catch (error) {
        console.error('Erro ao buscar prescrições:', error);
        return [];
    }
};

// ==================== EXAM REQUESTS ====================

export const addExamRequest = async (
    request: Omit<ExamRequest, 'id' | 'createdAt'>
): Promise<string | null> => {
    try {
        const requestsRef = collection(db, 'exam_requests');
        const docRef = await addDoc(requestsRef, {
            ...request,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar solicitação de exames:', error);
        return null;
    }
};

export const getExamRequests = async (patientId: string): Promise<ExamRequest[]> => {
    try {
        const requestsRef = collection(db, 'exam_requests');
        const q = query(requestsRef, where('patientId', '==', patientId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamRequest));
    } catch (error) {
        console.error('Erro ao buscar solicitações de exames:', error);
        return [];
    }
};

// ==================== PATIENT EVOLUTION ====================

export const addPatientEvolution = async (
    evolution: Omit<PatientEvolution, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const evolutionsRef = collection(db, 'patient_evolutions');
        const docRef = await addDoc(evolutionsRef, {
            ...evolution,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar evolução:', error);
        return null;
    }
};

export const getPatientEvolutions = async (patientId: string): Promise<PatientEvolution[]> => {
    try {
        const evolutionsRef = collection(db, 'patient_evolutions');
        const q = query(
            evolutionsRef,
            where('patientId', '==', patientId),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatientEvolution));
    } catch (error) {
        console.error('Erro ao buscar evoluções:', error);
        return [];
    }
};

// ==================== MULTIDISCIPLINARY TEAM ====================

export const addTeamMember = async (
    member: Omit<PatientTeamMember, 'id' | 'assignedAt'>
): Promise<string | null> => {
    try {
        if (!member.patientId || !member.professionalId) {
            throw new Error('Patient ID and Professional ID are required to add a team member.');
        }

        const memberId = `${member.patientId}_${member.professionalId}`;
        const memberRef = doc(db, 'patient_teams', memberId);
        
        await setDoc(memberRef, {
            ...member,
            id: memberId,
            assignedAt: serverTimestamp()
        });
        
        return memberId;
    } catch (error) {
        console.error('Erro ao adicionar membro da equipe:', error);
        return null;
    }
};

export const getTeamMembers = async (patientId: string): Promise<PatientTeamMember[]> => {
    try {
        const teamRef = collection(db, 'patient_teams');
        const q = query(teamRef, where('patientId', '==', patientId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PatientTeamMember));
    } catch (error) {
        console.error('Erro ao buscar equipe:', error);
        return [];
    }
};

export const removeTeamMember = async (memberId: string): Promise<boolean> => {
    try {
        const memberRef = doc(db, 'patient_teams', memberId);
        await deleteDoc(memberRef);
        return true;
    } catch (error) {
        console.error('Erro ao remover membro da equipe:', error);
        return false;
    }
};

// ==================== REAL-TIME LISTENERS ====================

export const subscribeToAppointments = (
    userId: string,
    onUpdate: (appointments: Appointment[]) => void
): (() => void) => {
    const appointmentsRef = collection(db, 'users', userId, 'appointments');
    const q = query(appointmentsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        onUpdate(appointments);
    }, (error) => {
        console.error('Error in appointments listener:', error);
    });

    return unsubscribe;
};

export const subscribeToAllAppointments = (
    onUpdate: (appointments: Appointment[]) => void,
    onError?: (error: any) => void
): (() => void) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        onUpdate([]);
        return () => { };
    }

    let unsubscribe: () => void = () => { };

    const setup = async () => {
        try {
            const currentUserEmail = auth.currentUser?.email;
            const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;
            
            const appointmentsRef = collectionGroup(db, 'appointments');
            let q;

            if (isMasterAdmin) {

                q = query(
                    appointmentsRef,
                    where('status', 'in', ['scheduled', 'confirmed']),
                    orderBy('date', 'asc'),
                    orderBy('time', 'asc')
                );
            } else {
                const managerId = await getManagerIdForUser(userId);
                const effectiveManagerId = managerId || userId;

                if (!effectiveManagerId) {
                    onUpdate([]);
                    return;
                }

                q = query(
                    appointmentsRef,
                    where('managerId', '==', effectiveManagerId),
                    where('status', 'in', ['scheduled', 'confirmed']),
                    orderBy('date', 'asc'),
                    orderBy('time', 'asc')
                );
            }

            unsubscribe = onSnapshot(q, (snapshot) => {
                const appointments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Appointment[];
                onUpdate(appointments);
            }, (error) => {
                console.error('Error in appointments snapshot:', error);
                if (onError) onError(error);
                onUpdate([]); // Resolve loading state
            });
        } catch (error) {
            console.error('Error setting up all appointments listener:', error);
            if (onError) onError(error);
            onUpdate([]);
        }
    };

    setup();
    return () => {
        unsubscribe();
    };
};

export const subscribeToPatients = (
    onUpdate: (patients: Patient[]) => void
): (() => void) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
        onUpdate([]);
        return () => { };
    }

    // Map to keep track of ALL patients being listened to (deduplicated by ID)
    const patientMap = new Map<string, Patient>();
    // Store all unsub functions to clean up later
    const unsubscribes: { [key: string]: () => void } = {};
    // Track IDs that come from the main query vs team query
    const clinicPatientIds = new Set<string>();
    const teamPatientIds = new Set<string>();

    const triggerUpdate = () => {
        const patients = Array.from(patientMap.values());
        const sorted = patients.sort((a, b) => a.name.localeCompare(b.name));
        onUpdate(sorted);
    };

    const setupListeners = async () => {
        try {
            const { restrictToOwnPatients } = await getUserAccessSettings(userId);
            const patientsRef = collection(db, 'patients');
            
            // 1. MAIN QUERY (Clinic/Own Patients)
            let mainQuery;
            if (restrictToOwnPatients) {
                mainQuery = query(patientsRef, where('professionalId', '==', userId), where('active', '==', true));
            } else {
                const managerId = await getManagerIdForUser(userId);
                const effectiveId = managerId || userId;
                mainQuery = query(patientsRef, where('managerId', '==', effectiveId), where('active', '==', true));
            }

            unsubscribes['main'] = onSnapshot(mainQuery, (snapshot) => {
                // Keep track of which IDs are still in the main query
                const currentMainIds = new Set<string>();
                snapshot.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() } as Patient;
                    patientMap.set(doc.id, data);
                    currentMainIds.add(doc.id);
                });

                // Remove patients that are no longer in the main query AND not in teams
                clinicPatientIds.forEach(id => {
                    if (!currentMainIds.has(id) && !teamPatientIds.has(id)) {
                        patientMap.delete(id);
                    }
                });

                // Update state trackers
                clinicPatientIds.clear();
                currentMainIds.forEach(id => clinicPatientIds.add(id));

                triggerUpdate();
            }, (error) => {
                console.error('Error in main patients listener:', error);
            });

            // 2. TEAM MEMBERSHIP LISTENER (Patients via Team)
            const teamRef = collection(db, 'patient_teams');
            const teamQuery = query(teamRef, where('professionalId', '==', userId));

            unsubscribes['teams'] = onSnapshot(teamQuery, (snapshot) => {
                const currentTeamIds = new Set<string>();
                snapshot.docs.forEach(doc => {
                    const patientId = doc.data().patientId;
                    if (patientId) {
                        currentTeamIds.add(patientId);
                    }
                });

                // Stop listening to patients no longer in our team scope
                teamPatientIds.forEach(id => {
                    if (!currentTeamIds.has(id)) {
                        // Only stop the specific patient listener if it's a team-only patient
                        if (unsubscribes[`patient_${id}`]) {
                            unsubscribes[`patient_${id}`]();
                            delete unsubscribes[`patient_${id}`];
                        }
                        // Only delete from map if not also in clinic list
                        if (!clinicPatientIds.has(id)) {
                            patientMap.delete(id);
                        }
                    }
                });

                // Start listening to NEW team patients (that we aren't already listening to via main query)
                currentTeamIds.forEach(id => {
                    if (!teamPatientIds.has(id)) {
                        // New team ID
                        if (!clinicPatientIds.has(id) && !unsubscribes[`patient_${id}`]) {
                            // We need an individual listener for this patient since they are outside our main clinic scope
                            const patientDocRef = doc(db, 'patients', id);
                            unsubscribes[`patient_${id}`] = onSnapshot(patientDocRef, (docSnap) => {
                                if (docSnap.exists()) {
                                    const data = { id: docSnap.id, ...docSnap.data() } as Patient;
                                    if (data.active !== false) {
                                        patientMap.set(docSnap.id, data);
                                    } else {
                                        patientMap.delete(docSnap.id);
                                    }
                                } else {
                                    patientMap.delete(id);
                                }
                                triggerUpdate();
                            }, (err) => {
                                console.error(`Error listening to team patient ${id}:`, err);
                            });
                        }
                    }
                    teamPatientIds.add(id);
                });

                // Final sync of the teamPatientIds set
                teamPatientIds.clear();
                currentTeamIds.forEach(id => teamPatientIds.add(id));

                triggerUpdate();
            }, (error) => {
                console.error('Error in team patients listener:', error);
            });
        } catch (error) {
            console.error('Error setting up patients listeners:', error);
            onUpdate([]);
        }
    };

    setupListeners();

    return () => {
        Object.values(unsubscribes).forEach(unsub => unsub());
    };
};

// ==================== INDIVIDUAL ANAMNESIS ====================

export const addAnamnesis = async (
    anamnesis: Omit<Anamnesis, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const anamnesisRef = collection(db, 'anamneses');
        const docRef = await addDoc(anamnesisRef, {
            ...anamnesis,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar anamnese:', error);
        return null;
    }
};

export const updateAnamnesis = async (
    anamnesisId: string,
    data: Partial<Omit<Anamnesis, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const anamnesisRef = doc(db, 'anamneses', anamnesisId);
        await updateDoc(anamnesisRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar anamnese:', error);
        return false;
    }
};

export const getAnamneses = async (patientId: string): Promise<Anamnesis[]> => {
    try {
        const anamnesisRef = collection(db, 'anamneses');
        const q = query(anamnesisRef, where('patientId', '==', patientId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anamnesis));
    } catch (error) {
        console.error('Erro ao buscar anamneses:', error);
        return [];
    }
};

export const deleteAnamnesis = async (anamnesisId: string): Promise<boolean> => {
    try {
        const anamnesisRef = doc(db, 'anamneses', anamnesisId);
        await deleteDoc(anamnesisRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar anamnese:', error);
        return false;
    }
};

// ==================== MIXED ANAMNESIS (AI) ====================

export const addMixedAnamnesis = async (
    anamnesis: Omit<MixedAnamnesis, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const anamnesisRef = collection(db, 'patients', anamnesis.patientId, 'mixed_anamnesis');
        const docRef = await addDoc(anamnesisRef, {
            ...anamnesis,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar anamnese mista:', error);
        return null;
    }
};

export const getMixedAnamneses = async (patientId: string): Promise<MixedAnamnesis[]> => {
    try {
        const anamnesisRef = collection(db, 'patients', patientId, 'mixed_anamnesis');
        const q = query(anamnesisRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MixedAnamnesis));
    } catch (error) {
        console.error('Erro ao buscar anamneses mistas:', error);
        return [];
    }
};

// ==================== TEAM INVITATIONS (APPROVAL WORKFLOW) ====================

export const createTeamInvitation = async (
    invitation: Omit<TeamInvitation, 'id' | 'createdAt' | 'respondedAt'>
): Promise<string | null> => {
    try {
        // Check for duplicate pending invitation
        const existingRef = collection(db, 'team_invitations');
        const duplicateQuery = query(
            existingRef,
            where('patientId', '==', invitation.patientId),
            where('invitedProfessionalId', '==', invitation.invitedProfessionalId),
            where('status', '==', 'pending'),
            where('type', '==', invitation.type)
        );
        const duplicateSnapshot = await getDocs(duplicateQuery);

        if (!duplicateSnapshot.empty) {
            console.warn('Convite duplicado detectado. Ignorando criação.');
            return duplicateSnapshot.docs[0].id;
        }

        const invitationsRef = collection(db, 'team_invitations');
        const docRef = await addDoc(invitationsRef, {
            ...invitation,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao criar convite de equipe:', error);
        return null;
    }
};

export const getTeamInvitations = async (professionalId: string, professionalEmail?: string): Promise<TeamInvitation[]> => {
    try {
        const invitationsRef = collection(db, 'team_invitations');

        // Map to store unique invitations by ID
        const invitationsMap = new Map<string, TeamInvitation>();

        // 1. Query by ID
        const q1 = query(
            invitationsRef,
            where('invitedProfessionalId', '==', professionalId)
        );

        const snapshot1 = await getDocs(q1);
        snapshot1.docs.forEach(doc => {
            invitationsMap.set(doc.id, { id: doc.id, ...(doc.data() as any) } as TeamInvitation);
        });

        // 2. Query by Email (if provided)
        if (professionalEmail) {
            const q2 = query(
                invitationsRef,
                where('invitedProfessionalEmail', '==', professionalEmail)
            );

            const snapshot2 = await getDocs(q2);
            snapshot2.docs.forEach(doc => {
                if (!invitationsMap.has(doc.id)) {
                    invitationsMap.set(doc.id, { id: doc.id, ...doc.data() } as TeamInvitation);
                }
            });
        }

        // Convert to array and sort
        return Array.from(invitationsMap.values()).sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });

    } catch (error) {
        console.error('Erro ao buscar convites:', error);
        return [];
    }
};

export const getPendingInvitationsCount = async (professionalId: string, professionalEmail?: string): Promise<number> => {
    try {
        const invitationsRef = collection(db, 'team_invitations');

        // 1. Query by ID
        const q1 = query(
            invitationsRef,
            where('invitedProfessionalId', '==', professionalId),
            where('status', '==', 'pending')
        );
        const snapshot1 = await getDocs(q1);
        const ids = new Set(snapshot1.docs.map(d => d.id));

        // 2. Query by Email
        if (professionalEmail) {
            const q2 = query(
                invitationsRef,
                where('invitedProfessionalEmail', '==', professionalEmail),
                where('status', '==', 'pending')
            );
            const snapshot2 = await getDocs(q2);
            snapshot2.docs.forEach(d => ids.add(d.id));
        }

        return ids.size;
    } catch (error) {
        console.error('Erro ao contar convites pendentes:', error);
        return 0;
    }
};

export const getInvitationsByPatient = async (patientId: string): Promise<TeamInvitation[]> => {
    try {
        const invitationsRef = collection(db, 'team_invitations');
        const q = query(
            invitationsRef,
            where('patientId', '==', patientId)
        );
        const snapshot = await getDocs(q);
        const invitations = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TeamInvitation));
        
        // Manual sort by createdAt descending
        return invitations.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Erro ao buscar convites do paciente:', error);
        return [];
    }
};

export const respondToInvitation = async (
    invitationId: string,
    response: 'accepted' | 'rejected'
): Promise<boolean> => {
    try {
        const invitationRef = doc(db, 'team_invitations', invitationId);
        const invitationSnap = await getDoc(invitationRef);

        if (!invitationSnap.exists()) {
            console.error('Convite não encontrado');
            return false;
        }

        const invitation = { id: invitationSnap.id, ...invitationSnap.data() } as TeamInvitation;
        const currentUser = auth.currentUser;

        // Update invitation status
        await updateDoc(invitationRef, {
            status: response,
            respondedAt: serverTimestamp(),
            // Ensure we capture who actually responded
            respondedBy: currentUser?.uid || 'unknown'
        });

        // If accepted and type is 'add', add to team
        if (response === 'accepted' && invitation.type === 'add') {
            // CRITICAL FIX: Use the ACCEPTING user's ID, not the one in the invite (which might be empty/email-only)
            const professionalIdToUse = currentUser?.uid || invitation.invitedProfessionalId;

            await addTeamMember({
                patientId: invitation.patientId,
                professionalId: professionalIdToUse, // Use resolved ID
                professionalEmail: currentUser?.email || invitation.invitedProfessionalEmail, // Save email for fallback
                professionalName: invitation.invitedProfessionalName,
                specialty: invitation.specialty,
                role: invitation.role,
                assignedBy: invitation.invitedBy
            });
        }

        // If accepted and type is 'remove', remove from team
        if (response === 'accepted' && invitation.type === 'remove' && invitation.teamMemberId) {
            await removeTeamMember(invitation.teamMemberId);
        }

        return true;
    } catch (error) {
        console.error('Erro ao responder convite:', error);
        return false;
    }
};

export const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    try {
        const invitationRef = doc(db, 'team_invitations', invitationId);
        await deleteDoc(invitationRef);
        return true;
    } catch (error) {
        console.error('Erro ao cancelar convite:', error);
        return false;
    }
};

// ============================================================
// PROFESSIONAL ANAMNESES (Multiprofessional System)
// ============================================================

export const saveProfessionalAnamnesis = async (
    data: Omit<ProfessionalAnamnesis, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const ref = collection(db, 'professional_anamneses');
        const docRef = await addDoc(ref, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao salvar anamnese profissional:', error);
        return null;
    }
};

export const getProfessionalAnamneses = async (
    patientId: string
): Promise<ProfessionalAnamnesis[]> => {
    try {
        const ref = collection(db, 'professional_anamneses');
        const q = query(ref, where('patientId', '==', patientId));
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as ProfessionalAnamnesis));
        return results.sort((a, b) => {
            const tA = (a.createdAt?.seconds || 0);
            const tB = (b.createdAt?.seconds || 0);
            return tB - tA;
        });
    } catch (error) {
        console.error('Erro ao buscar anamneses profissionais:', error);
        return [];
    }
};

export const updateProfessionalAnamnesis = async (
    id: string,
    data: Partial<Omit<ProfessionalAnamnesis, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const ref = doc(db, 'professional_anamneses', id);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar anamnese profissional:', error);
        return false;
    }
};

export const deleteProfessionalAnamnesis = async (id: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, 'professional_anamneses', id));
        return true;
    } catch (error) {
        console.error('Erro ao excluir anamnese profissional:', error);
        return false;
    }
};
