import React, { useState, useEffect } from 'react';
import { FileText, User, Plus, Search, FileSignature, Paperclip, Activity, Save, Clock, Printer, Trash2, X, Users, Stethoscope, GitMerge, Lock, ArrowLeft, Building2, Heart, Wind, Droplets, Brain, Bone, Thermometer, Scale, Wand2, History, Edit3 } from 'lucide-react';
import { getAllPatients, addClinicalNote, getClinicalNotes, addPatientEvolution, getPatientEvolutions, addTeamMember, getTeamMembers, removeTeamMember, addAnamnesis, getAnamneses, addMixedAnamnesis, getMixedAnamneses, createTeamInvitation, getInvitationsByPatient, cancelInvitation, addPrescription, getPrescriptions, addExamRequest, getExamRequests, deleteAnamnesis, updateAnamnesis } from '../services/healthService';
import { getClinics } from '../services/clinicService';
import { Clinic } from '../types/clinic';
import { getAllProfessionals } from '../services/repasseService';
import { Patient, ClinicalNote, Prescription, ExamRequest, PatientEvolution, PatientTeamMember, Anamnesis, MixedAnamnesis, TeamInvitation } from '../types/health';
import { generateClinicalSummary } from '../services/aiService';
import { Professional } from '../types/finance';
import { auth, db } from '../services/firebase';
import { updateDoc, doc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { checkModuleAccess } from '../services/accountTierService';
import { AccountTier } from '../types/accountTiers';
import { getProfessionalSettings } from '../services/userDataService';
import { ProfessionalSettings } from '../types';
import jsPDF from 'jspdf';
import ProfessionalAnamnesisView from './ProfessionalAnamnesisView';

interface MedicationRow {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
}

const EMRView: React.FC = () => {
    const { userProfile } = useUser();
    const [hasAdvancedEMR, setHasAdvancedEMR] = useState(false);
    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'EVOLUTION' | 'PRESCRIPTION' | 'EXAMS' | 'DOCUMENTS' | 'TEAM' | 'ANAMNESIS' | 'MIXED_ANAMNESIS' | 'PROF_ANAMNESIS'>('SUMMARY');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [clinicalNote, setClinicalNote] = useState('');
    const [notes, setNotes] = useState<ClinicalNote[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
    const [loading, setLoading] = useState(false);

    // Team & Anamnesis State
    const [teamMembers, setTeamMembers] = useState<PatientTeamMember[]>([]);
    const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
    const [isTeamMember, setIsTeamMember] = useState<boolean>(false); // Track if current user is team member
    const [anamneses, setAnamneses] = useState<Anamnesis[]>([]);
    const [mixedAnamneses, setMixedAnamneses] = useState<MixedAnamnesis[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState('');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [professionalSettings, setProfessionalSettings] = useState<ProfessionalSettings | null>(null);

    const [newTeamMember, setNewTeamMember] = useState({
        professionalEmail: '',
        role: ''
    });

    const initialAnamnesisState = {
        mainComplaint: '',
        hdaStructured: {
            onset: '' as any,
            duration: '',
            location: '',
            quality: '',
            intensity: 5,
            radiation: '',
            aggravatingFactors: '',
            alleviatingFactors: '',
            associatedSymptoms: '',
            context: '',
            pastEpisodes: '',
            priorMedications: ''
        },
        historyOfPresentIllness: '',
        pastMedicalHistory: '',
        familyHistory: '',
        socialHistory: '',
        rosStructured: {
            general: [],
            cardiovascular: [],
            respiratory: [],
            gastrointestinal: [],
            musculoskeletal: [],
            neurological: [],
            genitourinary: [],
            others: ''
        },
        reviewOfSystems: '',
        vitals: {
            bpSistolic: '',
            bpDiastolic: '',
            heartRate: '',
            respRate: '',
            temperature: '',
            saturation: '',
            weight: '',
            height: '',
            imc: ''
        },
        clinicalEvaluation: '',
        carePlan: ''
    };

    const [newAnamnesis, setNewAnamnesis] = useState(initialAnamnesisState);
    const [showAnamnesisForm, setShowAnamnesisForm] = useState(false);
    const [isEditingAnamnesis, setIsEditingAnamnesis] = useState(false);
    const [editingAnamnesisId, setEditingAnamnesisId] = useState<string | null>(null);

    // Evolution state
    const [evolutions, setEvolutions] = useState<PatientEvolution[]>([]);
    const [evolutionForm, setEvolutionForm] = useState({
        description: '',
        soap: {
            subjective: '',
            objective: '',
            assessment: '',
            plan: ''
        },
        metrics: [] as { name: string, value: number, unit: string }[]
    });
    const [newMetric, setNewMetric] = useState({ name: '', value: '', unit: '' });

    // Prescription form state
    const [medications, setMedications] = useState<MedicationRow[]>([
        { name: '', dosage: '', frequency: '', duration: '' }
    ]);
    const [prescriptionNotes, setPrescriptionNotes] = useState('');

    // Exam request form state
    const [selectedExams, setSelectedExams] = useState<string[]>([]);
    const [customExam, setCustomExam] = useState('');
    const [clinicalIndication, setClinicalIndication] = useState('');

    // Documents State
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [documentType, setDocumentType] = useState<'ATESTADO' | 'DECLARACAO'>('ATESTADO');
    const [documentDays, setDocumentDays] = useState('1');
    const [documentCid, setDocumentCid] = useState('');

    const commonExams = [
        'Hemograma Completo',
        'Glicemia em Jejum',
        'Colesterol Total e Frações',
        'Triglicerídeos',
        'Ureia e Creatinina',
        'TGO/TGP',
        'TSH e T4 Livre',
        'Raio-X de Tórax',
        'Raio-X de Coluna',
        'Ultrassonografia Abdominal',
        'Eletrocardiograma',
        'Ecocardiograma'
    ];

    // Derived state
    const selectedPatient = patients.find(p => p.id === selectedPatientId);

    // Check advanced EMR access based on account tier
    useEffect(() => {
        const checkAccess = async () => {
            if (auth.currentUser && userProfile) {
                const hasAccess = await checkModuleAccess(auth.currentUser.uid, 'ADVANCED_EMR');
                setHasAdvancedEMR(hasAccess);
            }
        };
        checkAccess();
    }, [userProfile]);

    useEffect(() => {
        loadPatients();
        loadProfessionals();
        loadProfessionalSettings();
    }, []);

    const loadProfessionalSettings = async () => {
        if (auth.currentUser) {
            const settings = await getProfessionalSettings(auth.currentUser.uid);
            if (settings) {
                setProfessionalSettings(settings);
            }
        }
    };

    const getCurrentProfessional = () => {
        const user = auth.currentUser;
        const name = professionalSettings?.professionalName || userProfile?.displayName || user?.displayName || 'Profissional';
        const specialty = professionalSettings?.specialty || 'Clínica Geral';
        const crm = professionalSettings?.crm || '';
        return { name, specialty, crm };
    };

    const loadProfessionals = async () => {
        const data = await getAllProfessionals();
        setProfessionals(data);
    };

    useEffect(() => {
        if (selectedPatientId) {
            loadPatientData(selectedPatientId);
        } else {
            setNotes([]);
            setPrescriptions([]);
            setExamRequests([]);
            setEvolutions([]);
        }
    }, [selectedPatientId]);

    const loadPatients = async () => {
        const user = auth.currentUser;
        if (user) {
            const data = await getAllPatients(user.uid);
            setPatients(data);
        }
    };

    const loadPatientData = async (patientId: string) => {
        const user = auth.currentUser;
        if (!user) return;


        try {
            const [notesData, prescriptionsData, examsData, evolutionsData, teamData, invitationsData, anamnesisData, mixedAnamnesisData] = await Promise.all([
                getClinicalNotes(patientId),
                getPrescriptions(patientId),
                getExamRequests(patientId),
                getPatientEvolutions(patientId),
                getTeamMembers(patientId),
                getInvitationsByPatient(patientId),
                getAnamneses(patientId),
                getMixedAnamneses(patientId)
            ]);
            setNotes(notesData);
            setPrescriptions(prescriptionsData);
            setExamRequests(examsData);
            setEvolutions(evolutionsData);
            setTeamMembers(teamData);
            setTeamInvitations(invitationsData.filter(inv => inv.status === 'pending'));
            setAnamneses(anamnesisData);
            setMixedAnamneses(mixedAnamnesisData);

            // Check if current user is a team member
            const currentUserId = auth.currentUser?.uid;
            const isMember = teamData.some(member => member.professionalId === currentUserId);
            setIsTeamMember(isMember);

            console.log('[EMR] User is team member:', isMember);
        } catch (error) {
            console.error('Error loading patient data:', error);
        }
    };

    const handleSaveNote = async () => {
        if (!selectedPatientId || !clinicalNote.trim()) return;

        // Check if user is team member before allowing save
        if (!isTeamMember) {
            alert('Você precisa ser membro da equipe deste paciente para adicionar notas clínicas.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            await addClinicalNote({
                patientId: selectedPatientId,
                professionalId: user.uid,
                content: clinicalNote,
                date: new Date().toISOString()
            });

            alert('Evolução clínica salva com sucesso!');
            setClinicalNote('');
            loadPatientData(selectedPatientId);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    // Evolution Handlers
    const handleSaveEvolution = async () => {
        if (!selectedPatientId) return;

        // Check if user is team member
        if (!isTeamMember) {
            alert('Você precisa ser membro da equipe deste paciente para adicionar evoluções.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const { name: professionalName } = getCurrentProfessional();

            await addPatientEvolution({
                patientId: selectedPatientId,
                professionalId: user.uid,
                professionalName,
                date: new Date().toISOString().split('T')[0],
                description: evolutionForm.description,
                soap: evolutionForm.soap,
                metrics: evolutionForm.metrics
            });

            const updatedEvolutions = await getPatientEvolutions(selectedPatientId);
            setEvolutions(updatedEvolutions);

            setEvolutionForm({
                description: '',
                soap: { subjective: '', objective: '', assessment: '', plan: '' },
                metrics: []
            });
            alert('Evolução salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar evolução:', error);
            alert('Erro ao salvar evolução.');
        } finally {
            setLoading(false);
        }
    };

    const addMetric = () => {
        if (newMetric.name && newMetric.value) {
            setEvolutionForm(prev => ({
                ...prev,
                metrics: [...prev.metrics, {
                    name: newMetric.name,
                    value: Number(newMetric.value),
                    unit: newMetric.unit
                }]
            }));
            setNewMetric({ name: '', value: '', unit: '' });
        }
    };

    const removeMetric = (index: number) => {
        setEvolutionForm(prev => ({
            ...prev,
            metrics: prev.metrics.filter((_, i) => i !== index)
        }));
    };

    // Prescription Handlers
    const handleAddMedication = () => {
        setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
    };

    const handleRemoveMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const handleMedicationChange = (index: number, field: keyof MedicationRow, value: string) => {
        const updated = [...medications];
        updated[index][field] = value;
        setMedications(updated);
    };

    const handleSavePrescription = async () => {
        const user = auth.currentUser;
        const patient = selectedPatient;
        if (!user || !patient) return;

        // Check if user is team member
        if (!isTeamMember) {
            alert('Você precisa ser membro da equipe deste paciente para criar prescrições.');
            return;
        }

        const validMeds = medications.filter(m => m.name.trim() && m.dosage.trim());
        if (validMeds.length === 0) {
            alert('Adicione pelo menos um medicamento.');
            return;
        }

        setLoading(true);
        try {
            await addPrescription({
                patientId: patient.id,
                patientName: patient.name,
                professionalId: user.uid,
                professionalName: getCurrentProfessional().name,
                medications: validMeds,
                date: new Date().toISOString().split('T')[0],
                notes: prescriptionNotes
            });

            alert('Receita salva com sucesso!');
            setMedications([{ name: '', dosage: '', frequency: '', duration: '' }]);
            setPrescriptionNotes('');
            loadPatientData(selectedPatientId);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar receita.');
        } finally {
            setLoading(false);
        }
    };

    // Exam Handlers
    const handleToggleExam = (exam: string) => {
        if (selectedExams.includes(exam)) {
            setSelectedExams(selectedExams.filter(e => e !== exam));
        } else {
            setSelectedExams([...selectedExams, exam]);
        }
    };

    const handleAddCustomExam = () => {
        if (customExam.trim()) {
            setSelectedExams([...selectedExams, customExam.trim()]);
            setCustomExam('');
        }
    };

    const handleSaveExamRequest = async () => {
        const user = auth.currentUser;
        const patient = selectedPatient;
        if (!user || !patient) return;

        // Check if user is team member
        if (!isTeamMember) {
            alert('Você precisa ser membro da equipe deste paciente para solicitar exames.');
            return;
        }

        if (selectedExams.length === 0) {
            alert('Selecione pelo menos um exame.');
            return;
        }

        if (!clinicalIndication.trim()) {
            alert('Informe a indicação clínica.');
            return;
        }

        setLoading(true);
        try {
            await addExamRequest({
                patientId: patient.id,
                patientName: patient.name,
                professionalId: user.uid,
                professionalName: getCurrentProfessional().name,
                exams: selectedExams,
                date: new Date().toISOString().split('T')[0],
                clinicalIndication
            });

            alert('Solicitação de exames salva com sucesso!');
            setSelectedExams([]);
            setClinicalIndication('');
            loadPatientData(selectedPatientId);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar solicitação.');
        } finally {
            setLoading(false);
        }
    };

    // Team Handlers
    const handleAddTeamMember = async () => {
        if (!selectedPatientId || !newTeamMember.professionalEmail) {
            alert('Informe o email do profissional.');
            return;
        }

        setLoading(true);
        try {
            // Find professional by email
            const usersRef = collection(db, 'user_profiles');
            const q = query(usersRef, where('email', '==', newTeamMember.professionalEmail.toLowerCase()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                alert('Profissional não encontrado com este email.');
                setLoading(false);
                return;
            }

            const professionalData = snapshot.docs[0].data();
            // Use explicit UID if available (safest), else fall back to doc ID
            const professionalId = professionalData.uid || snapshot.docs[0].id;

            const patient = patients.find(p => p.id === selectedPatientId);
            const currentUser = auth.currentUser;

            if (!patient || !currentUser) return;

            const { name: currentProfessionalName } = getCurrentProfessional();

            // Create invitation
            await createTeamInvitation({
                patientId: selectedPatientId,
                patientName: patient.name,
                invitedProfessionalId: professionalId,
                invitedProfessionalName: professionalData.displayName || professionalData.email,
                invitedProfessionalEmail: professionalData.email,
                invitedBy: currentUser.uid,
                invitedByName: currentProfessionalName,
                specialty: professionalData.jobTitle || 'Profissional de Saúde',
                role: newTeamMember.role || professionalData.jobTitle || 'Profissional',
                status: 'pending',
                type: 'add'
            });

            const updatedInvitations = await getInvitationsByPatient(selectedPatientId);
            setTeamInvitations(updatedInvitations.filter(inv => inv.status === 'pending'));
            setNewTeamMember({ professionalEmail: '', role: '' });
            alert('Convite enviado! Aguardando aprovação do profissional.');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveTeamMember = async (memberId: string) => {
        const member = teamMembers.find(m => m.id === memberId);
        const patient = patients.find(p => p.id === selectedPatientId);
        const currentUser = auth.currentUser;

        if (!member || !patient || !currentUser) return;

        // Check permissions for immediate removal
        const isAssigner = member.assignedBy === currentUser.uid;
        const isOwner = patient.professionalId === currentUser.uid;
        const isManager = (patient as any).managerId === currentUser.uid;
        const isSelf = member.professionalId === currentUser.uid;
        const isSuperAdmin = ['elsoncontador.st@gmail.com', 'usuario020@ercmed.com.br', 'contato@ercmed.com.br', 'eduardocardiologista@gmail.com'].includes(currentUser.email || '');
        // Cast to string to avoid TS error comparing Enum with 'admin' literal
        const userRoleStr = userProfile?.role as unknown as string;
        const isAdminConfig = userRoleStr === 'admin' || userRoleStr === 'admin_master';
        const isClinicManager = userProfile?.isClinicManager === true;

        if (isAssigner || isSelf || isOwner || isManager || isSuperAdmin || isAdminConfig || isClinicManager) {
            if (!confirm('Remover este profissional da equipe imediatamente?')) return;
            setLoading(true);
            try {
                await removeTeamMember(memberId);
                const updatedTeam = await getTeamMembers(selectedPatientId);
                setTeamMembers(updatedTeam);

                if (member.professionalId === currentUser.uid) {
                    setIsTeamMember(false);
                }

                alert('Profissional removido com sucesso.');
            } catch (error) {
                console.error(error);
                alert('Erro ao remover profissional.');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Fallback to invitation flow
        if (!confirm('Enviar solicitação de remoção para este profissional?')) return;
        setLoading(true);
        try {
            const { name: currentProfessionalName } = getCurrentProfessional();

            await createTeamInvitation({
                patientId: selectedPatientId,
                patientName: patient.name,
                invitedProfessionalId: member.professionalId,
                invitedProfessionalName: member.professionalName,
                invitedBy: currentUser.uid,
                invitedByName: currentProfessionalName,
                specialty: member.specialty,
                role: member.role,
                status: 'pending',
                type: 'remove',
                teamMemberId: memberId
            });

            const updatedInvitations = await getInvitationsByPatient(selectedPatientId);
            setTeamInvitations(updatedInvitations.filter(inv => inv.status === 'pending'));
            alert('Solicitação de remoção enviada! Aguardando confirmação do profissional.');
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar solicitação de remoção.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        if (!confirm('Cancelar este convite?')) return;
        setLoading(true);
        try {
            await cancelInvitation(invitationId);
            const updatedInvitations = await getInvitationsByPatient(selectedPatientId);
            setTeamInvitations(updatedInvitations.filter(inv => inv.status === 'pending'));
        } catch (error) {
            console.error(error);
            alert('Erro ao cancelar convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvitation = async (invitationId: string, invitation: TeamInvitation) => {
        setLoading(true);
        try {
            if (invitation.type === 'add') {
                // Add team member
                await addTeamMember({
                    patientId: invitation.patientId,
                    professionalId: invitation.invitedProfessionalId,
                    professionalName: invitation.invitedProfessionalName,
                    specialty: invitation.specialty,
                    role: invitation.role,
                    assignedBy: invitation.invitedBy
                });
            } else if (invitation.type === 'remove' && invitation.teamMemberId) {
                // Remove team member
                await removeTeamMember(invitation.teamMemberId);
            }

            // Update invitation status
            await updateDoc(doc(db, 'team_invitations', invitationId), {
                status: 'accepted',
                respondedAt: serverTimestamp()
            });

            // Reload data
            await loadPatientData(selectedPatientId);
            alert('Convite aceito com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao aceitar convite.');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectInvitation = async (invitationId: string) => {
        if (!confirm('Rejeitar este convite?')) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'team_invitations', invitationId), {
                status: 'rejected',
                respondedAt: serverTimestamp()
            });

            const updatedInvitations = await getInvitationsByPatient(selectedPatientId);
            setTeamInvitations(updatedInvitations.filter(inv => inv.status === 'pending'));
            alert('Convite rejeitado.');
        } catch (error) {
            console.error(error);
            alert('Erro ao rejeitar convite.');
        } finally {
            setLoading(false);
        }
    };

    // ==================== ADVANCED ANAMNESIS LOGIC ====================

    // Automatic IMC Calculation
    useEffect(() => {
        if (!newAnamnesis.vitals) return;
        const weight = parseFloat(newAnamnesis.vitals.weight || '0');
        const height = parseFloat(newAnamnesis.vitals.height || '0');
        if (weight > 0 && height > 0) {
            // Assume height in meters if > 3, else height in cm
            const h = height > 3 ? height / 100 : height;
            const imc = (weight / (h * h)).toFixed(1);
            if (newAnamnesis.vitals.imc !== imc) {
                setNewAnamnesis(prev => ({
                    ...prev,
                    vitals: { ...prev.vitals, imc }
                }));
            }
        }
    }, [newAnamnesis.vitals?.weight, newAnamnesis.vitals?.height]);

    // Pull Vitals from Last Evolution
    const pullLatestVitals = () => {
        if (evolutions.length === 0) {
            alert('Nenhuma evolução anterior encontrada para este paciente.');
            return;
        }
        
        const lastEvo = evolutions[0]; 
        const metrics = lastEvo.metrics || [];
        
        const updatedVitals = { ...(newAnamnesis.vitals || initialAnamnesisState.vitals) };
        
        metrics.forEach(m => {
            const name = (m.name || '').toLowerCase();
            if (name.includes('sist') || name === 'pa s') updatedVitals.bpSistolic = String(m.value);
            if (name.includes('diast') || name === 'pa d') updatedVitals.bpDiastolic = String(m.value);
            if (name.includes('freq') || name === 'fc') updatedVitals.heartRate = String(m.value);
            if (name.includes('resp') || name === 'fr') updatedVitals.respRate = String(m.value);
            if (name.includes('temp')) updatedVitals.temperature = String(m.value);
            if (name.includes('sat')) updatedVitals.saturation = String(m.value);
            if (name === 'peso') updatedVitals.weight = String(m.value);
            if (name === 'altura') updatedVitals.height = String(m.value);
        });

        setNewAnamnesis(prev => ({ ...prev, vitals: updatedVitals }));
        alert('Sinais vitais carregados da última evolução.');
    };

    // Narrative Clinical Text Generator
    const generateHDAText = () => {
        const s = newAnamnesis.hdaStructured;
        if (!s) return;
        if (!s.onset && !s.duration && !s.location) return;

        let text = `Paciente relata quadro de ${newAnamnesis.mainComplaint || 'sintomas'} com início ${s.onset?.toLowerCase() || 'não especificado'} há ${s.duration || 'algum tempo'}. `;
        if (s.location) text += `Acometendo região de ${s.location}. `;
        if (s.quality) text += `Sintoma do tipo ${s.quality}. `;
        if (s.intensity) text += `Relata intensidade ${s.intensity}/10 na escala visual analógica. `;
        if (s.radiation) text += `Com irradiação para ${s.radiation}. `;
        if (s.aggravatingFactors) text += `Fatores de piora: ${s.aggravatingFactors}. `;
        if (s.alleviatingFactors) text += `Fatores de melhora: ${s.alleviatingFactors}. `;
        if (s.associatedSymptoms) text += `Sintomas associados: ${s.associatedSymptoms}. `;
        if (s.context) text += `Contexto de surgimento: ${s.context}. `;
        if (s.pastEpisodes) text += `Histórico de episódios semelhantes: ${s.pastEpisodes}. `;
        if (s.priorMedications) text += `Uso de medicamentos para este quadro: ${s.priorMedications}. `;

        setNewAnamnesis(prev => ({ ...prev, historyOfPresentIllness: text }));
    };

    const generateROSText = () => {
        const r = newAnamnesis.rosStructured;
        if (!r) return;
        let parts = [];
        if (r.general.length > 0) parts.push(`Geral: ${r.general.join(', ')}`);
        if (r.cardiovascular.length > 0) parts.push(`Cardiovascular: ${r.cardiovascular.join(', ')}`);
        if (r.respiratory.length > 0) parts.push(`Respiratório: ${r.respiratory.join(', ')}`);
        if (r.gastrointestinal.length > 0) parts.push(`Gastrointestinal: ${r.gastrointestinal.join(', ')}`);
        if (r.musculoskeletal.length > 0) parts.push(`Musculoesquelético: ${r.musculoskeletal.join(', ')}`);
        if (r.neurological.length > 0) parts.push(`Neurológico: ${r.neurological.join(', ')}`);
        if (r.genitourinary && r.genitourinary.length > 0) parts.push(`Genitourinário: ${r.genitourinary.join(', ')}`);
        if (r.others) parts.push(`Outras observações: ${r.others}`);

        setNewAnamnesis(prev => ({ ...prev, reviewOfSystems: parts.join('; ') || 'Sem alterações significativas nos sistemas revisados.' }));
    };

    const handleEditAnamnesis = (anam: Anamnesis) => {
        setNewAnamnesis({
            mainComplaint: anam.mainComplaint || '',
            hdaStructured: anam.hdaStructured || initialAnamnesisState.hdaStructured,
            historyOfPresentIllness: anam.historyOfPresentIllness || '',
            pastMedicalHistory: anam.pastMedicalHistory || '',
            familyHistory: anam.familyHistory || '',
            socialHistory: anam.socialHistory || '',
            rosStructured: anam.rosStructured || initialAnamnesisState.rosStructured,
            reviewOfSystems: anam.reviewOfSystems || '',
            vitals: anam.vitals || initialAnamnesisState.vitals,
            clinicalEvaluation: anam.clinicalEvaluation || '',
            carePlan: anam.carePlan || ''
        });
        setEditingAnamnesisId(anam.id);
        setIsEditingAnamnesis(true);
        setShowAnamnesisForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Anamnesis Handlers
    const handleDeleteAnamnesis = async (anamnesisId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta anamnese? Esta ação é irreversível.')) return;
        setLoading(true);
        try {
            const success = await deleteAnamnesis(anamnesisId);
            if (success) {
                alert('Anamnese excluída com sucesso.');
                const updated = await getAnamneses(selectedPatientId);
                setAnamneses(updated);
            } else {
                alert('Erro ao excluir anamnese.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir anamnese.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAnamnesis = async () => {
        if (!selectedPatientId) return;
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const { name: professionalName, specialty } = getCurrentProfessional();

            // Debug logging
            console.log('[ANAMNESE] Salvando anamnese com:', {
                professionalName,
                specialty,
                professionalSettings,
                userProfile,
                userDisplayName: user.displayName
            });

            // Ensure we have valid values
            if (!professionalName || professionalName === 'Profissional') {
                alert('Por favor, configure seu nome profissional nas Configurações antes de salvar uma anamnese.');
                setLoading(false);
                return;
            }

            const anamnesisData = {
                patientId: selectedPatientId,
                professionalId: user.uid,
                professionalName,
                specialty,
                date: new Date().toISOString(),
                ...newAnamnesis
            };

            if (isEditingAnamnesis && editingAnamnesisId) {
                await updateAnamnesis(editingAnamnesisId, anamnesisData);
                alert('Anamnese atualizada com sucesso!');
            } else {
                await addAnamnesis(anamnesisData);
                alert('Anamnese salva com sucesso!');
            }

            const updatedAnamneses = await getAnamneses(selectedPatientId);
            setAnamneses(updatedAnamneses);
            setNewAnamnesis(initialAnamnesisState);
            setIsEditingAnamnesis(false);
            setEditingAnamnesisId(null);
            setShowAnamnesisForm(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar anamnese.');
        } finally {
            setLoading(false);
        }
    };

    // Mixed Anamnesis Handlers
    const handleGenerateMixedAnamnesis = async () => {
        if (anamneses.length === 0) {
            alert('É necessário ter pelo menos uma anamnese individual registrada para gerar o resumo.');
            return;
        }

        setIsGeneratingAI(true);
        try {
            const summary = await generateClinicalSummary(anamneses);
            setGeneratedSummary(summary);
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar resumo com IA. Verifique se a chave de API está configurada.');
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSaveMixedAnamnesis = async () => {
        if (!selectedPatientId || !generatedSummary) return;
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const { name: professionalName } = getCurrentProfessional();

            await addMixedAnamnesis({
                patientId: selectedPatientId,
                professionalId: user.uid,
                professionalName,
                date: new Date().toISOString(),
                content: generatedSummary,
                sourceAnamnesesIds: anamneses.map(a => a.id)
            });

            const updatedMixed = await getMixedAnamneses(selectedPatientId);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar Anamnese Mista.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDocument = async () => {
        const user = auth.currentUser;
        const patient = selectedPatient;
        if (!user || !patient) return;

        const { name: professionalName, crm } = getCurrentProfessional();

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo
        let yPosHeader = await addLogoToDoc(doc, professionalSettings?.logoUrl);

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(documentType === 'ATESTADO' ? 'ATESTADO MÉDICO' : 'DECLARAÇÃO DE COMPARECIMENTO', pageWidth / 2, yPosHeader + 5, { align: 'center' });

        // Content
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const date = new Date().toLocaleDateString('pt-BR');
        const time = new Date().toLocaleTimeString('pt-BR');

        let text = '';
        if (documentType === 'ATESTADO') {
            text = `Atesto para os devidos fins que o(a) Sr(a). ${patient.name}, inscrito(a) no CPF sob nº ${patient.cpf || 'N/A'}, foi atendido(a) por mim nesta data, necessitando de ${documentDays} (${documentDays === '1' ? 'um dia' : 'dias'}) de afastamento de suas atividades laborais/escolares a partir desta data.`;
            if (documentCid) {
                text += `\n\nCID: ${documentCid}`;
            }
        } else {
            text = `Declaro para os devidos fins que o(a) Sr(a). ${patient.name}, inscrito(a) no CPF sob nº ${patient.cpf || 'N/A'}, compareceu a este consultório nesta data (${date}) para atendimento médico, no período das ${time}.`;
        }

        const splitText = doc.splitTextToSize(text, pageWidth - 40);
        doc.text(splitText, 20, yPosHeader + 35);

        // Footer
        const yPosFooter = doc.internal.pageSize.getHeight() - 60;
        doc.text(`Local e Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, yPosFooter - 20);

        doc.line(pageWidth / 2 - 40, yPosFooter, pageWidth / 2 + 40, yPosFooter);
        doc.setFontSize(10);
        doc.text(professionalName, pageWidth / 2, yPosFooter + 5, { align: 'center' });
        doc.text(`CRM/Registro: ${crm || '________________'}`, pageWidth / 2, yPosFooter + 10, { align: 'center' });

        doc.save(`${documentType.toLowerCase()}-${patient.name}.pdf`);
        setShowDocumentModal(false);
    };

    const addLogoToDoc = async (doc: jsPDF, logoUrl?: string) => {
        if (!logoUrl) return 30;
        try {
            const img = new Image();
            img.src = logoUrl;
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                setTimeout(reject, 2000); // 2s timeout
            });
            const ratio = img.width / img.height;
            const width = 30;
            const height = width / ratio;
            doc.addImage(img, 'PNG', 20, 10, width, height);
            return 15 + height;
        } catch (e) {
            console.warn('Could not load logo for PDF', e);
            return 30;
        }
    };

    // PDF Generators
    const generateAnamnesisPDF = async (anamnesis: Anamnesis) => {
        const user = auth.currentUser;
        if (!user) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo
        let yPos = await addLogoToDoc(doc, professionalSettings?.logoUrl);

        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('ANAMNESE', pageWidth / 2, yPos - 10, { align: 'center' });

        doc.text(`Paciente: ${selectedPatient?.name || 'N/A'}`, 20, yPos);
        yPos += 7;
        doc.text(`Data: ${new Date(anamnesis.date).toLocaleDateString('pt-BR')}`, 20, yPos);
        yPos += 7;
        doc.text(`Profissional: ${anamnesis.professionalName}`, 20, yPos);
        yPos += 7;
        doc.text(`Especialidade: ${anamnesis.specialty}`, 20, yPos);

        yPos += 15;

        const addSection = (title: string, content: string) => {
            if (content) {
                doc.setFont('helvetica', 'bold');
                doc.text(title, 20, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const splitText = doc.splitTextToSize(content, pageWidth - 40);
                doc.text(splitText, 20, yPos);
                yPos += splitText.length * 5 + 5;

                if (yPos > doc.internal.pageSize.getHeight() - 20) {
                    doc.addPage();
                    yPos = 20;
                }
            }
        };

        addSection('Queixa Principal:', anamnesis.mainComplaint);
        addSection('História da Doença Atual:', anamnesis.historyOfPresentIllness);
        addSection('História Patológica Pregressa:', anamnesis.pastMedicalHistory);
        addSection('História Familiar:', anamnesis.familyHistory);
        addSection('História Social:', anamnesis.socialHistory);
        addSection('Revisão de Sistemas:', anamnesis.reviewOfSystems);

        // Footer
        yPos = doc.internal.pageSize.getHeight() - 40;
        doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(anamnesis.professionalName, pageWidth / 2, yPos, { align: 'center' });

        doc.save(`anamnese-${selectedPatient?.name}-${new Date(anamnesis.date).toLocaleDateString()}.pdf`);
    };

    const generatePrescriptionPDF = async (prescription: Prescription) => {
        const user = auth.currentUser;
        if (!user) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo
        let yPos = await addLogoToDoc(doc, professionalSettings?.logoUrl);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RECEITA MÉDICA', pageWidth / 2, yPos - 10, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Profissional: ${prescription.professionalName}`, 20, yPos);
        yPos += 7;
        doc.text(`Data: ${new Date(prescription.date).toLocaleDateString('pt-BR')}`, 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text(`Paciente: ${prescription.patientName}`, 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Medicamentos:', 20, yPos);
        yPos += 7;

        doc.setFont('helvetica', 'normal');
        prescription.medications.forEach((med, index) => {
            doc.text(`${index + 1}. ${med.name}`, 25, yPos);
            yPos += 5;
            doc.text(`   Dosagem: ${med.dosage}`, 25, yPos);
            yPos += 5;
            doc.text(`   Frequência: ${med.frequency}`, 25, yPos);
            yPos += 5;
            doc.text(`   Duração: ${med.duration}`, 25, yPos);
            yPos += 8;
        });

        if (prescription.notes) {
            yPos += 5;
            doc.setFont('helvetica', 'bold');
            doc.text('Observações:', 20, yPos);
            yPos += 7;
            doc.setFont('helvetica', 'normal');
            doc.text(prescription.notes, 20, yPos, { maxWidth: pageWidth - 40 });
        }

        yPos = doc.internal.pageSize.getHeight() - 40;
        doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(prescription.professionalName, pageWidth / 2, yPos, { align: 'center' });

        doc.save(`receita-${prescription.patientName}-${prescription.date}.pdf`);
    };

    const generateExamRequestPDF = async (request: ExamRequest) => {
        const user = auth.currentUser;
        if (!user) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Logo
        let yPos = await addLogoToDoc(doc, professionalSettings?.logoUrl);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SOLICITAÇÃO DE EXAMES', pageWidth / 2, yPos - 10, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Profissional: ${request.professionalName}`, 20, yPos);
        yPos += 7;
        doc.text(`Data: ${new Date(request.date).toLocaleDateString('pt-BR')}`, 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text(`Paciente: ${request.patientName}`, 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Exames Solicitados:', 20, yPos);
        yPos += 7;

        doc.setFont('helvetica', 'normal');
        request.exams.forEach((exam, index) => {
            doc.text(`${index + 1}. ${exam}`, 25, yPos);
            yPos += 6;
        });

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Indicação Clínica:', 20, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(request.clinicalIndication, 20, yPos, { maxWidth: pageWidth - 40 });

        yPos = doc.internal.pageSize.getHeight() - 40;
        doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(request.professionalName, pageWidth / 2, yPos, { align: 'center' });

        doc.save(`exames-${request.patientName}-${request.date}.pdf`);
    };

    const generateMixedAnamnesisPDF = async (mixed: MixedAnamnesis) => {
        const user = auth.currentUser;
        if (!user) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Logo
        let yPos = await addLogoToDoc(doc, professionalSettings?.logoUrl);

        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SÍNTESE CLÍNICA INTERDISCIPLINAR', pageWidth / 2, yPos - 10, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Patient Info
        doc.text(`Paciente: ${selectedPatient?.name || 'N/A'}`, 20, yPos);
        yPos += 7;
        const dischargeDate = new Date(mixed.date).toLocaleDateString('pt-BR');
        const dischargeTime = new Date(mixed.date).toLocaleTimeString('pt-BR');
        doc.text(`Data: ${dischargeDate} às ${dischargeTime}`, 20, yPos);
        yPos += 7;
        doc.text(`Gerado por: ${mixed.professionalName || 'Profissional'}`, 20, yPos);

        yPos += 15;

        // Content
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo da Situação Clínica:', 20, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(mixed.content, pageWidth - 40);
        doc.text(splitText, 20, yPos);

        // Footer (Signature)
        yPos = pageHeight - 40;
        doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
        yPos += 5;
        doc.setFontSize(10);
        doc.text(mixed.professionalName || 'Profissional Responsável', pageWidth / 2, yPos, { align: 'center' });

        doc.save(`sintese-clinica-${selectedPatient?.name}-${dischargeDate.replace(/\//g, '-')}.pdf`);
    };

    // Simple SVG Chart Component
    const EvolutionChart = ({ data, metricName }: { data: PatientEvolution[], metricName: string }) => {
        const filteredData = data
            .filter(e => e.metrics.some(m => m.name === metricName))
            .map(e => ({
                date: new Date(e.date).toLocaleDateString('pt-BR'),
                value: e.metrics.find(m => m.name === metricName)?.value || 0
            }))
            .reverse();

        if (filteredData.length < 2) return <p className="text-sm text-gray-500">Dados insuficientes para gráfico.</p>;

        const maxValue = Math.max(...filteredData.map(d => d.value));
        const minValue = Math.min(...filteredData.map(d => d.value));
        const range = maxValue - minValue || 1;

        const height = 150;
        const width = 400;
        const padding = 20;

        const getX = (index: number) => padding + (index / (filteredData.length - 1)) * (width - 2 * padding);
        const getY = (value: number) => height - padding - ((value - minValue) / range) * (height - 2 * padding);

        const points = filteredData.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

        return (
            <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">{metricName}</h4>
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-slate-50 rounded border border-slate-200">
                    <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        points={points}
                    />
                    {filteredData.map((d, i) => (
                        <g key={i}>
                            <circle cx={getX(i)} cy={getY(d.value)} r="3" fill="#3b82f6" />
                            <text x={getX(i)} y={getY(d.value) - 5} fontSize="10" textAnchor="middle" fill="#64748b">{d.value}</text>
                            <text x={getX(i)} y={height - 5} fontSize="10" textAnchor="middle" fill="#94a3b8">{d.date}</text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar - Patient List */}
            <div className={`${selectedPatient ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-white border-r border-slate-200 flex-col`}>
                <div className="p-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-teal-600" />
                        Pacientes
                    </h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {patients.map(patient => (
                        <button
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 ${selectedPatientId === patient.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''}`}
                        >
                            <p className="font-semibold text-slate-800">{patient.name}</p>
                            <span className="text-xs text-slate-500">CPF: {patient.cpf || 'N/A'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className={`${!selectedPatient ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
                {selectedPatient ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-8 py-6">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                                <div>
                                    <button
                                        onClick={() => setSelectedPatientId('')}
                                        className="md:hidden flex items-center gap-2 text-slate-500 mb-4 hover:text-slate-700"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Voltar para lista
                                    </button>
                                    <h1 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h1>
                                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500 items-center">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                                            {new Date().getFullYear() - new Date(selectedPatient.birthdate).getFullYear()} anos
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            {clinics.find(c => c.id === selectedPatient.clinicId)?.name || 'Clínica Geral'}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            Equipe: {teamMembers.length} profissionais
                                        </span>
                                        <span>•</span>
                                        <span>CPF: {selectedPatient.cpf || 'Não informado'}</span>
                                        <span>•</span>
                                        <span>Contato: {selectedPatient.phone || 'Não informado'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button
                                        onClick={() => setShowDocumentModal(true)}
                                        className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 font-medium"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Gerar Documento
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                                {[
                                    { id: 'SUMMARY', label: 'Resumo / Notas', icon: FileText },
                                    { id: 'EVOLUTION', label: 'Evolução', icon: Activity },
                                    { id: 'PRESCRIPTION', label: 'Receita', icon: FileSignature },
                                    { id: 'EXAMS', label: 'Exames', icon: Activity },
                                    { id: 'ANAMNESIS', label: 'Anamnese', icon: Stethoscope },
                                    { id: 'MIXED_ANAMNESIS', label: 'Anamnese Mista', icon: GitMerge },
                                    { id: 'TEAM', label: 'Equipe', icon: Users },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-2 transition-colors ${activeTab === tab.id
                                            ? 'bg-teal-50 text-teal-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {activeTab === 'SUMMARY' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Adicionar Nota Clínica</label>
                                        <textarea
                                            value={clinicalNote}
                                            onChange={(e) => setClinicalNote(e.target.value)}
                                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                            rows={3}
                                            placeholder="Digite suas observações..."
                                        />
                                        <div className="flex justify-end mt-3">
                                            <button
                                                onClick={handleSaveNote}
                                                disabled={loading || !clinicalNote.trim()}
                                                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                <Save className="w-4 h-4" />
                                                Salvar Nota
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-slate-800">Histórico</h3>
                                        {notes.length === 0 ? (
                                            <p className="text-center text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-200">
                                                Nenhuma nota registrada.
                                            </p>
                                        ) : (
                                            notes.map(note => (
                                                <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-bold text-slate-700 text-sm">Dr(a). Profissional</span>
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(note.date).toLocaleDateString()} às {new Date(note.date).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'EVOLUTION' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-teal-600" />
                                            Nova Evolução
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-slate-700">Descrição Geral</label>
                                                <textarea
                                                    value={evolutionForm.description}
                                                    onChange={e => setEvolutionForm(prev => ({ ...prev, description: e.target.value }))}
                                                    className="w-full mt-1 p-2 border rounded-lg focus:ring-teal-500 outline-none"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* SOAP Fields */}
                                            {Object.entries(evolutionForm.soap).map(([key, value]) => (
                                                <div key={key}>
                                                    <label className="text-sm font-medium text-slate-700 capitalize">
                                                        {key === 'subjective' ? 'Subjetivo' :
                                                            key === 'objective' ? 'Objetivo' :
                                                                key === 'assessment' ? 'Avaliação' : 'Plano'}
                                                    </label>
                                                    <textarea
                                                        value={value}
                                                        onChange={e => setEvolutionForm(prev => ({
                                                            ...prev,
                                                            soap: { ...prev.soap, [key]: e.target.value }
                                                        }))}
                                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-teal-500 outline-none"
                                                        rows={2}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Metrics Input */}
                                        <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                                            <h4 className="text-sm font-medium text-slate-700 mb-2">Métricas e Sinais Vitais</h4>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    placeholder="Nome (ex: PA Sistólica)"
                                                    value={newMetric.name}
                                                    onChange={e => setNewMetric(prev => ({ ...prev, name: e.target.value }))}
                                                    className="flex-1 p-2 border rounded"
                                                />
                                                <input
                                                    placeholder="Valor (numérico)"
                                                    type="number"
                                                    value={newMetric.value}
                                                    onChange={e => setNewMetric(prev => ({ ...prev, value: e.target.value }))}
                                                    className="w-32 p-2 border rounded"
                                                />
                                                <input
                                                    placeholder="Unid. (mmHg)"
                                                    value={newMetric.unit}
                                                    onChange={e => setNewMetric(prev => ({ ...prev, unit: e.target.value }))}
                                                    className="w-24 p-2 border rounded"
                                                />
                                                <button onClick={addMetric} className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {evolutionForm.metrics.map((m, i) => (
                                                    <div key={i} className="bg-white px-3 py-1 rounded-full border text-sm flex items-center gap-2">
                                                        <span>{m.name}: {m.value} {m.unit}</span>
                                                        <button onClick={() => removeMetric(i)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <button onClick={handleSaveEvolution} disabled={loading} className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium">
                                                Salvar Evolução
                                            </button>
                                        </div>
                                    </div>

                                    {/* Charts & History */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4">Métricas Recentes</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Extract unique metric names */}
                                            {Array.from(new Set(evolutions.flatMap(e => e.metrics.map(m => m.name)))).map(metricName => (
                                                <EvolutionChart key={metricName} data={evolutions} metricName={metricName} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4">Histórico de Evoluções</h3>
                                        {evolutions.map(evo => (
                                            <div key={evo.id} className="border-b last:border-0 py-4">
                                                <div className="flex justify-between">
                                                    <span className="font-bold text-slate-700">{evo.professionalName}</span>
                                                    <span className="text-sm text-slate-500">{new Date(evo.date).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1">{evo.description}</p>
                                                {evo.soap && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs bg-slate-50 p-2 rounded">
                                                        <div><span className="font-bold">S:</span> {evo.soap.subjective}</div>
                                                        <div><span className="font-bold">O:</span> {evo.soap.objective}</div>
                                                        <div><span className="font-bold">A:</span> {evo.soap.assessment}</div>
                                                        <div><span className="font-bold">P:</span> {evo.soap.plan}</div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'PRESCRIPTION' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <FileSignature className="w-5 h-5 text-teal-600" />
                                            Nova Receita
                                        </h3>

                                        <div className="space-y-3 mb-4">
                                            {medications.map((med, idx) => (
                                                <div key={idx} className="flex gap-2 items-start">
                                                    <div className="flex-1 grid grid-cols-4 gap-2">
                                                        <input
                                                            placeholder="Medicamento"
                                                            value={med.name}
                                                            onChange={e => handleMedicationChange(idx, 'name', e.target.value)}
                                                            className="p-2 border rounded"
                                                        />
                                                        <input
                                                            placeholder="Dosagem"
                                                            value={med.dosage}
                                                            onChange={e => handleMedicationChange(idx, 'dosage', e.target.value)}
                                                            className="p-2 border rounded"
                                                        />
                                                        <input
                                                            placeholder="Frequência"
                                                            value={med.frequency}
                                                            onChange={e => handleMedicationChange(idx, 'frequency', e.target.value)}
                                                            className="p-2 border rounded"
                                                        />
                                                        <input
                                                            placeholder="Duração"
                                                            value={med.duration}
                                                            onChange={e => handleMedicationChange(idx, 'duration', e.target.value)}
                                                            className="p-2 border rounded"
                                                        />
                                                    </div>
                                                    {medications.length > 1 && (
                                                        <button onClick={() => handleRemoveMedication(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <button onClick={handleAddMedication} className="text-teal-600 text-sm font-medium flex items-center gap-1 hover:underline mb-4">
                                            <Plus className="w-4 h-4" /> Adicionar Medicamento
                                        </button>

                                        <textarea
                                            placeholder="Observações adicionais..."
                                            value={prescriptionNotes}
                                            onChange={e => setPrescriptionNotes(e.target.value)}
                                            className="w-full p-2 border rounded-lg mb-4"
                                            rows={2}
                                        />

                                        <div className="flex justify-end">
                                            <button onClick={handleSavePrescription} disabled={loading} className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium flex items-center gap-2">
                                                <Save className="w-4 h-4" /> Salvar Receita
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800">Histórico de Receitas</h3>
                                        {prescriptions.map(presc => (
                                            <div key={presc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div className="flex justify-between mb-4">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{presc.professionalName}</p>
                                                        <p className="text-xs text-slate-500">{new Date(presc.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <button onClick={() => generatePrescriptionPDF(presc)} className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg" title="Imprimir Receita">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <ul className="space-y-2 mb-4">
                                                    {presc.medications.map((m, i) => (
                                                        <li key={i} className="text-sm">
                                                            <span className="font-bold">{m.name}</span> - {m.dosage}, {m.frequency} ({m.duration})
                                                        </li>
                                                    ))}
                                                </ul>
                                                {presc.notes && <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded">Obs: {presc.notes}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'EXAMS' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-teal-600" />
                                            Solicitação de Exames
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                            {commonExams.map(exam => (
                                                <label key={exam} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedExams.includes(exam)}
                                                        onChange={() => handleToggleExam(exam)}
                                                        className="rounded text-teal-600 focus:ring-teal-500"
                                                    />
                                                    <span className="text-sm text-slate-700">{exam}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 mb-4">
                                            <input
                                                placeholder="Outro exame..."
                                                value={customExam}
                                                onChange={e => setCustomExam(e.target.value)}
                                                className="flex-1 p-2 border rounded-lg"
                                            />
                                            <button onClick={handleAddCustomExam} className="px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium">Adicionar</button>
                                        </div>

                                        <textarea
                                            placeholder="Indicação Clínica (Obrigatório)"
                                            value={clinicalIndication}
                                            onChange={e => setClinicalIndication(e.target.value)}
                                            className="w-full p-3 border rounded-lg mb-4"
                                            rows={2}
                                        />

                                        <div className="flex justify-end">
                                            <button onClick={handleSaveExamRequest} disabled={loading} className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium flex items-center gap-2">
                                                <Save className="w-4 h-4" /> Salvar Solicitação
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-bold text-slate-800">Histórico de Exames</h3>
                                        {examRequests.map(req => (
                                            <div key={req.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div className="flex justify-between mb-4">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{req.professionalName}</p>
                                                        <p className="text-xs text-slate-500">{new Date(req.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <button onClick={() => generateExamRequestPDF(req)} className="text-teal-600 hover:bg-teal-50 p-2 rounded-lg" title="Imprimir Pedido">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {req.exams.map((exam, i) => (
                                                        <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">{exam}</span>
                                                    ))}
                                                </div>
                                                <p className="text-sm text-slate-600"><span className="font-bold">Indicação:</span> {req.clinicalIndication}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'ANAMNESIS' && (
                                <div className="space-y-6 max-w-5xl mx-auto">
                                    {/* Header (Medical Form Mode) */}
                                    {showAnamnesisForm && (
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                                <Stethoscope className="w-5 h-5 text-teal-600" />
                                                {isEditingAnamnesis ? 'Atualizar Anamnese' : 'Anamnese Médica'}
                                            </h3>
                                            <button
                                                onClick={() => {
                                                    setShowAnamnesisForm(false);
                                                    setIsEditingAnamnesis(false);
                                                    setEditingAnamnesisId(null);
                                                    setNewAnamnesis(initialAnamnesisState);
                                                }}
                                                className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancelar
                                            </button>
                                        </div>
                                    )}

                                    {/* ===== FORM ===== */}
                                    {showAnamnesisForm && (
                                        <div className="space-y-6">
                                            {/* Badge EditMode */}
                                            {isEditingAnamnesis && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-800 text-sm font-medium">
                                                    <Edit3 className="w-4 h-4" />
                                                    Modo de Edição — Atualizando anamnese existente
                                                </div>
                                            )}

                                            {/* ── Section 1: QP ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                                                    <FileText className="w-4 h-4 text-teal-600" />
                                                    Queixa Principal (QP)
                                                </h4>
                                                <textarea
                                                    value={newAnamnesis.mainComplaint}
                                                    onChange={(e) => setNewAnamnesis(prev => ({ ...prev, mainComplaint: e.target.value }))}
                                                    placeholder="Descreva a queixa principal do paciente em suas próprias palavras..."
                                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* ── Section 2: HDA Estruturada ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                                        <Activity className="w-4 h-4 text-teal-600" />
                                                        História da Doença Atual (HDA) — Semiologia
                                                    </h4>
                                                    <button
                                                        onClick={generateHDAText}
                                                        className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                                                        title="Gerar narrativa clínica a partir dos campos estruturados"
                                                    >
                                                        <Wand2 className="w-3.5 h-3.5" />
                                                        Gerar Narrativa
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
                                                        <select
                                                            value={newAnamnesis.hdaStructured.onset}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, onset: e.target.value } }))}
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        >
                                                            <option value="">Selecione...</option>
                                                            <option value="Súbito">Súbito</option>
                                                            <option value="Gradual">Gradual</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Duração / Tempo</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.duration}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, duration: e.target.value } }))}
                                                            placeholder="Ex: 3 dias, 2 semanas..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Localização</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.location}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, location: e.target.value } }))}
                                                            placeholder="Ex: Região epigástrica..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Qualidade / Tipo</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.quality}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, quality: e.target.value } }))}
                                                            placeholder="Ex: Queimação, pontada..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Intensidade (EVA: {newAnamnesis.hdaStructured.intensity}/10)</label>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={10}
                                                            value={newAnamnesis.hdaStructured.intensity}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, intensity: parseInt(e.target.value) } }))}
                                                            className="w-full accent-teal-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Irradiação</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.radiation}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, radiation: e.target.value } }))}
                                                            placeholder="Ex: Membro superior esquerdo..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Fatores de Piora</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.aggravatingFactors}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, aggravatingFactors: e.target.value } }))}
                                                            placeholder="Ex: Alimentação, esforço..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Fatores de Melhora</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.alleviatingFactors}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, alleviatingFactors: e.target.value } }))}
                                                            placeholder="Ex: Repouso, analgésico..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Sintomas Associados</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.associatedSymptoms}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, associatedSymptoms: e.target.value } }))}
                                                            placeholder="Ex: Náuseas, vômitos..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Contexto de Surgimento</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.context}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, context: e.target.value } }))}
                                                            placeholder="Ex: Após estresse emocional..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Episódios Anteriores</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.pastEpisodes}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, pastEpisodes: e.target.value } }))}
                                                            placeholder="Ex: Sim, há 6 meses..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Medicações Prévias p/ Quadro</label>
                                                        <input
                                                            value={newAnamnesis.hdaStructured.priorMedications}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, hdaStructured: { ...prev.hdaStructured, priorMedications: e.target.value } }))}
                                                            placeholder="Ex: Omeprazol 20mg..."
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">Narrativa HDA (texto livre ou gerado)</label>
                                                    <textarea
                                                        value={newAnamnesis.historyOfPresentIllness}
                                                        onChange={(e) => setNewAnamnesis(prev => ({ ...prev, historyOfPresentIllness: e.target.value }))}
                                                        placeholder="Texto narrativo da HDA..."
                                                        className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                        rows={4}
                                                    />
                                                </div>
                                            </div>

                                            {/* ── Section 3: Históricos (HPP, Familiar, Social) ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                                                    <FileText className="w-4 h-4 text-teal-600" />
                                                    Antecedentes
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">História Patológica Pregressa (HPP)</label>
                                                        <textarea
                                                            value={newAnamnesis.pastMedicalHistory}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, pastMedicalHistory: e.target.value }))}
                                                            placeholder="Doenças prévias, cirurgias, internações..."
                                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">História Familiar</label>
                                                        <textarea
                                                            value={newAnamnesis.familyHistory}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, familyHistory: e.target.value }))}
                                                            placeholder="DM, HAS, cardiopatias, neoplasias..."
                                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">História Social</label>
                                                        <textarea
                                                            value={newAnamnesis.socialHistory}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, socialHistory: e.target.value }))}
                                                            placeholder="Tabagismo, etilismo, atividade física..."
                                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Section 4: Revisão de Sistemas (ROS) ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                                        <Activity className="w-4 h-4 text-teal-600" />
                                                        Revisão de Sistemas (ROS)
                                                    </h4>
                                                    <button
                                                        onClick={generateROSText}
                                                        className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                                                    >
                                                        <Wand2 className="w-3.5 h-3.5" />
                                                        Gerar Texto ROS
                                                    </button>
                                                </div>
                                                {(() => {
                                                    const rosOptions: Record<string, { label: string; icon: any; items: string[] }> = {
                                                        general: { label: 'Geral', icon: Thermometer, items: ['Febre', 'Fadiga', 'Perda de peso', 'Sudorese noturna', 'Mal-estar'] },
                                                        cardiovascular: { label: 'Cardiovascular', icon: Heart, items: ['Dor torácica', 'Palpitações', 'Dispneia', 'Edema MMII', 'Síncope'] },
                                                        respiratory: { label: 'Respiratório', icon: Wind, items: ['Tosse', 'Expectoração', 'Hemoptise', 'Sibilância', 'Dispneia'] },
                                                        gastrointestinal: { label: 'Gastrointestinal', icon: Droplets, items: ['Náuseas', 'Vômitos', 'Diarreia', 'Constipação', 'Disfagia', 'Dor abdominal'] },
                                                        musculoskeletal: { label: 'Musculoesquelético', icon: Bone, items: ['Artralgia', 'Mialgia', 'Lombalgia', 'Rigidez matinal', 'Edema articular'] },
                                                        neurological: { label: 'Neurológico', icon: Brain, items: ['Cefaleia', 'Tontura', 'Parestesia', 'Convulsão', 'Tremor', 'Alteração visual'] },
                                                        genitourinary: { label: 'Genitourinário', icon: Droplets, items: ['Disúria', 'Polaciúria', 'Hematúria', 'Urgência miccional', 'Incontinência'] },
                                                    };

                                                    const toggleROS = (system: string, item: string) => {
                                                        setNewAnamnesis(prev => {
                                                            const currentItems = (prev.rosStructured as any)[system] || [];
                                                            const updated = currentItems.includes(item)
                                                                ? currentItems.filter((i: string) => i !== item)
                                                                : [...currentItems, item];
                                                            return { ...prev, rosStructured: { ...prev.rosStructured, [system]: updated } };
                                                        });
                                                    };

                                                    return (
                                                        <div className="space-y-3">
                                                            {Object.entries(rosOptions).map(([key, { label, icon: Icon, items }]) => (
                                                                <div key={key} className="border border-slate-100 rounded-lg p-3">
                                                                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                                                        <Icon className="w-3.5 h-3.5 text-teal-500" />
                                                                        {label}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {items.map(item => {
                                                                            const isChecked = ((newAnamnesis.rosStructured as any)[key] || []).includes(item);
                                                                            return (
                                                                                <button
                                                                                    key={item}
                                                                                    onClick={() => toggleROS(key, item)}
                                                                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${isChecked
                                                                                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                                                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                                        }`}
                                                                                >
                                                                                    {item}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">Outras Observações ROS</label>
                                                                <input
                                                                    value={newAnamnesis.rosStructured.others}
                                                                    onChange={(e) => setNewAnamnesis(prev => ({ ...prev, rosStructured: { ...prev.rosStructured, others: e.target.value } }))}
                                                                    placeholder="Outras queixas não listadas..."
                                                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">Texto Livre ROS</label>
                                                                <textarea
                                                                    value={newAnamnesis.reviewOfSystems}
                                                                    onChange={(e) => setNewAnamnesis(prev => ({ ...prev, reviewOfSystems: e.target.value }))}
                                                                    placeholder="Resumo narrativo da revisão de sistemas..."
                                                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                                    rows={3}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* ── Section 5: Sinais Vitais ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                                                        <Heart className="w-4 h-4 text-red-500" />
                                                        Sinais Vitais
                                                    </h4>
                                                    <button
                                                        onClick={pullLatestVitals}
                                                        className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                                                    >
                                                        <History className="w-3.5 h-3.5" />
                                                        Importar Última Evolução
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">PA Sistólica (mmHg)</label>
                                                        <input value={newAnamnesis.vitals.bpSistolic} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, bpSistolic: e.target.value } }))} placeholder="120" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">PA Diastólica (mmHg)</label>
                                                        <input value={newAnamnesis.vitals.bpDiastolic} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, bpDiastolic: e.target.value } }))} placeholder="80" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">FC (bpm)</label>
                                                        <input value={newAnamnesis.vitals.heartRate} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, heartRate: e.target.value } }))} placeholder="72" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">FR (irpm)</label>
                                                        <input value={newAnamnesis.vitals.respRate} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, respRate: e.target.value } }))} placeholder="18" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Temp. (°C)</label>
                                                        <input value={newAnamnesis.vitals.temperature} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, temperature: e.target.value } }))} placeholder="36.5" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">SpO₂ (%)</label>
                                                        <input value={newAnamnesis.vitals.saturation} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, saturation: e.target.value } }))} placeholder="98" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Peso (kg)</label>
                                                        <input value={newAnamnesis.vitals.weight} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, weight: e.target.value } }))} placeholder="70" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Altura (cm)</label>
                                                        <input value={newAnamnesis.vitals.height} onChange={(e) => setNewAnamnesis(prev => ({ ...prev, vitals: { ...prev.vitals, height: e.target.value } }))} placeholder="170" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 text-center" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">IMC (auto)</label>
                                                        <div className={`w-full p-2.5 border rounded-lg text-sm text-center font-bold ${
                                                            parseFloat(newAnamnesis.vitals.imc) >= 30 ? 'bg-red-50 border-red-300 text-red-700' :
                                                            parseFloat(newAnamnesis.vitals.imc) >= 25 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                                            newAnamnesis.vitals.imc ? 'bg-green-50 border-green-300 text-green-700' :
                                                            'bg-slate-50 border-gray-300 text-slate-400'
                                                        }`}>
                                                            {newAnamnesis.vitals.imc || '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Section 6: Hipóteses e Conduta ── */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-base">
                                                    <Stethoscope className="w-4 h-4 text-teal-600" />
                                                    Avaliação Clínica e Conduta
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Hipóteses Diagnósticas</label>
                                                        <textarea
                                                            value={newAnamnesis.clinicalEvaluation}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, clinicalEvaluation: e.target.value }))}
                                                            placeholder="HD1: ...; HD2: ...; Diagnósticos diferenciais..."
                                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                            rows={4}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-600 mb-1">Conduta / Plano de Cuidado</label>
                                                        <textarea
                                                            value={newAnamnesis.carePlan}
                                                            onChange={(e) => setNewAnamnesis(prev => ({ ...prev, carePlan: e.target.value }))}
                                                            placeholder="Prescrição, exames solicitados, orientações, encaminhamentos..."
                                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                            rows={4}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Save Button ── */}
                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setShowAnamnesisForm(false);
                                                        setIsEditingAnamnesis(false);
                                                        setEditingAnamnesisId(null);
                                                        setNewAnamnesis(initialAnamnesisState);
                                                    }}
                                                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium text-sm transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveAnamnesis}
                                                    disabled={loading}
                                                    className="bg-teal-600 text-white px-6 py-2.5 rounded-lg hover:bg-teal-700 font-medium flex items-center gap-2 text-sm transition-all disabled:opacity-50"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    {isEditingAnamnesis ? 'Atualizar Anamnese' : 'Salvar Anamnese'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ===== HISTORY LIST & SELECTOR ===== */}
                                    {!showAnamnesisForm && selectedPatient && (
                                        <ProfessionalAnamnesisView
                                            patientId={selectedPatient.id}
                                            patientName={selectedPatient.name}
                                            onOpenLegacyMedicalForm={() => {
                                                setNewAnamnesis(initialAnamnesisState);
                                                setIsEditingAnamnesis(false);
                                                setEditingAnamnesisId(null);
                                                setShowAnamnesisForm(true);
                                            }}
                                            onEditLegacyMedicalForm={(a) => {
                                                setNewAnamnesis(a); 
                                                setIsEditingAnamnesis(true); 
                                                setEditingAnamnesisId(a.id); 
                                                setShowAnamnesisForm(true);
                                            }}
                                            onDeleteLegacyMedical={(id) => handleDeleteAnamnesis(id)}
                                            legacyAnamneses={anamneses}
                                        />
                                    )}
                                </div>
                            )}

                            {activeTab === 'MIXED_ANAMNESIS' && (
                                <div className="space-y-6">
                                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 mb-6">
                                        <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2 mb-2">
                                            <GitMerge className="w-5 h-5" />
                                            Anamnese Mista
                                        </h3>
                                        <p className="text-purple-700 text-sm mb-4">
                                            Utilize o recurso para gerar uma Síntese Clínica Interdisciplinar a partir das informações coletadas por todos os profissionais.
                                        </p>

                                        {!generatedSummary ? (
                                            <button
                                                onClick={handleGenerateMixedAnamnesis}
                                                disabled={isGeneratingAI || anamneses.length === 0}
                                                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                {isGeneratingAI ? (
                                                    <>
                                                        <Activity className="w-4 h-4 animate-spin" />
                                                        Gerando Resumo com IA...
                                                    </>
                                                ) : (
                                                    <>
                                                        <GitMerge className="w-4 h-4" />
                                                        Gerar Síntese Clínica Integrada
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
                                                    <label className="block text-sm font-bold text-purple-800 mb-2">Resumo Gerado pela IA:</label>
                                                    <textarea
                                                        value={generatedSummary}
                                                        onChange={(e) => setGeneratedSummary(e.target.value)}
                                                        className="w-full h-64 p-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 leading-relaxed resize-none"
                                                    />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={handleSaveMixedAnamnesis}
                                                        disabled={loading}
                                                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        Salvar no Consultório
                                                    </button>
                                                    <button
                                                        onClick={() => setGeneratedSummary('')}
                                                        className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-300 font-medium"
                                                    >
                                                        Descartar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-slate-400" />
                                            Histórico de Anamneses Mistas
                                        </h4>

                                        {mixedAnamneses.length === 0 ? (
                                            <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                Nenhuma anamnese mista registrada.
                                            </p>
                                        ) : (
                                            mixedAnamneses.map(mixed => (
                                                <div key={mixed.id} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-800">{mixed.professionalName}</h4>
                                                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full mt-1">
                                                                Síntese Integrada
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-sm text-slate-500">
                                                                {new Date(mixed.date).toLocaleDateString()} às {new Date(mixed.date).toLocaleTimeString()}
                                                            </span>
                                                            <button
                                                                onClick={() => generateMixedAnamnesisPDF(mixed)}
                                                                className="text-slate-400 hover:text-teal-600 transition-colors"
                                                                title="Imprimir Síntese"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-medium text-slate-700 mb-2">Resumo da Situação Clínica</h5>
                                                        <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                                                            {mixed.content}
                                                        </p>
                                                    </div>
                                                </div>))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'TEAM' && (
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-teal-600" />
                                            Adicionar Profissional à Equipe
                                        </h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Email do Profissional</label>
                                                <input
                                                    type="email"
                                                    value={newTeamMember.professionalEmail || ''}
                                                    onChange={e => setNewTeamMember(prev => ({ ...prev, professionalEmail: e.target.value }))}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="email@exemplo.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Função</label>
                                                <input
                                                    placeholder="Ex: Fisioterapeuta"
                                                    value={newTeamMember.role}
                                                    onChange={e => setNewTeamMember(prev => ({ ...prev, role: e.target.value }))}
                                                    className="w-full p-2 border rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddTeamMember}
                                            disabled={loading || !newTeamMember.professionalEmail}
                                            className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 w-full"
                                        >
                                            Convidar
                                        </button>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                        <h3 className="font-bold text-slate-800 mb-4">Equipe Atual</h3>
                                        <div className="space-y-4">
                                            {teamMembers.map(member => (
                                                <div key={member.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold">
                                                            {member.professionalName[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{member.professionalName}</p>
                                                            <p className="text-xs text-slate-500">{member.specialty} • {member.role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveTeamMember(member.id)}
                                                        className="text-red-500 hover:text-red-700 text-sm hover:underline"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            ))}
                                            {teamMembers.length === 0 && <p className="text-slate-500 text-sm">Nenhum membro na equipe ainda.</p>}
                                        </div>

                                        {teamInvitations.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-slate-200">
                                                <h3 className="font-bold text-slate-800 mb-4">Convites Pendentes</h3>
                                                <div className="space-y-2">
                                                    {teamInvitations.map(inv => {
                                                        const isForCurrentUser = inv.invitedProfessionalId === auth.currentUser?.uid;

                                                        return (
                                                            <div key={inv.id} className="flex justify-between items-center p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                                                <span className="text-sm text-yellow-800">
                                                                    {isForCurrentUser ? (
                                                                        <>Você foi convidado para <strong>{inv.type === 'add' ? 'entrar na' : 'sair da'}</strong> equipe de <strong>{inv.patientName}</strong></>
                                                                    ) : (
                                                                        <>Convite para <strong>{inv.invitedProfessionalName}</strong> ({inv.type === 'add' ? 'Entrar' : 'Sair'})</>
                                                                    )}
                                                                </span>
                                                                <div className="flex gap-2">
                                                                    {isForCurrentUser ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleAcceptInvitation(inv.id, inv)}
                                                                                className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                                                                            >
                                                                                Aceitar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectInvitation(inv.id)}
                                                                                className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                                                                            >
                                                                                Rejeitar
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleCancelInvitation(inv.id)}
                                                                            disabled={loading}
                                                                            className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-all border border-red-200 shadow-sm disabled:opacity-50"
                                                                            title="Excluir este convite pendente"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
                                                                            Cancelar Convite
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <User className="w-16 h-16 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-slate-500">Selecione um paciente</h3>
                        <p className="text-sm">Escolha um paciente na lista ao lado para acessar o prontuário.</p>
                    </div>
                )}
            </div>

            {/* Document Modal */}
            {showDocumentModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl shadow-xl w-96">
                        <h3 className="font-bold text-lg mb-4">Gerar Documento</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value as any)}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="ATESTADO">Atestado Médico</option>
                                    <option value="DECLARACAO">Declaração de Comparecimento</option>
                                </select>
                            </div>

                            {documentType === 'ATESTADO' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Dias de Afastamento</label>
                                        <input
                                            type="number"
                                            value={documentDays}
                                            onChange={(e) => setDocumentDays(e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CID (Opcional)</label>
                                        <input
                                            value={documentCid}
                                            onChange={(e) => setDocumentCid(e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowDocumentModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                <button onClick={handleGenerateDocument} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">Gerar PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default EMRView;
