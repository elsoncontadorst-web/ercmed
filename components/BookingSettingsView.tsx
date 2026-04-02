import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Save, Copy, Check, Settings, Calendar, Clock } from 'lucide-react';
import { auth } from '../services/firebase';
import { BookingSettings } from '../types/booking';
import { getBookingSettings, saveBookingSettings } from '../services/bookingService';
import { getProfessionalsByOwner } from '../services/repasseService';
import { Professional } from '../types/finance';

const BookingSettingsView: React.FC = () => {
    const [settings, setSettings] = useState<BookingSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const [settingsData, professionalsData] = await Promise.all([
                getBookingSettings(user.uid),
                getProfessionalsByOwner(user.uid)
            ]);
            setSettings(settingsData);
            setProfessionals(professionalsData);
        } catch (error) {
            console.error('Error loading settings:', error);
            alert('Erro ao carregar configurações.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user || !settings) return;

        setSaving(true);
        try {
            await saveBookingSettings(user.uid, settings);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = () => {
        if (!settings) return;

        const baseUrl = `${window.location.origin}/book/${settings.bookingUrl}`;
        const finalUrl = selectedProfessional
            ? `${baseUrl}?professionalId=${selectedProfessional}`
            : baseUrl;

        navigator.clipboard.writeText(finalUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading || !settings) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-20">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-500">Carregando configurações...</p>
                </div>
            </div>
        );
    }

    const baseUrl = `${window.location.origin}/book/${settings.bookingUrl}`;
    const displayUrl = selectedProfessional
        ? `${baseUrl}?professionalId=${selectedProfessional}`
        : baseUrl;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <LinkIcon className="w-6 h-6 text-purple-600" />
                        Agendamento Online
                    </h1>
                    <p className="text-slate-500">Configure o link de agendamento para seus pacientes</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 mb-1">Ativar Agendamento Online</h3>
                        <p className="text-sm text-slate-500">
                            Permita que pacientes agendem consultas através de um link compartilhável
                        </p>
                    </div>
                    <button
                        onClick={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings.isEnabled ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings.isEnabled ? 'translate-x-7' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Booking Link */}
            {settings.isEnabled && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        Seu Link de Agendamento
                    </h3>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-purple-900 mb-2">
                            Link direto para Profissional (Opcional)
                        </label>
                        <select
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-purple-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        >
                            <option value="">Todos os Profissionais (Padrão)</option>
                            {professionals.map(prof => (
                                <option key={prof.id} value={prof.id}>
                                    {prof.name} - {prof.specialty}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={displayUrl}
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border border-purple-300 rounded-lg text-slate-700 font-mono text-sm"
                        />
                        <button
                            onClick={handleCopyLink}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copiar
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-sm text-purple-700 mt-3">
                        Compartilhe este link com seus pacientes para que possam agendar consultas online.
                    </p>
                </div>
            )
            }

            {/* Settings */}
            {
                settings.isEnabled && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-slate-600" />
                            Configurações de Agendamento
                        </h3>

                        {/* Clinic Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nome da Clínica (opcional)
                            </label>
                            <input
                                type="text"
                                value={settings.clinicName || ''}
                                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                                placeholder="Ex: Clínica Saúde & Bem-Estar"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Será exibido na página de agendamento
                            </p>
                        </div>

                        {/* Welcome Message */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Mensagem de Boas-Vindas (opcional)
                            </label>
                            <textarea
                                value={settings.welcomeMessage || ''}
                                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                                rows={3}
                                placeholder="Ex: Bem-vindo! Escolha o profissional e horário de sua preferência."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Slot Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Duração da Consulta
                                </label>
                                <select
                                    value={settings.slotDuration}
                                    onChange={(e) => setSettings({ ...settings, slotDuration: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                    <option value={45}>45 minutos</option>
                                    <option value={60}>60 minutos</option>
                                </select>
                            </div>

                            {/* Buffer Time */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Intervalo entre Consultas
                                </label>
                                <select
                                    value={settings.bufferTime}
                                    onChange={(e) => setSettings({ ...settings, bufferTime: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value={0}>Sem intervalo</option>
                                    <option value={5}>5 minutos</option>
                                    <option value={10}>10 minutos</option>
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                </select>
                            </div>

                            {/* Advance Booking Days */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Agendamento com Antecedência
                                </label>
                                <select
                                    value={settings.advanceBookingDays}
                                    onChange={(e) => setSettings({ ...settings, advanceBookingDays: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value={7}>7 dias</option>
                                    <option value={15}>15 dias</option>
                                    <option value={30}>30 dias</option>
                                    <option value={60}>60 dias</option>
                                    <option value={90}>90 dias</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Quantos dias no futuro os pacientes podem agendar
                                </p>
                            </div>

                            {/* Min Advance Days */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Antecedência Mínima
                                </label>
                                <select
                                    value={settings.minAdvanceDays}
                                    onChange={(e) => setSettings({ ...settings, minAdvanceDays: Number(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value={0}>Mesmo dia</option>
                                    <option value={1}>1 dia</option>
                                    <option value={2}>2 dias</option>
                                    <option value={3}>3 dias</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Dias mínimos de antecedência para agendar
                                </p>
                            </div>

                            {/* Consultation Value */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Valor da Consulta (Opcional)
                                </label>
                                <input
                                    type="number"
                                    value={settings.consultationValue || ''}
                                    onChange={(e) => setSettings({ ...settings, consultationValue: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ex: 150.00"
                                    step="0.01"
                                    min="0"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Será exibido na página de agendamento com a nota "Pagamento na clínica"
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Como Funciona
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Pacientes acessam o link e escolhem o profissional</li>
                    <li>• Selecionam data e horário disponível</li>
                    <li>• Informam nome e telefone para contato</li>
                    <li>• Agendamento aparece em "Meus Atendimentos" com status "Agendado"</li>
                    <li>• Você pode confirmar ou reagendar conforme necessário</li>
                </ul>
            </div>

            {/* Warning if disabled */}
            {
                !settings.isEnabled && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                        <p className="text-slate-600">
                            Ative o agendamento online acima para gerar seu link compartilhável.
                        </p>
                    </div>
                )
            }
        </div >
    );
};

export default BookingSettingsView;
