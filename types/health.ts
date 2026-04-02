// Health Management Type Definitions for Easymed

// Patient medical record
export interface UserRecord {
  id: string;
  userId: string;
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: any;
  updatedAt: any;
}

// Patient registration and management
export interface Guardian {
  name: string;
  cpf: string;
  relationship: string; // 'Pai', 'Mãe', 'Avô', 'Avó', 'Tutor Legal', etc.
  phone: string;
  email?: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf?: string; // Optional for minors
  birthdate: string; // YYYY-MM-DD
  phone: string;
  email?: string;
  address?: string;
  isMinor: boolean;
  guardian?: Guardian; // Required if isMinor is true
  medicalNotes?: string;
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  professionalId?: string; // Professional who registered this patient
  clinicId?: string; // Optional: Associate patient with a specific clinic
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

// Appointment/consultation records
export interface Appointment {
  id: string;
  userId: string;
  managerId?: string; // ID of the clinic manager (for team-based access)
  clinicId?: string; // Optional: Associate appointment with a specific clinic
  patientId?: string; // Link to registered patient
  patientName?: string; // For display purposes
  patientPhone?: string; // Contact information
  patientEmail?: string; // Optional email
  patientCpf?: string; // Patient CPF for receipts
  professionalId?: string;
  professionalName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  location?: string;
  amount?: number; // Consultation value for receipts
  bookedOnline?: boolean; // Flag for online bookings
  createdAt: any;
  updatedAt: any;
}

// Medication management
export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  notes?: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

// Health metrics tracking
export interface Measurement {
  id: string;
  userId: string;
  type: 'blood_pressure' | 'glucose' | 'weight' | 'temperature' | 'heart_rate' | 'other';
  value: string;
  unit: string;
  date: string;
  notes?: string;
  createdAt: any;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  professionalId: string;
  content: string;
  date: string;
  createdAt: any;
  updatedAt: any;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string; // For display purposes
  professionalId: string;
  professionalName: string; // For display purposes
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  date: string;
  notes?: string;
  createdAt: any;
}

export interface ExamRequest {
  id: string;
  patientId: string;
  patientName: string; // For display purposes
  professionalId: string;
  professionalName: string; // For display purposes
  exams: string[];
  date: string;
  clinicalIndication: string;
  createdAt: any;
}

// Clinic Hours Configuration
export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface DaySchedule {
  isOpen: boolean;
  morningShift?: TimeSlot;
  afternoonShift?: TimeSlot;
  lunchBreak?: TimeSlot;
}

export interface ClinicHours {
  id?: string;
  userId: string;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  createdAt: any;
  updatedAt: any;
}

// Patient Evolution
export interface PatientEvolution {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  description: string;
  metrics: {
    name: string;
    value: number;
    unit: string;
  }[];
  soap?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  createdAt: any;
}

// Multidisciplinary Team
export interface PatientTeamMember {
  id: string;
  patientId: string;
  professionalId: string;
  professionalEmail?: string;
  professionalName: string;
  specialty: string;
  role: string; // e.g., 'Médico Responsável', 'Fisioterapeuta', etc.
  assignedAt: string;
  assignedBy: string;
}

// Team Invitation (Approval Workflow)
export interface TeamInvitation {
  id: string;
  patientId: string;
  patientName: string;
  invitedProfessionalId: string;
  invitedProfessionalName: string;
  invitedProfessionalEmail?: string;
  invitedBy: string; // ID do profissional que convidou
  invitedByName: string;
  role: string; // Função na equipe
  specialty: string;
  status: 'pending' | 'accepted' | 'rejected';
  type: 'add' | 'remove'; // Tipo de solicitação
  teamMemberId?: string; // For remove requests, reference to existing team member
  createdAt: any;
  respondedAt?: any;
}

// Individual Anamnesis
export interface Anamnesis {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  specialty: string;
  date: string;
  mainComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  reviewOfSystems: string;
  createdAt: any;
  updatedAt: any;
}

// Mixed Anamnesis (AI Generated)
export interface MixedAnamnesis {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  content: string; // The AI generated summary
  sourceAnamnesesIds: string[]; // IDs of the individual anamneses used
  createdAt: any;
}
