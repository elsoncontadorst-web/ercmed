import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, Check, ArrowLeft, ArrowRight, Loader } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getBookingByUrl, getAvailableSlots, createOnlineBooking, checkSlotAvailability } from '../services/bookingService';
import { getPublicProfessionalsByOwner } from '../services/repasseService';
import { BookingSettings, BookingSlot, OnlineBookingRequest } from '../types/booking';
import { Professional } from '../types/finance';

type Step = 'professional' | 'date' | 'time' | 'info' | 'confirmation';

const PublicBookingPage: React.FC = () => {
    const { bookingUrl } = useParams<{ bookingUrl: string }>();
    const [searchParams] = useState(new URLSearchParams(window.location.search));
    const preSelectedProfessionalId = searchParams.get('professionalId');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [userId, setUserId] = useState<string>('');
    const [settings, setSettings] = useState<BookingSettings | null>(null);
    const [professionals, setProfessionals] = useState<Partial<Professional>[]>([]);

    const [currentStep, setCurrentStep] = useState<Step>('professional');
    const [selectedProfessional, setSelectedProfessional] = useState<Partial<Professional> | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);

    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientEmail, setPatientEmail] = useState('');
    const [notes, setNotes] = useState('');

    const [confirmationId, setConfirmationId] = useState<string>('');

    useEffect(() => {
        if (bookingUrl) {
            loadBookingData();
        }
    }, [bookingUrl]);

    const loadBookingData = async () => {
        if (!bookingUrl) return;

        setLoading(true);
        setError(null);

        try {
            const bookingData = await getBookingByUrl(bookingUrl);

            if (!bookingData) {
                setError('Link de agendamento inválido ou desativado.');
                return;
            }

            setUserId(bookingData.userId);
            setSettings(bookingData.settings);

            // Load professionals securely using the new method
            const clinicProfs = await getPublicProfessionalsByOwner(bookingData.userId);
            setProfessionals(clinicProfs as Professional[]);

            // Handle Pre-selection
            if (preSelectedProfessionalId) {
                const preSelected = clinicProfs.find(p => p.id === preSelectedProfessionalId);
                if (preSelected) {
                    setSelectedProfessional(preSelected);
                    setCurrentStep('date');
                }
            }

        } catch (err) {
            console.error('Error loading booking data:', err);
            setError('Erro ao carregar dados de agendamento.');
        } finally {
            setLoading(false);
        }
    };

    const generateAvailableDates = (): string[] => {
        if (!settings) return [];

        const dates: string[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + settings.minAdvanceDays);

        for (let i = 0; i < settings.advanceBookingDays; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }

        return dates;
    };

    const handleProfessionalSelect = (prof: Partial<Professional>) => {
        setSelectedProfessional(prof);
        setCurrentStep('date');
    };

    const handleDateSelect = async (date: string) => {
        if (!selectedProfessional) return;

        setSelectedDate(date);
        setLoading(true);

        try {
            const slots = await getAvailableSlots(
                userId,
                selectedProfessional.id,
                selectedProfessional.name,
                selectedProfessional.specialty || '',
                date
            );
            setAvailableSlots(slots);
            setCurrentStep('time');
        } catch (err) {
            console.error('Error loading slots:', err);
            alert('Erro ao carregar horários disponíveis.');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setCurrentStep('info');
    };

    const handleSubmit = async () => {
        if (!selectedProfessional || !selectedDate || !selectedTime) return;

        if (!patientName.trim() || !patientPhone.trim()) {
            alert('Por favor, preencha nome e telefone.');
            return;
        }

        setSubmitting(true);

        try {
            // Double-check availability
            const isAvailable = await checkSlotAvailability(
                userId,
                selectedProfessional.id,
                selectedDate,
                selectedTime
            );

            if (!isAvailable) {
                alert('Desculpe, este horário acabou de ser reservado. Por favor, escolha outro horário.');
                setCurrentStep('time');
                return;
            }

            const request: OnlineBookingRequest = {
                userId,
                professionalId: selectedProfessional.id!,
                professionalName: selectedProfessional.name!,
                patientName: patientName.trim(),
                patientPhone: patientPhone.trim(),
                patientEmail: patientEmail.trim() || undefined,
                date: selectedDate,
                time: selectedTime,
                notes: notes.trim() || undefined
            };

            const appointmentId = await createOnlineBooking(request);
            setConfirmationId(appointmentId);
            setCurrentStep('confirmation');

        } catch (err) {
            console.error('Error creating booking:', err);
            alert('Erro ao criar agendamento. Por favor, tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading && !settings) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-600">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Ops!</h2>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">
                        {settings?.clinicName || 'Agendamento Online'}
                    </h1>
                    {settings?.welcomeMessage && (
                        <p className="text-slate-600">{settings.welcomeMessage}</p>
                    )}
                    {settings?.consultationValue && (
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4 max-w-md mx-auto">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-teal-700 font-medium">Valor da Consulta</p>
                                    <p className="text-2xl font-bold text-teal-900">
                                        R$ {settings.consultationValue.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-teal-600">💳 Pagamento na clínica</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Steps */}
                {currentStep !== 'confirmation' && (
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                        <div className="flex items-center justify-between">
                            {['professional', 'date', 'time', 'info'].map((step, index) => {
                                const stepLabels = {
                                    professional: 'Profissional',
                                    date: 'Data',
                                    time: 'Horário',
                                    info: 'Seus Dados'
                                };
                                const isActive = currentStep === step;
                                const isCompleted = ['professional', 'date', 'time', 'info'].indexOf(currentStep) > index;

                                return (
                                    <div key={step} className="flex items-center flex-1">
                                        <div className="flex flex-col items-center flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isCompleted ? 'bg-purple-600 text-white' :
                                                isActive ? 'bg-purple-100 text-purple-600 border-2 border-purple-600' :
                                                    'bg-gray-200 text-gray-400'
                                                }`}>
                                                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
                                            </div>
                                            <span className={`text-xs mt-1 ${isActive ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                                                {stepLabels[step as keyof typeof stepLabels]}
                                            </span>
                                        </div>
                                        {index < 3 && (
                                            <div className={`h-1 flex-1 ${isCompleted ? 'bg-purple-600' : 'bg-gray-200'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Step 1: Professional Selection */}
                    {currentStep === 'professional' && (
                        <div>
                            {preSelectedProfessionalId && (
                                <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                    Link exclusivo para agendamento com o profissional selecionado.
                                    <button
                                        onClick={() => {
                                            window.history.replaceState({}, '', window.location.pathname);
                                            window.location.reload();
                                        }}
                                        className="ml-2 font-bold underline"
                                    >
                                        Ver todos
                                    </button>
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Escolha o Profissional</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {professionals.map((prof) => (
                                    <button
                                        key={prof.id}
                                        onClick={() => handleProfessionalSelect(prof)}
                                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                                                <User className="w-8 h-8 text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{prof.name}</h3>
                                                <p className="text-sm text-slate-500">{prof.specialty || 'Profissional de Saúde'}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date Selection */}
                    {currentStep === 'date' && (
                        <div>
                            <button
                                onClick={() => setCurrentStep('professional')}
                                className="mb-4 text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Escolha a Data</h2>
                            <p className="text-slate-600 mb-6">
                                Profissional: <strong>{selectedProfessional?.name}</strong>
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {generateAvailableDates().map((date) => (
                                    <button
                                        key={date}
                                        onClick={() => handleDateSelect(date)}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                                    >
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-slate-800">
                                                {new Date(date + 'T00:00:00').getDate()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Time Selection */}
                    {currentStep === 'time' && (
                        <div>
                            <button
                                onClick={() => setCurrentStep('date')}
                                className="mb-4 text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Escolha o Horário</h2>
                            <p className="text-slate-600 mb-6">
                                {formatDate(selectedDate)}
                            </p>

                            {loading ? (
                                <div className="text-center py-10">
                                    <Loader className="w-8 h-8 text-purple-600 mx-auto mb-2 animate-spin" />
                                    <p className="text-slate-500">Carregando horários...</p>
                                </div>
                            ) : availableSlots.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-slate-600">Nenhum horário disponível para esta data.</p>
                                    <button
                                        onClick={() => setCurrentStep('date')}
                                        className="mt-4 text-purple-600 hover:text-purple-700"
                                    >
                                        Escolher outra data
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                    {availableSlots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            onClick={() => handleTimeSelect(slot.time)}
                                            className="p-3 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all font-medium text-slate-700"
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Patient Information */}
                    {currentStep === 'info' && (
                        <div>
                            <button
                                onClick={() => setCurrentStep('time')}
                                className="mb-4 text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Seus Dados</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Nome Completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={patientName}
                                        onChange={(e) => setPatientName(e.target.value)}
                                        placeholder="Digite seu nome completo"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Telefone *
                                    </label>
                                    <input
                                        type="tel"
                                        value={patientPhone}
                                        onChange={(e) => setPatientPhone(e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        E-mail (opcional)
                                    </label>
                                    <input
                                        type="email"
                                        value={patientEmail}
                                        onChange={(e) => setPatientEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Observações (opcional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Motivo da consulta ou informações adicionais..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                                <h3 className="font-bold text-purple-900 mb-2">Resumo do Agendamento</h3>
                                <div className="space-y-1 text-sm text-purple-800">
                                    <p><strong>Profissional:</strong> {selectedProfessional?.name}</p>
                                    <p><strong>Data:</strong> {formatDate(selectedDate)}</p>
                                    <p><strong>Horário:</strong> {selectedTime}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !patientName.trim() || !patientPhone.trim()}
                                className="w-full mt-6 bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        Confirmando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Confirmar Agendamento
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 5: Confirmation */}
                    {currentStep === 'confirmation' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-4">Agendamento Confirmado!</h2>
                            <p className="text-slate-600 mb-8">
                                Seu agendamento foi realizado com sucesso. Você receberá uma confirmação em breve.
                            </p>

                            <div className="bg-gray-50 rounded-xl p-6 max-w-md mx-auto mb-8">
                                <h3 className="font-bold text-slate-800 mb-4">Detalhes do Agendamento</h3>
                                <div className="space-y-3 text-left">
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Profissional</p>
                                            <p className="font-medium text-slate-800">{selectedProfessional?.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Data</p>
                                            <p className="font-medium text-slate-800">{formatDate(selectedDate)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Horário</p>
                                            <p className="font-medium text-slate-800">{selectedTime}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-purple-600 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Contato</p>
                                            <p className="font-medium text-slate-800">{patientPhone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500">
                                Guarde este número de confirmação: <strong className="text-purple-600">{confirmationId.substring(0, 8).toUpperCase()}</strong>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicBookingPage;
