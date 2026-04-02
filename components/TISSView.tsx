import React, { useState, useEffect } from 'react';
import { Building2, FileText, Package, AlertTriangle, Table, Plus, Download, X, Save, Search, Edit2, Printer } from 'lucide-react';
import { auth } from '../services/firebase';
import { generateTissGuidePdf } from '../utils/tissPdfGenerator';
import {
    addHealthInsurance,
    getHealthInsurances,
    updateHealthInsurance,
    addTissTable,
    getTissTables,
    addTissGuide,
    getTissGuides,
    updateTissGuide,
    addTissBatch,
    getTissBatches,
    updateTissBatch,
    addTissGlosa,
    getTissGlosas,
    updateTissGlosa,
    generateTissXml
} from '../services/tissService';
import { getAllPatients } from '../services/healthService';
import { getAllProfessionals } from '../services/repasseService';
import { HealthInsurance, TissTable, TissGuide, TissBatch, TissGlosa, TissProcedure, TissGuideProcedure } from '../types/tiss';
import { Patient } from '../types/health';
import { Professional } from '../types/finance';
import { formatCNPJ, formatPhone, formatCurrency } from '../utils/formatters';

const TISSView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'CONVENIOS' | 'TABELAS' | 'GUIAS' | 'LOTES' | 'GLOSAS'>('CONVENIOS');
    const [loading, setLoading] = useState(false);

    // Data States
    const [insurances, setInsurances] = useState<HealthInsurance[]>([]);
    const [tables, setTables] = useState<TissTable[]>([]);
    const [guides, setGuides] = useState<TissGuide[]>([]);
    const [batches, setBatches] = useState<TissBatch[]>([]);
    const [glosas, setGlosas] = useState<TissGlosa[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);

    // Modal States
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [showGlosaModal, setShowGlosaModal] = useState(false);
    const [editingInsurance, setEditingInsurance] = useState<HealthInsurance | null>(null);

    // Form States
    const [newInsurance, setNewInsurance] = useState({
        name: '',
        cnpj: '',
        registrationCode: '',
        contactPhone: '',
        contactEmail: '',
        active: true
    });

    const [newTable, setNewTable] = useState({
        insuranceId: '',
        tableName: '',
        version: '',
        procedures: [] as TissProcedure[],
        active: true
    });

    const [newProcedure, setNewProcedure] = useState({
        code: '',
        description: '',
        price: ''
    });

    const [newGuide, setNewGuide] = useState({
        guideType: 'CONSULTA' as const,
        insuranceId: '',
        patientId: '',
        patientCardNumber: '',
        professionalId: '',
        professionalCrm: '',
        serviceDate: new Date().toISOString().split('T')[0],
        procedures: [] as TissGuideProcedure[],
        observations: ''
    });

    const [newGuideProcedure, setNewGuideProcedure] = useState({
        code: '',
        description: '',
        quantity: '1',
        unitPrice: ''
    });

    const [selectedBatchInsurance, setSelectedBatchInsurance] = useState('');
    const [selectedGuides, setSelectedGuides] = useState<string[]>([]);

    const [newGlosa, setNewGlosa] = useState({
        guideId: '',
        procedureCode: '',
        procedureDescription: '',
        glosaType: 'TOTAL' as const,
        originalValue: '',
        glosedValue: '',
        glosaReason: '',
        glosaDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const [insurancesData, tablesData, guidesData, batchesData, glosasData, patientsData, professionalsData] = await Promise.all([
            getHealthInsurances(user.uid),
            getTissTables(user.uid),
            getTissGuides(user.uid),
            getTissBatches(user.uid),
            getTissGlosas(user.uid),
            getAllPatients(),
            getAllProfessionals()
        ]);
        setInsurances(insurancesData);
        setTables(tablesData);
        setGuides(guidesData);
        setBatches(batchesData);
        setGlosas(glosasData);
        setPatients(patientsData);
        setProfessionals(professionalsData);
    };

    // Insurance Handlers
    const handleSaveInsurance = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Usuário não autenticado');
                setLoading(false);
                return;
            }

            if (editingInsurance) {
                // Update existing insurance
                await updateHealthInsurance(editingInsurance.id, newInsurance);
                alert('Convênio atualizado com sucesso!');
            } else {
                // Add new insurance
                await addHealthInsurance(user.uid, newInsurance);
                alert('Convênio cadastrado com sucesso!');
            }

            setShowInsuranceModal(false);
            setNewInsurance({ name: '', cnpj: '', registrationCode: '', contactPhone: '', contactEmail: '', active: true });
            setEditingInsurance(null);
            loadData();
        } catch (error) {
            alert('Erro ao salvar convênio.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditInsurance = (insurance: HealthInsurance) => {
        setEditingInsurance(insurance);
        setNewInsurance({
            name: insurance.name,
            cnpj: insurance.cnpj,
            registrationCode: insurance.registrationCode,
            contactPhone: insurance.contactPhone || '',
            contactEmail: insurance.contactEmail || '',
            active: insurance.active
        });
        setShowInsuranceModal(true);
    };

    // Table Handlers
    const handleAddProcedureToTable = () => {
        if (newProcedure.code && newProcedure.description && newProcedure.price) {
            setNewTable(prev => ({
                ...prev,
                procedures: [...prev.procedures, {
                    code: newProcedure.code,
                    description: newProcedure.description,
                    price: parseFloat(newProcedure.price)
                }]
            }));
            setNewProcedure({ code: '', description: '', price: '' });
        }
    };

    const handleSaveTable = async () => {
        if (!newTable.insuranceId || !newTable.tableName || newTable.procedures.length === 0) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Usuário não autenticado');
                setLoading(false);
                return;
            }
            const insurance = insurances.find(i => i.id === newTable.insuranceId);
            await addTissTable(user.uid, {
                ...newTable,
                insuranceName: insurance?.name || ''
            });
            alert('Tabela cadastrada com sucesso!');
            setShowTableModal(false);
            setNewTable({ insuranceId: '', tableName: '', version: '', procedures: [], active: true });
            loadData();
        } catch (error) {
            alert('Erro ao cadastrar tabela.');
        } finally {
            setLoading(false);
        }
    };

    // Guide Handlers
    const handleAddProcedureToGuide = () => {
        if (newGuideProcedure.code && newGuideProcedure.description && newGuideProcedure.quantity && newGuideProcedure.unitPrice) {
            const quantity = parseInt(newGuideProcedure.quantity);
            const unitPrice = parseFloat(newGuideProcedure.unitPrice);
            setNewGuide(prev => ({
                ...prev,
                procedures: [...prev.procedures, {
                    code: newGuideProcedure.code,
                    description: newGuideProcedure.description,
                    quantity,
                    unitPrice,
                    totalPrice: quantity * unitPrice
                }]
            }));
            setNewGuideProcedure({ code: '', description: '', quantity: '1', unitPrice: '' });
        }
    };

    const handleSaveGuide = async () => {
        if (!newGuide.insuranceId || !newGuide.patientId || !newGuide.professionalId || newGuide.procedures.length === 0) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        setLoading(true);
        try {
            const insurance = insurances.find(i => i.id === newGuide.insuranceId);
            const patient = patients.find(p => p.id === newGuide.patientId);
            const professional = professionals.find(p => p.id === newGuide.professionalId);

            const totalValue = newGuide.procedures.reduce((sum, proc) => sum + proc.totalPrice, 0);
            const guideNumber = `G${Date.now()}`;

            await addTissGuide({
                guideNumber,
                guideType: newGuide.guideType,
                insuranceId: newGuide.insuranceId,
                insuranceName: insurance?.name || '',
                patientId: newGuide.patientId,
                patientName: patient?.name || '',
                patientCardNumber: newGuide.patientCardNumber,
                professionalId: newGuide.professionalId,
                professionalName: professional?.name || '',
                professionalCrm: newGuide.professionalCrm,
                serviceDate: newGuide.serviceDate,
                procedures: newGuide.procedures,
                totalValue,
                status: 'PENDENTE',
                observations: newGuide.observations
            });
            alert('Guia emitida com sucesso!');
            setShowGuideModal(false);
            setNewGuide({
                guideType: 'CONSULTA',
                insuranceId: '',
                patientId: '',
                patientCardNumber: '',
                professionalId: '',
                professionalCrm: '',
                serviceDate: new Date().toISOString().split('T')[0],
                procedures: [],
                observations: ''
            });
            loadData();
        } catch (error) {
            alert('Erro ao emitir guia.');
        } finally {
            setLoading(false);
        }
    };

    // Batch Handlers
    const handleCreateBatch = async () => {
        if (!selectedBatchInsurance || selectedGuides.length === 0) {
            alert('Selecione um convênio e pelo menos uma guia.');
            return;
        }
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Usuário não autenticado');
                setLoading(false);
                return;
            }
            const insurance = insurances.find(i => i.id === selectedBatchInsurance);
            const batchGuides = guides.filter(g => selectedGuides.includes(g.id));
            const totalValue = batchGuides.reduce((sum, g) => sum + g.totalValue, 0);
            const batchNumber = `L${Date.now()}`;

            const batchId = await addTissBatch({
                professionalId: user.uid,
                batchNumber,
                insuranceId: selectedBatchInsurance,
                insuranceName: insurance?.name || '',
                guideIds: selectedGuides,
                guideCount: selectedGuides.length,
                totalValue,
                status: 'ABERTO',
                xmlGenerated: false
            });

            // Update guides to link to batch
            for (const guideId of selectedGuides) {
                await updateTissGuide(guideId, { batchId, status: 'EM_LOTE' });
            }

            alert('Lote criado com sucesso!');
            setSelectedGuides([]);
            setSelectedBatchInsurance('');
            setShowBatchModal(false);
            loadData();
        } catch (error) {
            alert('Erro ao criar lote.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateXml = async (batch: TissBatch) => {
        setLoading(true);
        try {
            const batchGuides = guides.filter(g => batch.guideIds.includes(g.id));
            const xml = generateTissXml(batch, batchGuides);

            // Download XML
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lote-${batch.batchNumber}.xml`;
            a.click();
            URL.revokeObjectURL(url);

            // Update batch
            await updateTissBatch(batch.id, { xmlGenerated: true, status: 'FECHADO', closedAt: new Date().toISOString() });
            alert('XML gerado com sucesso!');
            loadData();
        } catch (error) {
            alert('Erro ao gerar XML.');
        } finally {
            setLoading(false);
        }
    };

    // Glosa Handlers
    const handleSaveGlosa = async () => {
        if (!newGlosa.guideId || !newGlosa.glosaReason) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert('Usuário não autenticado');
                setLoading(false);
                return;
            }
            const guide = guides.find(g => g.id === newGlosa.guideId);
            if (!guide) return;

            await addTissGlosa({
                professionalId: user.uid,
                guideId: newGlosa.guideId,
                guideNumber: guide.guideNumber,
                batchId: guide.batchId,
                insuranceId: guide.insuranceId,
                insuranceName: guide.insuranceName,
                procedureCode: newGlosa.procedureCode,
                procedureDescription: newGlosa.procedureDescription,
                glosaType: newGlosa.glosaType,
                originalValue: parseFloat(newGlosa.originalValue),
                glosedValue: parseFloat(newGlosa.glosedValue),
                glosaReason: newGlosa.glosaReason,
                glosaDate: newGlosa.glosaDate,
                status: 'PENDENTE'
            });

            // Update guide status
            await updateTissGuide(newGlosa.guideId, { status: 'GLOSADO' });

            alert('Glosa registrada com sucesso!');
            setShowGlosaModal(false);
            setNewGlosa({
                guideId: '',
                procedureCode: '',
                procedureDescription: '',
                glosaType: 'TOTAL',
                originalValue: '',
                glosedValue: '',
                glosaReason: '',
                glosaDate: new Date().toISOString().split('T')[0]
            });
            loadData();
        } catch (error) {
            alert('Erro ao registrar glosa.');
        } finally {
            setLoading(false);
        }
    };

    const pendingGuides = guides.filter(g => g.status === 'PENDENTE' && g.insuranceId === selectedBatchInsurance);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-brand-600" />
                        Faturamento TISS
                    </h1>
                    <p className="text-slate-500">Gestão de convênios e faturamento</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('CONVENIOS')}
                    className={`px-4 py-2 font-medium ${activeTab === 'CONVENIOS' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Convênios
                </button>
                <button
                    onClick={() => setActiveTab('TABELAS')}
                    className={`px-4 py-2 font-medium ${activeTab === 'TABELAS' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <Table className="w-4 h-4 inline mr-2" />
                    Tabelas
                </button>
                <button
                    onClick={() => setActiveTab('GUIAS')}
                    className={`px-4 py-2 font-medium ${activeTab === 'GUIAS' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Guias
                </button>
                <button
                    onClick={() => setActiveTab('LOTES')}
                    className={`px-4 py-2 font-medium ${activeTab === 'LOTES' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <Package className="w-4 h-4 inline mr-2" />
                    Lotes
                </button>
                <button
                    onClick={() => setActiveTab('GLOSAS')}
                    className={`px-4 py-2 font-medium ${activeTab === 'GLOSAS' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-600'}`}
                >
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Glosas
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'CONVENIOS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Convênios Cadastrados</h2>
                            <button
                                onClick={() => { setEditingInsurance(null); setShowInsuranceModal(true); }}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Novo Convênio
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {insurances.map(insurance => (
                                <div key={insurance.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 relative">
                                    <button
                                        onClick={() => handleEditInsurance(insurance)}
                                        className="absolute top-3 right-3 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar convênio"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-slate-800 pr-10">{insurance.name}</h3>
                                    <p className="text-sm text-slate-600">CNPJ: {formatCNPJ(insurance.cnpj)}</p>
                                    <p className="text-sm text-slate-600">Registro ANS: {insurance.registrationCode}</p>
                                    {insurance.contactPhone && <p className="text-sm text-slate-600">Tel: {formatPhone(insurance.contactPhone)}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'TABELAS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Tabelas de Preços</h2>
                            <button
                                onClick={() => setShowTableModal(true)}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Tabela
                            </button>
                        </div>
                        <div className="space-y-4">
                            {tables.map(table => (
                                <div key={table.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{table.tableName}</h3>
                                            <p className="text-sm text-slate-600">{table.insuranceName}</p>
                                            {table.version && <p className="text-xs text-slate-500">Versão: {table.version}</p>}
                                        </div>
                                        <span className="text-sm font-medium text-blue-600">{table.procedures.length} procedimentos</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'GUIAS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Guias Emitidas</h2>
                            <button
                                onClick={() => setShowGuideModal(true)}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Guia
                            </button>
                        </div>
                        <div className="space-y-3">
                            {guides.map(guide => (
                                <div key={guide.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800">Guia #{guide.guideNumber}</h3>
                                            <p className="text-sm text-slate-600">{guide.patientName} - {guide.insuranceName}</p>
                                            <p className="text-sm text-slate-600">Profissional: {guide.professionalName}</p>
                                            <p className="text-xs text-slate-500">{new Date(guide.serviceDate).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">R$ {guide.totalValue.toFixed(2)}</p>
                                            <span className={`text-xs px-2 py-1 rounded ${guide.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                                guide.status === 'EM_LOTE' ? 'bg-blue-100 text-blue-700' :
                                                    guide.status === 'PAGO' ? 'bg-green-100 text-green-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {guide.status}
                                            </span>
                                            <button
                                                onClick={() => generateTissGuidePdf(guide)}
                                                className="ml-2 text-slate-500 hover:text-brand-600"
                                                title="Imprimir Guia (PDF)"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'LOTES' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Lotes de Faturamento</h2>
                            <button
                                onClick={() => setShowBatchModal(true)}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Novo Lote
                            </button>
                        </div>
                        <div className="space-y-3">
                            {batches.map(batch => (
                                <div key={batch.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800">Lote #{batch.batchNumber}</h3>
                                            <p className="text-sm text-slate-600">{batch.insuranceName}</p>
                                            <p className="text-sm text-slate-600">{batch.guideCount} guias</p>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <p className="text-lg font-bold text-green-600">R$ {batch.totalValue.toFixed(2)}</p>
                                            <span className={`text-xs px-2 py-1 rounded ${batch.status === 'ABERTO' ? 'bg-yellow-100 text-yellow-700' :
                                                batch.status === 'FECHADO' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {batch.status}
                                            </span>
                                            {batch.status === 'ABERTO' && (
                                                <button
                                                    onClick={() => handleGenerateXml(batch)}
                                                    disabled={loading}
                                                    className="block w-full bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Gerar XML
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'GLOSAS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Glosas Registradas</h2>
                            <button
                                onClick={() => setShowGlosaModal(true)}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Glosa
                            </button>
                        </div>
                        <div className="space-y-3">
                            {glosas.map(glosa => (
                                <div key={glosa.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800">Guia #{glosa.guideNumber}</h3>
                                            <p className="text-sm text-slate-600">{glosa.insuranceName}</p>
                                            <p className="text-sm text-slate-600">Procedimento: {glosa.procedureDescription}</p>
                                            <p className="text-sm text-red-600 font-medium mt-1">Motivo: {glosa.glosaReason}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-600">Original: R$ {glosa.originalValue.toFixed(2)}</p>
                                            <p className="text-lg font-bold text-red-600">Glosado: R$ {glosa.glosedValue.toFixed(2)}</p>
                                            <span className={`text-xs px-2 py-1 rounded ${glosa.status === 'PENDENTE' ? 'bg-yellow-100 text-yellow-700' :
                                                glosa.status === 'DEFERIDO' ? 'bg-green-100 text-green-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {glosa.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Insurance Modal */}
            {showInsuranceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">
                            {editingInsurance ? 'Editar Convênio' : 'Novo Convênio'}
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Nome do Convênio"
                                value={newInsurance.name}
                                onChange={(e) => setNewInsurance({ ...newInsurance, name: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="CNPJ (00.000.000/0000-00)"
                                value={formatCNPJ(newInsurance.cnpj)}
                                onChange={(e) => setNewInsurance({ ...newInsurance, cnpj: e.target.value.replace(/\D/g, '') })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                maxLength={18}
                            />
                            <input
                                type="text"
                                placeholder="Código de Registro ANS"
                                value={newInsurance.registrationCode}
                                onChange={(e) => setNewInsurance({ ...newInsurance, registrationCode: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Telefone (Opcional)"
                                value={formatPhone(newInsurance.contactPhone)}
                                onChange={(e) => setNewInsurance({ ...newInsurance, contactPhone: e.target.value.replace(/\D/g, '') })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                maxLength={15}
                            />
                            <input
                                type="email"
                                placeholder="E-mail (Opcional)"
                                value={newInsurance.contactEmail}
                                onChange={(e) => setNewInsurance({ ...newInsurance, contactEmail: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowInsuranceModal(false); setEditingInsurance(null); }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveInsurance}
                                disabled={loading}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Modal */}
            {showTableModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white p-6 rounded-xl w-full max-w-2xl my-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Nova Tabela de Preços</h3>
                        <div className="space-y-3">
                            <select
                                value={newTable.insuranceId}
                                onChange={(e) => setNewTable({ ...newTable, insuranceId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione o Convênio</option>
                                {insurances.map(ins => (
                                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Nome da Tabela (ex: CBHPM)"
                                value={newTable.tableName}
                                onChange={(e) => setNewTable({ ...newTable, tableName: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Versão (Opcional)"
                                value={newTable.version}
                                onChange={(e) => setNewTable({ ...newTable, version: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />

                            <div className="border-t pt-3">
                                <h4 className="font-medium text-slate-700 mb-2">Adicionar Procedimentos</h4>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Código"
                                        value={newProcedure.code}
                                        onChange={(e) => setNewProcedure({ ...newProcedure, code: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Descrição"
                                        value={newProcedure.description}
                                        onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            placeholder="Preço"
                                            value={newProcedure.price}
                                            onChange={(e) => setNewProcedure({ ...newProcedure, price: e.target.value })}
                                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button
                                            onClick={handleAddProcedureToTable}
                                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {newTable.procedures.map((proc, idx) => (
                                        <div key={idx} className="text-sm bg-slate-50 p-2 rounded flex justify-between">
                                            <span>{proc.code} - {proc.description}</span>
                                            <span className="font-medium">R$ {proc.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowTableModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveTable}
                                disabled={loading}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Modal */}
            {showGuideModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white p-6 rounded-xl w-full max-w-2xl my-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Nova Guia</h3>
                        <div className="space-y-3">
                            <select
                                value={newGuide.guideType}
                                onChange={(e) => setNewGuide({ ...newGuide, guideType: e.target.value as any })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="CONSULTA">Consulta</option>
                                <option value="SADT">SADT</option>
                                <option value="SP/SADT">SP/SADT</option>
                            </select>
                            <select
                                value={newGuide.insuranceId}
                                onChange={(e) => setNewGuide({ ...newGuide, insuranceId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione o Convênio</option>
                                {insurances.map(ins => (
                                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                                ))}
                            </select>
                            <select
                                value={newGuide.patientId}
                                onChange={(e) => setNewGuide({ ...newGuide, patientId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione o Paciente</option>
                                {patients.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Número da Carteirinha"
                                value={newGuide.patientCardNumber}
                                onChange={(e) => setNewGuide({ ...newGuide, patientCardNumber: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <select
                                value={newGuide.professionalId}
                                onChange={(e) => setNewGuide({ ...newGuide, professionalId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione o Profissional</option>
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="CRM do Profissional"
                                value={newGuide.professionalCrm}
                                onChange={(e) => setNewGuide({ ...newGuide, professionalCrm: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="date"
                                value={newGuide.serviceDate}
                                onChange={(e) => setNewGuide({ ...newGuide, serviceDate: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />

                            <div className="border-t pt-3">
                                <h4 className="font-medium text-slate-700 mb-2">Procedimentos</h4>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Código"
                                        value={newGuideProcedure.code}
                                        onChange={(e) => setNewGuideProcedure({ ...newGuideProcedure, code: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Descrição"
                                        value={newGuideProcedure.description}
                                        onChange={(e) => setNewGuideProcedure({ ...newGuideProcedure, description: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qtd"
                                        value={newGuideProcedure.quantity}
                                        onChange={(e) => setNewGuideProcedure({ ...newGuideProcedure, quantity: e.target.value })}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            placeholder="Preço"
                                            value={newGuideProcedure.unitPrice}
                                            onChange={(e) => setNewGuideProcedure({ ...newGuideProcedure, unitPrice: e.target.value })}
                                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button
                                            onClick={handleAddProcedureToGuide}
                                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {newGuide.procedures.map((proc, idx) => (
                                        <div key={idx} className="text-sm bg-slate-50 p-2 rounded flex justify-between">
                                            <span>{proc.code} - {proc.description} (x{proc.quantity})</span>
                                            <span className="font-medium">R$ {proc.totalPrice.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                placeholder="Observações"
                                value={newGuide.observations}
                                onChange={(e) => setNewGuide({ ...newGuide, observations: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveGuide}
                                disabled={loading}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                                Emitir Guia
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white p-6 rounded-xl w-full max-w-2xl my-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Novo Lote</h3>
                        <div className="space-y-3">
                            <select
                                value={selectedBatchInsurance}
                                onChange={(e) => setSelectedBatchInsurance(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione o Convênio</option>
                                {insurances.map(ins => (
                                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                                ))}
                            </select>

                            {selectedBatchInsurance && (
                                <div className="border-t pt-3">
                                    <h4 className="font-medium text-slate-700 mb-2">Guias Pendentes ({pendingGuides.length})</h4>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {pendingGuides.map(guide => (
                                            <label key={guide.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded cursor-pointer hover:bg-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuides.includes(guide.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGuides([...selectedGuides, guide.id]);
                                                        } else {
                                                            setSelectedGuides(selectedGuides.filter(id => id !== guide.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">#{guide.guideNumber} - {guide.patientName}</p>
                                                    <p className="text-xs text-slate-600">{new Date(guide.serviceDate).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                                <span className="text-sm font-bold text-green-600">R$ {guide.totalValue.toFixed(2)}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {selectedGuides.length > 0 && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded">
                                            <p className="text-sm font-medium text-blue-800">
                                                Total: R$ {pendingGuides.filter(g => selectedGuides.includes(g.id)).reduce((sum, g) => sum + g.totalValue, 0).toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowBatchModal(false);
                                    setSelectedBatchInsurance('');
                                    setSelectedGuides([]);
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateBatch}
                                disabled={loading || selectedGuides.length === 0}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                            >
                                Criar Lote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Glosa Modal */}
            {showGlosaModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar Glosa</h3>
                        <div className="space-y-3">
                            <select
                                value={newGlosa.guideId}
                                onChange={(e) => setNewGlosa({ ...newGlosa, guideId: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione a Guia</option>
                                {guides.filter(g => g.status !== 'PENDENTE').map(g => (
                                    <option key={g.id} value={g.id}>#{g.guideNumber} - {g.patientName}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Código do Procedimento"
                                value={newGlosa.procedureCode}
                                onChange={(e) => setNewGlosa({ ...newGlosa, procedureCode: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="text"
                                placeholder="Descrição do Procedimento"
                                value={newGlosa.procedureDescription}
                                onChange={(e) => setNewGlosa({ ...newGlosa, procedureDescription: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <select
                                value={newGlosa.glosaType}
                                onChange={(e) => setNewGlosa({ ...newGlosa, glosaType: e.target.value as any })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            >
                                <option value="TOTAL">Glosa Total</option>
                                <option value="PARCIAL">Glosa Parcial</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Valor Original"
                                value={newGlosa.originalValue}
                                onChange={(e) => setNewGlosa({ ...newGlosa, originalValue: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <input
                                type="number"
                                placeholder="Valor Glosado"
                                value={newGlosa.glosedValue}
                                onChange={(e) => setNewGlosa({ ...newGlosa, glosedValue: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                            <textarea
                                placeholder="Motivo da Glosa"
                                value={newGlosa.glosaReason}
                                onChange={(e) => setNewGlosa({ ...newGlosa, glosaReason: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                rows={3}
                            />
                            <input
                                type="date"
                                value={newGlosa.glosaDate}
                                onChange={(e) => setNewGlosa({ ...newGlosa, glosaDate: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowGlosaModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveGlosa}
                                disabled={loading}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                            >
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TISSView;
