import { db } from './firebase';
import { collection, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { ClinicHours, DaySchedule } from '../types/health';

const defaultDaySchedule: DaySchedule = {
    isOpen: false,
    morningShift: { start: '08:00', end: '12:00' },
    afternoonShift: { start: '14:00', end: '18:00' },
    lunchBreak: { start: '12:00', end: '14:00' }
};

const getDefaultClinicHours = (userId: string): ClinicHours => ({
    userId,
    schedule: {
        monday: { ...defaultDaySchedule, isOpen: true },
        tuesday: { ...defaultDaySchedule, isOpen: true },
        wednesday: { ...defaultDaySchedule, isOpen: true },
        thursday: { ...defaultDaySchedule, isOpen: true },
        friday: { ...defaultDaySchedule, isOpen: true },
        saturday: { ...defaultDaySchedule, isOpen: false },
        sunday: { ...defaultDaySchedule, isOpen: false }
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
});

// Save or update clinic hours
export const saveClinicHours = async (userId: string, hours: ClinicHours): Promise<void> => {
    const hoursRef = doc(db, 'users', userId, 'settings', 'clinicHours');
    await setDoc(hoursRef, {
        ...hours,
        userId,
        updatedAt: Timestamp.now()
    }, { merge: true });
};

// Get clinic hours
export const getClinicHours = async (userId: string): Promise<ClinicHours> => {
    const hoursRef = doc(db, 'users', userId, 'settings', 'clinicHours');
    const snapshot = await getDoc(hoursRef);

    if (!snapshot.exists()) {
        return getDefaultClinicHours(userId);
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    } as ClinicHours;
};

// Update specific day schedule
export const updateDaySchedule = async (
    userId: string,
    day: keyof ClinicHours['schedule'],
    schedule: DaySchedule
): Promise<void> => {
    const hoursRef = doc(db, 'users', userId, 'settings', 'clinicHours');
    await setDoc(hoursRef, {
        [`schedule.${day}`]: schedule,
        updatedAt: Timestamp.now()
    }, { merge: true });
};
