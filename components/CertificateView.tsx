import React from 'react';
import { FileCheck, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

const CertificateView: React.FC = () => {
  const handleOpenRFB = () => {
    // Abre em nova aba para contornar bloqueios de segurança e garantir responsividade
    window.open('https://servicos.receitafederal.gov.br/servico/certidoes/#/home', '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-brand-600" />
          Certidões Negativas (CND)
        </h2>
        <p className="text-sm text-slate-500">
          Emissão de Certidões de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full">
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-center">
            
            {/* Banner Decorativo */}
            <div className="bg-slate-900 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-yellow-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
               <div className="absolute bottom-0 left-0 p-20 bg-brand-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -ml-10 -mb-10"></div>
               
               <div className="bg-white/10 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                 <FileCheck className="w-10 h-10 text-white relative z-10" />
               </div>
               
               <h3 className="text-xl font-bold text-white relative z-10">Receita Federal</h3>
               <p className="text-slate-300 text-sm relative z-10">Sistema de Certidões</p>
            </div>

            <div className="p-8 space-y-6">
              
              <div className="space-y-4">
                <p className="text-slate-600 text-base">
                  Emita a <strong>Certidão Negativa de Débitos (CND)</strong> diretamente no portal da Receita Federal. O sistema verifica pendências na RFB e PGFN.
                </p>

                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-left flex gap-3">
                   <ShieldCheck className="w-6 h-6 text-brand-600 flex-shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-brand-800">Acesso Oficial Seguro</p>
                      <p className="text-xs text-brand-600 mt-1">
                        Você será redirecionado para o ambiente seguro do Gov.br. Tenha o CNPJ ou CPF em mãos.
                      </p>
                   </div>
                </div>
              </div>

              <button
                onClick={handleOpenRFB}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <span>Emitir Certidão Agora</span>
                <ExternalLink className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-4">
                 <AlertCircle className="w-3 h-3" />
                 <span>Link externo oficial: servicos.receitafederal.gov.br</span>
              </div>

            </div>
          </div>
          
          <p className="text-center text-slate-400 text-xs mt-8">
            Este aplicativo facilita o acesso ao portal, mas a emissão depende da disponibilidade dos servidores da Receita Federal.
          </p>

        </div>
      </div>
    </div>
  );
};

export default CertificateView;