import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FlaskConical, 
  Leaf, 
  Pill, 
  Beaker, 
  Microscope, 
  Link as LinkIcon, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Save, 
  FileText, 
  Brain,
  Globe,
  Database,
  Users
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

interface ResearchResource {
  id: string;
  name: string;
  type: 'MEDICAMENTO' | 'PLANTA' | 'SUPLEMENTO' | 'NUTRIENTE';
  description: string;
  activeIngredients: string[];
  mechanismsOfAction: string[];
  indications: string[];
  interactions: Array<{
    substance: string;
    effect: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  evidenceLevel: number; // 1-5
  scientificSources: string[];
  suggestedDosage?: string;
}

import { analyzeTherapeuticIdea, TherapeuticAnalysis } from '../services/therapeuticService';

const TherapeuticIntelligenceView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'DISCOVERY' | 'LIBRARY' | 'PATIENT_CROSS'>('DISCOVERY');
  const [selectedSubstance, setSelectedSubstance] = useState<ResearchResource | null>(null);
  const [researchPrompt, setResearchPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TherapeuticAnalysis | null>(null);

  // ... (existing resources state)

  const handleGlobalSearch = () => {
    setIsSearching(true);
    // Simulating AI Search
    setTimeout(() => {
      setIsSearching(false);
    }, 1500);
  };

  const handleAiDiscovery = async () => {
    if (!researchPrompt) return;
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeTherapeuticIdea(researchPrompt);
      setAnalysisResult(result);
    } catch (error) {
      console.error(error);
      alert("Erro ao realizar descoberta científica.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Inteligência Terapêutica & Descoberta
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Motor de cruzamento farmacológico, fitoterápico e pesquisa científica assistida por IA.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium text-sm">
              <Globe className="w-4 h-4" />
              Fontes Externas (PubMed/SciELO)
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all font-bold text-sm">
              <Plus className="w-4 h-4" />
              Nova Pesquisa/Planta
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-3xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Pesquisar por droga, princípio ativo, planta medicinal, nutriente ou biomarcador..."
            className="w-full pl-12 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-300 outline-none transition-all shadow-sm text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
          />
          <button 
            onClick={handleGlobalSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-6 py-2 rounded-xl hover:bg-slate-800 transition-all font-bold"
          >
            {isSearching ? 'Buscando...' : 'Pesquisar'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Tabs */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('DISCOVERY')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'DISCOVERY' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FlaskConical className="w-5 h-5" />
            Laboratório de Descoberta
          </button>
          <button 
            onClick={() => setActiveTab('LIBRARY')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'LIBRARY' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Database className="w-5 h-5" />
            Base de Conhecimento
          </button>
          <button 
            onClick={() => setActiveTab('PATIENT_CROSS')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'PATIENT_CROSS' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users className="w-5 h-5" />
            Cruzamento com Pacientes
          </button>
          
          <div className="mt-auto p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Insight da IA</h4>
            <p className="text-[11px] text-purple-600 leading-relaxed italic">
              "Pesquisas recentes da UFS confirmam que o Capim-Santo possui terpenos com efeito sinérgico aos bloqueadores de cálcio."
            </p>
          </div>
        </div>

        {/* View Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'DISCOVERY' && (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* AI Discovery Box */}
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-16 -mt-16 opacity-50" />
                
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  Propor Nova Hipótese Terapêutica
                </h2>
                <p className="text-slate-500 mb-6">
                  Descreva um tratamento, combinação ou planta para que a IA realize uma varredura científica e proponha um protocolo baseado em evidências.
                </p>
                
                <div className="space-y-4">
                  <textarea 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-200 transition-all h-32 resize-none"
                    placeholder="Ex: Qual o potencial do Capim-Santo associado ao Magnésio no controle da hipertensão sistólica em idosos?"
                    value={researchPrompt}
                    onChange={(e) => setResearchPrompt(e.target.value)}
                  />
                  <button 
                    onClick={handleAiDiscovery}
                    disabled={isAnalyzing || !researchPrompt}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analisando Literatura Científica...
                      </>
                    ) : (
                      <>
                        <Microscope className="w-5 h-5" />
                        Iniciar Descoberta Científica
                      </>
                    )}
                  </button>
                </div>

                {analysisResult && (
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-slate-800 text-lg">{analysisResult.title}</h3>
                      <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                        Nível de Evidência: {analysisResult.evidenceLevel}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-4">{analysisResult.summary}</p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Compostos & Mecanismos:</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.activeCompounds.map((compound, i) => (
                            <span key={i} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-md font-bold">{compound}</span>
                          ))}
                        </div>
                        <ul className="mt-3 space-y-1">
                          {analysisResult.mechanismsOfAction.map((moa, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5" />
                              {moa}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                          <h4 className="text-[9px] font-bold text-green-700 uppercase mb-2">Sinergias:</h4>
                          <ul className="space-y-1">
                            {analysisResult.synergies.map((syn, i) => (
                              <li key={i} className="text-[11px] text-green-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {syn}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <h4 className="text-[9px] font-bold text-amber-700 uppercase mb-2">Riscos/Interações:</h4>
                          <ul className="space-y-1">
                            {analysisResult.risks.map((risk, i) => (
                              <li key={i} className="text-[11px] text-amber-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {risk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="bg-purple-900 p-4 rounded-xl text-white">
                        <h4 className="text-[9px] font-bold text-purple-300 uppercase mb-1 tracking-widest">Protocolo Sugerido:</h4>
                        <p className="text-sm font-medium leading-relaxed">{analysisResult.suggestedProtocol}</p>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Fontes: PubMed, UFS, Google Scholar
                      </div>
                      <button className="text-purple-600 font-bold text-sm flex items-center gap-1 hover:underline">
                        Integrar ao Protocolo Clínico <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Discoveries Feed */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-purple-600 font-bold">
                    <TrendingUp className="w-5 h-5" />
                    Tendências em Pesquisa
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                      <p className="text-sm font-bold text-slate-800">Cúrcuma + Piperina</p>
                      <p className="text-xs text-slate-500">Aumento de 2000% na biodisponibilidade para inflamação crônica.</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                      <p className="text-sm font-bold text-slate-800">Magnésio Treonato</p>
                      <p className="text-xs text-slate-500">Novos estudos sobre regeneração sináptica pós-COVID.</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-amber-600 font-bold">
                    <AlertTriangle className="w-5 h-5" />
                    Alertas de Interação
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-sm font-bold text-amber-800">Erva de São João + SSRIs</p>
                      <p className="text-xs text-amber-600">Risco severo de síndrome serotoninérgica detectado em meta-análise.</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-sm font-bold text-amber-800">Gingko Biloba + Varfarina</p>
                      <p className="text-xs text-amber-600">Alerta: Aumento significativo do risco de sangramento espontâneo.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'LIBRARY' && (
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map(res => (
                  <div 
                    key={res.id}
                    onClick={() => setSelectedSubstance(res)}
                    className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg ${res.type === 'PLANTA' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {res.type === 'PLANTA' ? <Leaf className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
                      </div>
                      <div className="flex gap-1">
                        {[...Array(res.evidenceLevel)].map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-purple-500 rounded-full" />
                        ))}
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{res.name}</h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{res.description}</p>
                    
                    <div className="mt-4 flex flex-wrap gap-1">
                      {res.activeIngredients.slice(0, 2).map(ing => (
                        <span key={ing} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{ing}</span>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Add New Card */}
                <button className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-purple-300 hover:text-purple-500 transition-all">
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="font-bold">Adicionar Recurso</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'PATIENT_CROSS' && (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Cruzamento Clínico Inteligente</h2>
              <p className="text-slate-500 max-w-md">
                Selecione um paciente do seu prontuário para cruzar automaticamente seu histórico, exames e biomarcadores com as novas descobertas terapêuticas.
              </p>
              <button className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto">
                Selecionar Paciente para Análise
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {selectedSubstance && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  {selectedSubstance.type === 'PLANTA' ? <Leaf className="w-6 h-6 text-green-400" /> : <Pill className="w-6 h-6 text-blue-400" />}
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold">{selectedSubstance.name}</h2>
                  <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">{selectedSubstance.type}</span>
                </div>
              </div>
              <button onClick={() => setSelectedSubstance(null)} className="text-slate-400 hover:text-white transition-colors">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Descrição & Farmacodinâmica
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{selectedSubstance.description}</p>
                </section>

                <div className="grid grid-cols-2 gap-6">
                  <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                      <Beaker className="w-4 h-4 text-purple-600" />
                      Mecanismos de Ação
                    </h4>
                    <ul className="space-y-2">
                      {selectedSubstance.mechanismsOfAction.map((m, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      Indicações Principais
                    </h4>
                    <ul className="space-y-2">
                      {selectedSubstance.indications.map((ind, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Evidência Científica
                  </h3>
                  <div className="flex gap-2 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex-1 h-2 rounded-full ${i < selectedSubstance.evidenceLevel ? 'bg-purple-500' : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedSubstance.scientificSources.map(source => (
                      <div key={source} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                        <span className="text-sm font-medium text-slate-700">{source}</span>
                        <LinkIcon className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <div className="bg-purple-900 text-white p-6 rounded-3xl shadow-xl shadow-purple-900/20">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Posologia Sugerida
                  </h4>
                  <p className="text-purple-100 text-sm leading-relaxed mb-4">
                    {selectedSubstance.suggestedDosage || 'Consulte os protocolos experimentais para dosagem.'}
                  </p>
                  <button className="w-full py-3 bg-white text-purple-900 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    Salvar no Prontuário
                  </button>
                </div>

                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Interações & Riscos
                  </h4>
                  <div className="space-y-4">
                    {selectedSubstance.interactions.map((inter, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                        <p className="text-xs font-bold text-amber-700 uppercase">{inter.substance}</p>
                        <p className="text-sm text-slate-600 mt-1">{inter.effect}</p>
                        <div className="mt-2 flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${inter.severity === 'HIGH' ? 'bg-red-500' : inter.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{inter.severity} RISK</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapeuticIntelligenceView;
