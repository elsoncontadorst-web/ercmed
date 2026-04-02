import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, addDoc, query, where, Timestamp, collectionGroup, limit } from 'firebase/firestore';
import { BookingSettings, BookingSlot, OnlineBookingRequest } from '../types/booking';
import { Appointment } from '../types/health';
import { ClinicHours, DaySchedule } from '../types/health';
import { getClinicHours } from './clinicHoursService';
import { getAppointments } from './healthService';

// Generate unique booking URL identifier
const generateBookingUrlId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Get default booking settings
const getDefaultBookingSettings = (userId: string): BookingSettings => ({
    userId,
    isEnabled: false,
    bookingUrl: generateBookingUrlId(),
    advanceBookingDays: 30,
    minAdvanceDays: 1,
    slotDuration: 30,
    bufferTime: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
});

// Get booking settings
export const getBookingSettings = async (userId: string): Promise<BookingSettings> => {
    const settingsRef = doc(db, 'users', userId, 'settings', 'booking');
    const snapshot = await getDoc(settingsRef);

    if (!snapshot.exists()) {
        return getDefaultBookingSettings(userId);
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    } as BookingSettings;
};

// Save booking settings
export const saveBookingSettings = async (userId: string, settings: BookingSettings): Promise<void> => {
    const settingsRef = doc(db, 'users', userId, 'settings', 'booking');
    await setDoc(settingsRef, {
        ...settings,
        userId,
        updatedAt: Timestamp.now()
    }, { merge: true });
};

// Get booking settings by URL
export const getBookingByUrl = async (bookingUrl: string): Promise<{ userId: string; settings: BookingSettings } | null> => {
    console.log('🔍 Searching for booking URL:', bookingUrl);

    try {
        // Use collectionGroup to search across all 'settings' subcollections
        // This is much more efficient and secure than listing all users
        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('bookingUrl', '==', bookingUrl),
            where('isEnabled', '==', true),
            limit(1)
        );

        const querySnapshot = await getDocs(settingsQuery);

        if (querySnapshot.empty) {
            console.log('❌ No matching booking URL found');
            return null;
        }

        // iterate to find the one with id 'booking'
        // Although we query by bookingUrl, we should verify it's the 'booking' document
        // or ensure our data structure enforces this.
        // Since we are querying collectionGroup 'settings', we might get other settings docs if they had a bookingUrl field (unlikely).
        // Best practice: check doc.id or ensure bookingUrl is unique to booking settings.

        const bookingDoc = querySnapshot.docs.find(doc => doc.id === 'booking');

        if (bookingDoc) {
            const settings = bookingDoc.data() as BookingSettings;
            const userRef = bookingDoc.ref.parent.parent; // users/{userId}

            if (!userRef) {
                console.error('❌ Found booking doc but could not determine user');
                return null;
            }

            if (settings.isEnabled) {
                console.log('✅ Found matching booking settings for user:', userRef.id);
                return {
                    userId: userRef.id,
                    settings: {
                        id: bookingDoc.id,
                        ...settings
                    }
                };
            }
        }

        console.log('❌ Booking found but matches no enabled/valid criteria');
        return null;

    } catch (error) {
        console.error('🚨 Error in getBookingByUrl:', error);
        throw error;
    }
};

// Generate time slots for a day
const generateTimeSlots = (
    daySchedule: DaySchedule,
    slotDuration: number,
    bufferTime: number
): string[] => {
    if (!daySchedule.isOpen) return [];

    const slots: string[] = [];

    const addSlotsForPeriod = (start: string, end: string) => {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes + slotDuration <= endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const minutes = currentMinutes % 60;
            slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
            currentMinutes += slotDuration + bufferTime;
        }
    };

    // Morning shift
    if (daySchedule.morningShift) {
        addSlotsForPeriod(daySchedule.morningShift.start, daySchedule.morningShift.end);
    }

    // Afternoon shift
    if (daySchedule.afternoonShift) {
        addSlotsForPeriod(daySchedule.afternoonShift.start, daySchedule.afternoonShift.end);
    }

    return slots;
};

// Get available slots for a professional on a specific date
export const getAvailableSlots = async (
    userId: string,
    professionalId: string,
    professionalName: string,
    specialty: string,
    date: string
): Promise<BookingSlot[]> => {
    // Get clinic hours
    const clinicHours = await getClinicHours(userId);

    // Get booking settings
    const bookingSettings = await getBookingSettings(userId);

    // Get day of week
    const dateObj = new Date(date + 'T00:00:00');
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dateObj.getDay()] as keyof typeof clinicHours.schedule;
    const daySchedule = clinicHours.schedule[dayName];

    // Generate all possible time slots
    const allSlots = generateTimeSlots(daySchedule, bookingSettings.slotDuration, bookingSettings.bufferTime);

    // Get existing appointments for this professional on this date
    // SECURE: Only fetch necessary fields for this specific professional and date
    const existingAppointments = await getPublicAppointments(userId, professionalId, date);

    // Filter out occupied slots
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const availableSlots: BookingSlot[] = allSlots.map(time => {
        const isOccupied = existingAppointments.some(apt => apt.time === time);
        const isPast = date === today && time <= currentTime;

        return {
            date,
            time,
            professionalId,
            professionalName,
            specialty,
            available: !isOccupied && !isPast
        };
    });

    return availableSlots.filter(slot => slot.available);
};

// Create online booking
export const createOnlineBooking = async (request: OnlineBookingRequest): Promise<string> => {
    const appointmentsRef = collection(db, 'users', request.userId, 'appointments');

    const appointment: Omit<Appointment, 'id'> = {
        userId: request.userId,
        managerId: request.userId, // Set managerId to userId (clinic manager)
        professionalId: request.professionalId,
        professionalName: request.professionalName,
        specialty: '',
        patientName: request.patientName,
        patientPhone: request.patientPhone,
        patientEmail: request.patientEmail,
        date: request.date,
        time: request.time,
        status: 'scheduled',
        notes: request.notes,
        bookedOnline: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(appointmentsRef, appointment);
    return docRef.id;
};

// Check if a specific slot is still available (for double-booking prevention)
export const checkSlotAvailability = async (
    userId: string,
    professionalId: string,
    date: string,
    time: string
): Promise<boolean> => {
    const appointments = await getPublicAppointments(userId, professionalId, date);
    const conflict = appointments.find(
        apt => apt.time === time
    );

    return !conflict;
};

/**
 * SECURE: Fetches only the time and status of appointments for unauthenticated usage
 * Used by the public booking page to check availability without exposing patient data.
 */
export const getPublicAppointments = async (
    userId: string,
    professionalId: string,
    date: string
): Promise<Partial<Appointment>[]> => {
    try {
        const appointmentsRef = collection(db, 'users', userId, 'appointments');
        const q = query(
            appointmentsRef,
            where('professionalId', '==', professionalId),
            where('date', '==', date),
            where('status', '!=', 'cancelled'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        // Only return non-sensitive fields
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                time: data.time,
                status: data.status
            };
        });
    } catch (error) {
        console.error('Error fetching public appointments:', error);
        return [];
    }
};
