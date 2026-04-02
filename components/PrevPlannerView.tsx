import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';
import { extractTextFromPDF } from '../services/pdfUtils';
import { analyzeCnisData } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

const PrevPlannerView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'ANALYZING' | 'RESULT'>('UPLOAD');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loadingText, setLoadingText] = useState('Iniciando análise...');

  // Efeito para rotacionar mensagens de status durante a análise
  useEffect(() => {
    if (step === 'ANALYZING') {
      const messages = [
        "Lendo arquivo PDF...",
        "Identificando vínculos trabalhistas...",
        "Analisando contribuições mensais...",
        "Verificando períodos e datas...",
        "Buscando indicadores de pendência (PEXT, ACOMP)...",
        "Calculando estimativas de tempo...",
        "Gerando resumo executivo..."
      ];
      
      let currentIndex = 0;
      setLoadingText(messages[0]);

      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        setLoadingText(messages[currentIndex]);
      }, 2000); // Troca a frase a cada 2 segundos

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleAnalysis = async () => {
    if (!file) return;

    setStep('ANALYZING');
    setIsProcessing(true);
    setError('');

    try {
      // 1. Extrair texto do PDF
      const pdfText = await extractTextFromPDF(file);
      
      if (pdfText.length < 50) {
        throw new Error("O PDF parece estar vazio ou é uma imagem escaneada. Tente usar um CNIS original do Meu INSS.");
      }

      // 2. Enviar para IA
      const result = await analyzeCnisData(pdfText);
      setAnalysisResult(result || "Não foi possível gerar uma análise.");
      setStep('RESULT');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao processar o documento.");
      setStep('UPLOAD');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysisResult('');
    setStep('UPLOAD');
    setError('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-600" />
          Planejador PREV
        </h2>
        <p className="text-sm text-slate-500">
          Análise inteligente de extrato CNIS para planejamento de aposentadoria.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center animate-fade-in">
              <div className="mb-6 flex justify-center">
                <div className="bg-blue-50 p-4 rounded-full">
                  <UploadCloud className="w-12 h-12 text-blue-500" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Anexe seu Extrato CNIS (PDF)</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Baixe o extrato completo em PDF no site "Meu INSS" e anexe aqui para que o sistema identifique pendências e faça uma estimativa.
              </p>

              <div className="flex flex-col items-center gap-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cnis-upload"
                />
                
                {!file ? (
                  <label 
                    htmlFor="cnis-upload" 
                    className="cursor-pointer bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <UploadCloud className="w-5 h-5" />
                    Selecionar Arquivo PDF
                  </label>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      {file.name}
                    </div>
                    <button 
                      onClick={handleAnalysis}
                      disabled={isProcessing}
                      className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Análise Inteligente'}
                    </button>
                    <button onClick={() => setFile(null)} className="text-sm text-slate-400 hover:text-red-500 underline">
                      Remover arquivo
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2 max-w-md mx-auto text-left">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="mt-12 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-left text-sm text-yellow-800 flex gap-3">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Privacidade & Segurança</p>
                  <p>O processamento do arquivo é realizado de forma automatizada e segura. Recomendamos remover dados sensíveis se preferir, embora o sistema foque apenas nos dados previdenciários.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'ANALYZING' && (
            <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
              <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800 min-w-[300px]">{loadingText}</h3>
              <p className="text-slate-500 mt-2">Aguarde enquanto processamos as informações.</p>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'RESULT' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      Relatório de Planejamento
                    </h3>
                    <p className="text-sm text-slate-500">Baseado no documento enviado.</p>
                  </div>
                  <button 
                    onClick={reset}
                    className="text-sm text-brand-600 hover:text-brand-800 font-medium px-4 py-2 bg-brand-50 rounded-lg transition-colors"
                  >
                    Nova Análise
                  </button>
                </div>

                {/* Estilização melhorada para o Markdown gerado pela IA */}
                <div className="prose prose-sm max-w-none prose-slate 
                  prose-headings:text-slate-800 
                  prose-h1:text-brand-700 prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-200 prose-h1:pb-2
                  prose-strong:text-slate-900 
                  prose-a:text-brand-600">
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-300 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-lg">Precisa de um cálculo oficial?</h4>
                  <p className="text-sm opacity-80">Esta é uma análise preliminar baseada no extrato. Para averbação de tempo, correção de pendências e cálculo exato de RMI, fale com o contador.</p>
                </div>
                <a 
                  href="https://api.whatsapp.com/send?phone=5579988078887&text=Ol%C3%A1%2C%20fiz%20a%20an%C3%A1lise%20preliminar%20do%20meu%20CNIS%20no%20app%20e%20gostaria%20de%20prosseguir%20com%20o%20planejamento." 
                  target="_system"
                  className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-all shadow-lg whitespace-nowrap"
                >
                  Agendar Consultoria
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PrevPlannerView;