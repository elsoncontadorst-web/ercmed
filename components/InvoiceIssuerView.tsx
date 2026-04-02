import React from 'react';
import { Receipt, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

const InvoiceIssuerView: React.FC = () => {
  const handleOpenWebiss = () => {
    // Abre em nova aba para contornar bloqueios de segurança (X-Frame-Options) e garantir responsividade
    window.open('https://aracajuse.webiss.com.br/', '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-brand-600" />
          Emissor de Notas Fiscais
        </h2>
        <p className="text-sm text-slate-500">
          Acesso direto ao sistema oficial WebISS Aracaju.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <div className="max-w-lg w-full">
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-center">
            
            {/* Banner Decorativo */}
            <div className="bg-slate-900 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-brand-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
               <div className="absolute bottom-0 left-0 p-20 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -ml-10 -mb-10"></div>
               
               <Receipt className="w-16 h-16 text-white mx-auto mb-4 relative z-10 opacity-90" />
               <h3 className="text-xl font-bold text-white relative z-10">WebISS Aracaju</h3>
               <p className="text-slate-300 text-sm relative z-10">Sistema Oficial de ISS Eletrônico</p>
            </div>

            <div className="p-8 space-y-6">
              
              <div className="space-y-4">
                <p className="text-slate-600 text-base">
                  Para garantir a segurança dos seus dados e a compatibilidade com seu dispositivo móvel, o sistema da prefeitura será aberto em uma <strong>janela segura</strong>.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left flex gap-3">
                   <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-blue-800">Conexão Segura</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Certifique-se de ter seu Login/Senha ou Certificado Digital instalado no dispositivo se for necessário.
                      </p>
                   </div>
                </div>
              </div>

              <button
                onClick={handleOpenWebiss}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <span>Acessar Sistema Agora</span>
                <ExternalLink className="w-5 h-5" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-4">
                 <AlertCircle className="w-3 h-3" />
                 <span>Link externo oficial: aracajuse.webiss.com.br</span>
              </div>

            </div>
          </div>
          
          <p className="text-center text-slate-400 text-xs mt-8">
            Este aplicativo apenas redireciona para o portal oficial e não armazena suas credenciais de acesso governamental.
          </p>

        </div>
      </div>
    </div>
  );
};

export default InvoiceIssuerView;