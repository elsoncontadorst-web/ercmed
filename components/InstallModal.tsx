import React, { useState } from 'react';
import { X, Monitor, Smartphone, Apple, CheckCircle, Download, Chrome } from 'lucide-react';

interface InstallModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'ios'>('windows');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in scale-100">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Download className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Instalar Aplicativo</h3>
                            <p className="text-teal-100 text-sm">Tenha o ERCMed sempre com você</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('windows')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'windows'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Monitor className="w-4 h-4" />
                            Windows/PC
                        </button>
                        <button
                            onClick={() => setActiveTab('android')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'android'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            Android
                        </button>
                        <button
                            onClick={() => setActiveTab('ios')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'ios'
                                ? 'bg-white text-teal-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Apple className="w-4 h-4" />
                            iOS
                        </button>
                    </div>

                    <div className="space-y-6">
                        {activeTab === 'windows' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                                    <Chrome className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-blue-800 text-sm">
                                        Recomendamos o uso do <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong> para melhor experiência.
                                    </p>
                                </div>
                                <ol className="space-y-4">
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">1</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Acesse o Site</p>
                                            <p className="text-slate-600 text-sm">Navegue até a página inicial do sistema.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">2</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Procure o Ícone de Instalação</p>
                                            <p className="text-slate-600 text-sm">
                                                No canto direito da barra de endereço, procure por um ícone de computador com uma seta ou um sinal de (+).
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">3</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Clique e Confirme</p>
                                            <p className="text-slate-600 text-sm">Clique em "Instalar" e confirme a solicitação do navegador.</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        )}

                        {activeTab === 'android' && (
                            <div className="space-y-4 animate-fadeIn">
                                <ol className="space-y-4">
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">1</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Abra no Chrome</p>
                                            <p className="text-slate-600 text-sm">Acesse o sistema através do navegador Google Chrome.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">2</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Menu de Opções</p>
                                            <p className="text-slate-600 text-sm">Toque no ícone de três pontos (⋮) no canto superior direito.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">3</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Instalar</p>
                                            <p className="text-slate-600 text-sm">Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        )}

                        {activeTab === 'ios' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
                                    <Apple className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-orange-800 text-sm">
                                        No iOS é necessário usar o navegador <strong>Safari</strong>.
                                    </p>
                                </div>
                                <ol className="space-y-4">
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">1</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Botão Compartilhar</p>
                                            <p className="text-slate-600 text-sm">Toque no ícone de compartilhamento (quadrado com uma seta para cima).</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">2</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Adicionar à Tela de Início</p>
                                            <p className="text-slate-600 text-sm">Role o menu para baixo e encontre a opção <strong>"Adicionar à Tela de Início"</strong>.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold">3</span>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-slate-800">Confirmar</p>
                                            <p className="text-slate-600 text-sm">Toque em "Adicionar" no canto superior direito.</p>
                                        </div>
                                    </li>
                                </ol>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3 text-slate-500 text-sm">
                        <CheckCircle className="w-5 h-5 text-teal-500" />
                        <p>O aplicativo funciona offline após a instalação inicial.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallModal;
