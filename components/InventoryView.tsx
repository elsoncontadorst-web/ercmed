import React from 'react';
import { Package, AlertTriangle, Search, Filter, Plus } from 'lucide-react';

const InventoryView: React.FC = () => {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-6 h-6 text-brand-600" />
                        Estoque e Insumos
                    </h1>
                    <p className="text-slate-500">Gestão de medicamentos e materiais</p>
                </div>
                <button className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Item
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total de Itens</p>
                            <p className="text-xl font-bold text-slate-800">0</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Estoque Baixo</p>
                            <p className="text-xl font-bold text-slate-800">0</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Categorias</p>
                            <p className="text-xl font-bold text-slate-800">0</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Placeholder */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[300px] flex flex-col items-center justify-center p-8">
                <Package className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Seu estoque está vazio</h3>
                <p className="text-slate-500 text-center max-w-md mb-6">
                    Cadastre medicamentos, materiais descartáveis e cosméticos para controlar o consumo e receber alertas de reposição.
                </p>
                <button className="text-brand-600 font-medium hover:underline">
                    Cadastrar primeiro item
                </button>
            </div>
        </div>
    );
};

export default InventoryView;
