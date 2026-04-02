import { onSnapshot, query, where, collectionGroup, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getManagerIdForUser } from './accessControlService';
import { Appointment } from '../types/health';

/**
 * Setup real-time listener for all clinic appointments
 * @param onUpdate Callback when appointments are updated
 * @param onError Callback when an error occurs
 * @returns Unsubscribe function
 */
export const setupAppointmentsListener = (
    onUpdate: (appointments: Appointment[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    const user = auth.currentUser;

    if (!user) {
        onError(new Error('User not authenticated'));
        return () => { };
    }

    let unsubscribe: (() => void) | null = null;

    // Get manager ID and setup listener
    getManagerIdForUser(user.uid)
        .then(managerId => {
            if (!managerId) {
                onError(new Error('Manager ID not found'));
                return;
            }

            const appointmentsRef = collectionGroup(db, 'appointments');
            const q = query(appointmentsRef, where('managerId', '==', managerId));

            unsubscribe = onSnapshot(
                q,
                (snapshot: QuerySnapshot<DocumentData>) => {
                    const appointments = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Appointment));

                    // Sort by date and time
                    appointments.sort((a, b) => {
                        const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
                        const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
                        return dateA.getTime() - dateB.getTime();
                    });

                    onUpdate(appointments);
                },
                (error) => {
                    console.error('Firestore listener error:', error);
                    onError(error as Error);
                }
            );
        })
        .catch(error => {
            console.error('Error setting up listener:', error);
            onError(error);
        });

    // Return cleanup function
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
};

/**
 * Setup real-time listener for upcoming appointments only
 * @param onUpdate Callback when appointments are updated
 * @param onError Callback when an error occurs
 * @returns Unsubscribe function
 */
export const setupUpcomingAppointmentsListener = (
    onUpdate: (appointments: Appointment[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    const user = auth.currentUser;

    if (!user) {
        onError(new Error('User not authenticated'));
        return () => { };
    }

    let unsubscribe: (() => void) | null = null;

    getManagerIdForUser(user.uid)
        .then(managerId => {
            if (!managerId) {
                onError(new Error('Manager ID not found'));
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            const appointmentsRef = collectionGroup(db, 'appointments');
            const q = query(appointmentsRef, where('managerId', '==', managerId));

            unsubscribe = onSnapshot(
                q,
                (snapshot: QuerySnapshot<DocumentData>) => {
                    const appointments = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as Appointment));

                    // Filter upcoming and scheduled appointments
                    const upcomingAppointments = appointments
                        .filter(apt => apt.date >= today && apt.status === 'scheduled')
                        .sort((a, b) => {
                            const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
                            const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
                            return dateA.getTime() - dateB.getTime();
                        });

                    onUpdate(upcomingAppointments);
                },
                (error) => {
                    console.error('Firestore listener error:', error);
                    onError(error as Error);
                }
            );
        })
        .catch(error => {
            console.error('Error setting up listener:', error);
            onError(error);
        });

    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
};
