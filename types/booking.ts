// Online Booking System Type Definitions

export interface BookingSettings {
    id?: string;
    userId: string; // Clinic/Professional owner
    isEnabled: boolean;
    bookingUrl: string; // Unique booking URL identifier

    // Availability settings
    advanceBookingDays: number; // How many days ahead patients can book (default: 30)
    minAdvanceDays: number; // Minimum days in advance (default: 1)
    slotDuration: number; // Minutes per slot (15, 30, 60)
    bufferTime: number; // Minutes between appointments (default: 0)

    // Display settings
    clinicName?: string;
    welcomeMessage?: string;
    consultationValue?: number; // Consultation price (optional)

    createdAt: any;
    updatedAt: any;
}

export interface BookingSlot {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    professionalId: string;
    professionalName: string;
    specialty: string;
    available: boolean;
}

export interface OnlineBookingRequest {
    userId: string; // Clinic owner
    professionalId: string;
    professionalName: string;
    patientName: string;
    patientPhone: string;
    patientEmail?: string; // Optional
    date: string;
    time: string;
    notes?: string;
}
