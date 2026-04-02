import React, { useState, useEffect } from 'react';
import { Clock, Save, Calendar, Check, X } from 'lucide-react';
import { auth } from '../services/firebase';
import { ClinicHours, DaySchedule } from '../types/health';
import { getClinicHours, saveClinicHours } from '../services/clinicHoursService';

const ClinicHoursView: React.FC = () => {
    const [clinicHours, setClinicHours] = useState<ClinicHours | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const daysOfWeek: { key: keyof ClinicHours['schedule']; label: string }[] = [
        { key: 'monday', label: 'Segunda-feira' },
        { key: 'tuesday', label: 'Terça-feira' },
        { key: 'wednesday', label: 'Quarta-feira' },
        { key: 'thursday', label: 'Quinta-feira' },
        { key: 'friday', label: 'Sexta-feira' },
        { key: 'saturday', label: 'Sábado' },
        { key: 'sunday', label: 'Domingo' }
    ];

    useEffect(() => {
        loadClinicHours();
    }, []);

    const loadClinicHours = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const hours = await getClinicHours(user.uid);
            setClinicHours(hours);
        } catch (error) {
            console.error('Error loading clinic hours:', error);
            alert('Erro ao carregar horários.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDay = (day: keyof ClinicHours['schedule']) => {
        if (!clinicHours) return;

        setClinicHours({
            ...clinicHours,
            schedule: {
                ...clinicHours.schedule,
                [day]: {
                    ...clinicHours.schedule[day],
                    isOpen: !clinicHours.schedule[day].isOpen
                }
            }
        });
    };

    const handleTimeChange = (
        day: keyof ClinicHours['schedule'],
        period: 'morningShift' | 'afternoonShift' | 'lunchBreak',
        field: 'start' | 'end',
        value: string
    ) => {
        if (!clinicHours) return;

        const daySchedule = clinicHours.schedule[day];
        const updatedPeriod = {
            ...daySchedule[period],
            [field]: value
        };

        setClinicHours({
            ...clinicHours,
            schedule: {
                ...clinicHours.schedule,
                [day]: {
                    ...daySchedule,
                    [period]: updatedPeriod
                }
            }
        });
    };

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user || !clinicHours) return;

        setSaving(true);
        try {
            await saveClinicHours(user.uid, clinicHours);
            alert('Horários salvos com sucesso!');
        } catch (error) {
            console.error('Error saving clinic hours:', error);
            alert('Erro ao salvar horários.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !clinicHours) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-20">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-500">Carregando horários...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-600" />
                        Horários de Funcionamento
                    </h1>
                    <p className="text-slate-500">Configure os dias e horários de atendimento da clínica</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Horários'}
                </button>
            </div>

            {/* Schedule Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase w-48">
                                    Dia da Semana
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase w-32">
                                    Aberto
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                                    Turno da Manhã
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                                    Intervalo de Almoço
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">
                                    Turno da Tarde
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {daysOfWeek.map(({ key, label }) => {
                                const daySchedule = clinicHours.schedule[key];
                                return (
                                    <tr key={key} className={daySchedule.isOpen ? 'bg-white' : 'bg-gray-50'}>
                                        {/* Day Name */}
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-800">{label}</span>
                                        </td>

                                        {/* Open/Closed Toggle */}
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleDay(key)}
                                                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${daySchedule.isOpen
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                    }`}
                                            >
                                                {daySchedule.isOpen ? (
                                                    <Check className="w-6 h-6" />
                                                ) : (
                                                    <X className="w-6 h-6" />
                                                )}
                                            </button>
                                        </td>

                                        {/* Morning Shift */}
                                        <td className="px-6 py-4">
                                            {daySchedule.isOpen && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={daySchedule.morningShift?.start || '08:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'morningShift', 'start', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                    <span className="text-slate-500">às</span>
                                                    <input
                                                        type="time"
                                                        value={daySchedule.morningShift?.end || '12:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'morningShift', 'end', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>
                                            )}
                                        </td>

                                        {/* Lunch Break */}
                                        <td className="px-6 py-4">
                                            {daySchedule.isOpen && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={daySchedule.lunchBreak?.start || '12:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'lunchBreak', 'start', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                    <span className="text-slate-500">às</span>
                                                    <input
                                                        type="time"
                                                        value={daySchedule.lunchBreak?.end || '14:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'lunchBreak', 'end', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>
                                            )}
                                        </td>

                                        {/* Afternoon Shift */}
                                        <td className="px-6 py-4">
                                            {daySchedule.isOpen && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={daySchedule.afternoonShift?.start || '14:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'afternoonShift', 'start', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                    <span className="text-slate-500">às</span>
                                                    <input
                                                        type="time"
                                                        value={daySchedule.afternoonShift?.end || '18:00'}
                                                        onChange={(e) =>
                                                            handleTimeChange(key, 'afternoonShift', 'end', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Resumo da Semana
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daysOfWeek.map(({ key, label }) => {
                        const daySchedule = clinicHours.schedule[key];
                        return (
                            <div
                                key={key}
                                className={`p-3 rounded-lg ${daySchedule.isOpen ? 'bg-white border border-blue-200' : 'bg-gray-100'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800 text-sm">{label}</span>
                                    {daySchedule.isOpen ? (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                            Aberto
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
                                            Fechado
                                        </span>
                                    )}
                                </div>
                                {daySchedule.isOpen && (
                                    <div className="space-y-1 text-xs text-slate-600">
                                        <p>
                                            Manhã: {daySchedule.morningShift?.start} - {daySchedule.morningShift?.end}
                                        </p>
                                        <p>
                                            Almoço: {daySchedule.lunchBreak?.start} - {daySchedule.lunchBreak?.end}
                                        </p>
                                        <p>
                                            Tarde: {daySchedule.afternoonShift?.start} - {daySchedule.afternoonShift?.end}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Help Text */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-slate-600">
                    <strong>Dica:</strong> Configure os horários de funcionamento da sua clínica para cada dia da semana.
                    Você pode definir turnos da manhã e tarde, além do intervalo de almoço. Dias marcados como fechados
                    não aparecerão disponíveis para agendamento de consultas.
                </p>
            </div>
        </div>
    );
};

export default ClinicHoursView;
