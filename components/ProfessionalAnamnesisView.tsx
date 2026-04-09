import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Save, Wand2, Printer, Trash2, Plus, Edit3, CheckCircle, Clock, X } from 'lucide-react';
import { auth } from '../services/firebase';
import { ALL_ANAMNESIS_TEMPLATES, AnamnesisTemplate, AnamnesisFieldDef, getTemplateById } from '../services/anamnesisTemplates';
import { saveProfessionalAnamnesis, getProfessionalAnamneses, updateProfessionalAnamnesis, deleteProfessionalAnamnesis } from '../services/healthService';
import { ProfessionalAnamnesis, FilledSection, FilledField, Patient } from '../types/health';
import { calculateAge } from '../utils/formatters';
import { useUser } from '../contexts/UserContext';
import jsPDF from 'jspdf';

interface Props {
  patientId: string;
  patientName: string;
  patient?: Patient;
  onOpenLegacyMedicalForm?: () => void;
  onEditLegacyMedicalForm?: (anamnesis: Anamnesis) => void;
  onDeleteLegacyMedical?: (id: string) => void;
  legacyAnamneses?: Anamnesis[];
}

const COLOR_MAP: Record<string, string> = {
  purple: 'from-purple-600 to-purple-800',
  blue: 'from-blue-600 to-blue-800',
  green: 'from-emerald-600 to-emerald-800',
  orange: 'from-orange-500 to-orange-700',
  teal: 'from-teal-600 to-teal-800',
};

const BADGE_MAP: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  orange: 'bg-orange-100 text-orange-700',
  teal: 'bg-teal-100 text-teal-800',
};

// ─────────────────────────────────────────
// Dynamic Field Renderer
// ─────────────────────────────────────────
const FieldRenderer: React.FC<{
  field: AnamnesisFieldDef;
  value: any;
  onChange: (value: any) => void;
}> = ({ field, value, onChange }) => {
  const inputClass = "w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-400 outline-none bg-white text-slate-800 transition-all";

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className={inputClass + " resize-y"}
          rows={3}
          placeholder={field.placeholder || ''}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      );
    case 'number':
      return (
        <input type="number" className={inputClass} value={value || ''} placeholder={field.placeholder || ''}
          onChange={e => onChange(e.target.value)} />
      );
    case 'date':
      return <input type="date" className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'select':
      return (
        <select className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Selecione...</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div className="flex flex-wrap gap-3 pt-1">
          {field.options?.map(o => (
            <label key={o} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="radio" name={field.id} value={o} checked={value === o}
                onChange={() => onChange(o)} className="accent-teal-600" />
              {o}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="flex flex-wrap gap-3 pt-1">
          {field.options?.map(o => {
            const checked = Array.isArray(value) && value.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input type="checkbox" checked={checked} className="accent-teal-600"
                  onChange={() => {
                    const current: string[] = Array.isArray(value) ? value : [];
                    onChange(checked ? current.filter(v => v !== o) : [...current, o]);
                  }} />
                {o}
              </label>
            );
          })}
        </div>
      );
    case 'boolean':
      return (
        <div className="flex gap-4 pt-1">
          {['Sim', 'Não'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input type="radio" name={field.id} value={opt} checked={value === opt}
                onChange={() => onChange(opt)} className="accent-teal-600" />
              {opt}
            </label>
          ))}
        </div>
      );
    case 'escala':
      const min = field.min ?? 0;
      const max = field.max ?? 10;
      return (
        <div className="pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{min}</span>
            <input type="range" min={min} max={max} value={value ?? min}
              onChange={e => onChange(Number(e.target.value))}
              className="flex-1 accent-teal-600" />
            <span className="text-xs text-slate-500">{max}</span>
            <span className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold">
              {value ?? min}
            </span>
          </div>
        </div>
      );
    default: // text
      return (
        <input type="text" className={inputClass} value={value || ''} placeholder={field.placeholder || ''}
          onChange={e => onChange(e.target.value)} />
      );
  }
};

// ─────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────
const ProfessionalAnamnesisView: React.FC<Props> = ({ 
  patientId, 
  patientName,
  patient,
  onOpenLegacyMedicalForm,
  onEditLegacyMedicalForm,
  onDeleteLegacyMedical,
  legacyAnamneses = []
}) => {
  const { userProfile } = useUser();
  const [mode, setMode] = useState<'list' | 'new' | 'view' | 'edit'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<AnamnesisTemplate | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [formValues, setFormValues] = useState<Record<string, Record<string, any>>>({});
  const [savedAnamneses, setSavedAnamneses] = useState<ProfessionalAnamnesis[]>([]);
  const [currentAnamnesis, setCurrentAnamnesis] = useState<ProfessionalAnamnesis | null>(null);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnamneses();
  }, [patientId]);

  const loadAnamneses = async () => {
    setLoading(true);
    const data = await getProfessionalAnamneses(patientId);
    setSavedAnamneses(data);
    setLoading(false);
  };

  const handleSelectTemplate = (template: AnamnesisTemplate) => {
    setSelectedTemplate(template);
    
    // Pre-fill Identification section if patient data is available
    const initialValues: Record<string, Record<string, any>> = {};
    
    if (patient) {
        const identSection = template.sections.find(s => s.id === 'identificacao');
        if (identSection) {
            initialValues['identificacao'] = {};
            identSection.fields.forEach(f => {
                if (f.id === 'nome') initialValues['identificacao']['nome'] = patient.name;
                if (f.id === 'idade') initialValues['identificacao']['idade'] = calculateAge(patient.birthdate);
                if (f.id === 'sexo') initialValues['identificacao']['sexo'] = patient.gender;
                if (f.id === 'responsavel' && patient.isMinor && patient.guardian) {
                    initialValues['identificacao']['responsavel'] = `${patient.guardian.name} (${patient.guardian.relationship})`;
                }
            });
        }
    }

    setFormValues(initialValues);
    setNarrative('');
    setCurrentAnamnesis(null);
    setCollapsedSections(new Set());
    setMode('new');
  };

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [fieldId]: value }
    }));
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };

  const buildFilledSections = (): FilledSection[] => {
    if (!selectedTemplate) return [];
    return selectedTemplate.sections.map(section => ({
      id: section.id,
      title: section.title,
      fields: section.fields.map(f => ({
        id: f.id,
        label: f.label,
        type: f.type,
        value: formValues[section.id]?.[f.id] ?? (f.type === 'escala' ? (f.min ?? 0) : '')
      }))
    }));
  };

  const handleSave = async () => {
    if (!selectedTemplate || !auth.currentUser) return;
    setSaving(true);
    const sections = buildFilledSections();
    const today = new Date().toISOString().split('T')[0];

    if (currentAnamnesis?.id) {
      await updateProfessionalAnamnesis(currentAnamnesis.id, { sections, narrative, updatedAt: null });
    } else {
      await saveProfessionalAnamnesis({
        patientId,
        professionalId: auth.currentUser.uid,
        professionalName: userProfile?.displayName || auth.currentUser.email || 'Profissional',
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        profession: selectedTemplate.profession,
        date: today,
        sections,
        narrative,
      });
    }

    await loadAnamneses();
    setSaving(false);
    setMode('list');
  };

  const handleGenerateNarrative = async () => {
    if (!selectedTemplate) return;
    setGeneratingNarrative(true);
    try {
      const sections = buildFilledSections();
      const summaryText = sections.map(s => {
        const fieldSummary = s.fields
          .filter(f => f.value !== '' && f.value !== null && f.value !== undefined)
          .map(f => {
            const val = Array.isArray(f.value) ? f.value.join(', ') : String(f.value);
            return `${f.label}: ${val}`;
          }).join('; ');
        return fieldSummary ? `**${s.title}**: ${fieldSummary}` : null;
      }).filter(Boolean).join('\n');

      const prompt = `Você é um ${selectedTemplate.profession} experiente. Com base nos dados de anamnese abaixo, elabore uma narrativa clínica estruturada e profissional, em português, adequada para prontuário. Use linguagem técnica mas clara.\n\nPaciente: ${patientName}\nTipo: ${selectedTemplate.name}\n\n${summaryText}`;

      const { generateClinicalSummary } = await import('../services/aiService');
      const result = await generateClinicalSummary(prompt);
      setNarrative(result || 'Não foi possível gerar a narrativa. Verifique a conexão com a IA.');
    } catch (e) {
      setNarrative('Erro ao gerar narrativa. Tente novamente.');
    }
    setGeneratingNarrative(false);
  };

  const handleOpenView = (anamnesis: ProfessionalAnamnesis) => {
    const template = getTemplateById(anamnesis.templateId);
    setCurrentAnamnesis(anamnesis);
    setSelectedTemplate(template || null);
    setNarrative(anamnesis.narrative || '');
    // Rebuild formValues from saved sections
    const rebuilt: Record<string, Record<string, any>> = {};
    anamnesis.sections.forEach(s => {
      rebuilt[s.id] = {};
      s.fields.forEach(f => { rebuilt[s.id][f.id] = f.value; });
    });
    setFormValues(rebuilt);
    setMode('view');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta anamnese permanentemente?')) return;
    await deleteProfessionalAnamnesis(id);
    await loadAnamneses();
  };

  const handleExportPDF = () => {
    if (!currentAnamnesis) return;
    const pdf = new jsPDF();
    const lineH = 7;
    let y = 20;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(currentAnamnesis.templateName, 14, y); y += lineH + 2;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Paciente: ${patientName}  |  Data: ${currentAnamnesis.date}  |  Profissional: ${currentAnamnesis.professionalName}`, 14, y);
    y += lineH + 4;
    pdf.setDrawColor(200);
    pdf.line(14, y, 196, y); y += 6;

    currentAnamnesis.sections.forEach(section => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12); pdf.setFont('helvetica', 'bold');
      pdf.text(section.title, 14, y); y += lineH;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      section.fields.forEach(field => {
        const val = Array.isArray(field.value) ? field.value.join(', ') : String(field.value || '-');
        const lines = pdf.splitTextToSize(`${field.label}: ${val}`, 170);
        lines.forEach((line: string) => {
          if (y > 280) { pdf.addPage(); y = 20; }
          pdf.text(line, 14, y); y += lineH - 1;
        });
      });
      y += 4;
    });

    if (currentAnamnesis.narrative) {
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12); pdf.setFont('helvetica', 'bold');
      pdf.text('Narrativa Clínica (IA)', 14, y); y += lineH;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(currentAnamnesis.narrative, 170);
      lines.forEach((line: string) => {
        if (y > 280) { pdf.addPage(); y = 20; }
        pdf.text(line, 14, y); y += lineH - 1;
      });
    }

    pdf.save(`anamnese_${currentAnamnesis.templateId}_${patientId}.pdf`);
  };

  // ─── LIST VIEW ───
  if (mode === 'list') {
    return (
      <div className="space-y-6">
        {/* Template selector */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800">Iniciar Nova Anamnese</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {onOpenLegacyMedicalForm && (
              <button onClick={onOpenLegacyMedicalForm}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-transparent hover:border-teal-400 hover:shadow-md transition-all group text-center">
                <span className="text-3xl">🩺</span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-700 leading-tight">Anamnese Médica</span>
              </button>
            )}
            {ALL_ANAMNESIS_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => handleSelectTemplate(t)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border-2 border-transparent hover:border-teal-400 hover:shadow-md transition-all group text-center">
                <span className="text-3xl">{t.icon}</span>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-700 leading-tight">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Saved anamneses */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-800">Anamneses Registradas</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{savedAnamneses.length + legacyAnamneses.length}</span>
          </div>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Carregando...</div>
          ) : (savedAnamneses.length === 0 && legacyAnamneses.length === 0) ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma anamnese registrada ainda.</p>
              <p className="text-xs">Selecione um modelo acima para começar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Render Legacy Medical Anamneses */}
              {legacyAnamneses.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🩺</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">Anamnese Médica</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">Médico(a)</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(a.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {onEditLegacyMedicalForm && (
                        <button onClick={() => onEditLegacyMedicalForm(a)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-all flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Ver/Editar
                        </button>
                      )}
                      {onDeleteLegacyMedical && (
                        <button onClick={() => onDeleteLegacyMedical(a.id!)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
              ))}

              {/* Render Dynamic Multiprofessional Anamneses */}
              {savedAnamneses.map(a => {
                const tpl = getTemplateById(a.templateId);
                const colorClass = BADGE_MAP[tpl?.color || 'teal'];
                return (
                  <div key={a.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tpl?.icon || '📋'}</span>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{a.templateName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>{a.profession}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{a.date}</span>
                          {a.narrative && <span className="text-xs text-teal-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Com narrativa IA</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenView(a)}
                        className="text-xs px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 font-medium transition-all flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Ver/Editar
                      </button>
                      <button onClick={() => handleDelete(a.id!)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FORM / VIEW ───
  const isViewOnly = mode === 'view';
  const template = selectedTemplate;
  if (!template) return null;
  const colorGradient = COLOR_MAP[template.color] || COLOR_MAP.teal;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`bg-gradient-to-r ${colorGradient} text-white rounded-2xl p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <h2 className="text-lg font-bold">{template.name}</h2>
              <p className="text-white/80 text-sm">{patientName} · {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(mode === 'view') && (
              <>
                <button onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                  <Printer className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => setMode('edit')}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
              </>
            )}
            <button onClick={() => setMode('list')}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-lg transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {template.sections.map(section => {
        const isCollapsed = collapsedSections.has(section.id);
        return (
          <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-all">
              <span className="font-semibold text-slate-800 text-sm">{section.title}</span>
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
            </button>
            {!isCollapsed && (
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map(field => {
                  const savedSection = currentAnamnesis?.sections.find(s => s.id === section.id);
                  const savedField = savedSection?.fields.find(f => f.id === field.id);
                  const current = formValues[section.id]?.[field.id] ?? savedField?.value ?? (field.type === 'escala' ? (field.min ?? 0) : '');
                  const isWide = ['textarea', 'checkbox', 'escala'].includes(field.type);

                  return (
                    <div key={field.id} className={isWide ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {isViewOnly ? (
                        <div className="p-2.5 bg-slate-50 rounded-lg text-sm text-slate-700 min-h-[2rem] border border-slate-100">
                          {Array.isArray(current) ? current.join(', ') || '—' : String(current || '—')}
                        </div>
                      ) : (
                        <FieldRenderer field={field} value={current}
                          onChange={val => handleFieldChange(section.id, field.id, val)} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Narrative */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-500" />
            Narrativa Clínica (Gerada por IA)
          </h3>
          {!isViewOnly && (
            <button onClick={handleGenerateNarrative} disabled={generatingNarrative}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
              <Wand2 className="w-3.5 h-3.5" />
              {generatingNarrative ? 'Gerando...' : 'Gerar Narrativa'}
            </button>
          )}
        </div>
        {isViewOnly ? (
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100 min-h-[4rem]">
            {narrative || '—'}
          </div>
        ) : (
          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-y"
            rows={6}
            placeholder="Clique em 'Gerar Narrativa' ou escreva manualmente..."
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
          />
        )}
      </div>

      {/* Save button */}
      {!isViewOnly && (
        <div className="flex justify-end gap-3">
          <button onClick={() => setMode('list')}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl text-sm font-bold transition-all shadow-sm">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Anamnese'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfessionalAnamnesisView;
