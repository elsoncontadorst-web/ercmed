import React, { useState, useEffect, useRef } from 'react';
import { Heart, Calendar, DollarSign, TrendingDown, TrendingUp, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { auth } from '../services/firebase';
import { setupUpcomingAppointmentsListener } from '../services/appointmentListeners';
import { useNotifications } from '../contexts/NotificationContext';
import { Appointment } from '../types/health';
import { getAllBillingRecords } from '../services/repasseService';
import { ConsultationBilling } from '../types/finance';

interface FinancialSummary {
    receitas: number;
    despesas: number;
    faturamentoLiquido: number;
    saldo: number;
}

const HealthDashboard: React.FC = () => {
    const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
    const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
        receitas: 0,
        despesas: 0,
        faturamentoLiquido: 0,
        saldo: 0
    });
    const [loading, setLoading] = useState(true);
    const [showAllAppointments, setShowAllAppointments] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const listenerSetupRef = useRef(false);
    const previousAppointmentsRef = useRef<Appointment[]>([]);
    const { addNotification } = useNotifications();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user || listenerSetupRef.current) return;

        listenerSetupRef.current = true;
        setLoading(true);

        // Setup real-time listener for appointments
        const unsubscribeAppointments = setupUpcomingAppointmentsListener(
            (appointments) => {
                // Detect new appointments
                if (previousAppointmentsRef.current.length > 0) {
                    const newAppointments = appointments.filter(
                        apt => !previousAppointmentsRef.current.find(prev => prev.id === apt.id)
                    );

                    // Notify about new appointments
                    newAppointments.forEach(apt => {
                        addNotification(
                            'info',
                            'Novo Agendamento',
                            `${apt.patientName || 'Paciente'} com ${apt.professionalName} em ${formatDate(apt.date)} às ${apt.time}`
                        );
                    });
                }

                previousAppointmentsRef.current = appointments;
                setUpcomingAppointments(appointments);
                setLoading(false);
            },
            (error) => {
                console.error('Erro no listener de agendamentos:', error);
                setLoading(false);
            }
        );

        // Load financial data
        loadFinancialData();

        // Cleanup listener on unmount
        return () => {
            unsubscribeAppointments();
            listenerSetupRef.current = false;
        };
    }, []);

    const loadFinancialData = async () => {
        try {
            const billingRecords = await getAllBillingRecords();

            // Calculate financial metrics
            const receitas = billingRecords.reduce((sum, record) => sum + (record.grossAmount || 0), 0);
            const despesas = billingRecords.reduce((sum, record) => {
                // Calculate deductions from available fields
                const taxAmount = record.taxAmount || 0;
                // Note: roomRental is in Professional config, not in billing record
                // For now, we'll just use taxAmount as the main deduction
                return sum + taxAmount;
            }, 0);
            const faturamentoLiquido = receitas - despesas;

            setFinancialSummary({
                receitas,
                despesas,
                faturamentoLiquido,
                saldo: faturamentoLiquido // For now, saldo = faturamento líquido
            });
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatTime = (timeStr: string) => {
        return timeStr;
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return upcomingAppointments.filter(apt => apt.date === dateStr);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Heart className="w-8 h-8 text-brand-600" />
                            Dashboard Geral
                        </h1>
                        <p className="text-slate-600 mt-1">Visão geral de consultas e finanças</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Próximas Consultas */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Próximas Consultas</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{upcomingAppointments.length}</p>
                            </div>
                            <Calendar className="w-12 h-12 text-blue-500 opacity-20" />
                        </div>
                    </div>

                    {/* Receitas */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-700 font-medium">Receitas</p>
                                <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(financialSummary.receitas)}</p>
                            </div>
                            <DollarSign className="w-12 h-12 text-green-500 opacity-30" />
                        </div>
                    </div>

                    {/* Despesas */}
                    <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-700 font-medium">Despesas</p>
                                <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(financialSummary.despesas)}</p>
                            </div>
                            <TrendingDown className="w-12 h-12 text-red-500 opacity-30" />
                        </div>
                    </div>

                    {/* Faturamento Líquido */}
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-700 font-medium">Saldo</p>
                                <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(financialSummary.saldo)}</p>
                            </div>
                            <Wallet className="w-12 h-12 text-purple-500 opacity-30" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900 capitalize">{monthName}</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigateMonth('prev')}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <button
                                    onClick={() => navigateMonth('next')}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {/* Day Headers */}
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-600 py-2">
                                    {day}
                                </div>
                            ))}

                            {/* Empty cells for days before month starts */}
                            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square"></div>
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(year, month, day);
                                const appointments = getAppointmentsForDate(date);
                                const isToday = new Date().toDateString() === date.toDateString();

                                return (
                                    <div
                                        key={day}
                                        className={`aspect-square p-1 rounded-lg border transition-all ${isToday
                                            ? 'bg-brand-100 border-brand-500 font-bold'
                                            : appointments.length > 0
                                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                                : 'border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="text-sm text-slate-700 text-center">{day}</div>
                                        {appointments.length > 0 && (
                                            <div className="flex justify-center mt-1">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upcoming Appointments - Takes 1 column */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-blue-500" />
                                Consultas Pendentes
                            </h2>
                        </div>

                        {upcomingAppointments.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Nenhuma consulta agendada</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {upcomingAppointments
                                        .slice(0, showAllAppointments ? undefined : 10)
                                        .map((appointment) => (
                                            <div
                                                key={appointment.id}
                                                className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100 hover:shadow-md transition-all"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-bold text-slate-900 text-sm">{appointment.patientName || 'Paciente'}</p>
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                                        {formatDate(appointment.date)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-1">{appointment.professionalName}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-700">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatTime(appointment.time)}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {upcomingAppointments.length > 10 && (
                                    <button
                                        onClick={() => setShowAllAppointments(!showAllAppointments)}
                                        className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {showAllAppointments
                                            ? 'Ver menos'
                                            : `Ver todos (${upcomingAppointments.length})`
                                        }
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HealthDashboard;
