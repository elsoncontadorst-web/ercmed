import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, FileText, Plus, Trash2, Save, Upload, CheckCircle, AlertCircle, Loader2, X, FileSpreadsheet } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { auth } from '../services/firebase';
import { saveSalesOrders, getSalesOrders, saveTransactions, getTransactions, SavedTransaction } from '../services/userDataService';
import { SalesOrder, SalesItem } from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const SalesView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'orders' | 'import'>('orders');
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Partial<SalesOrder>>({
        items: [],
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0
    });
    const [newItem, setNewItem] = useState<Partial<SalesItem>>({
        description: '',
        quantity: 1,
        unitPrice: 0
    });

    // File Upload State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<string>('');

    useEffect(() => {
        const loadData = async () => {
            const user = auth.currentUser;
            if (!user) return;
            setIsLoading(true);
            try {
                const data = await getSalesOrders(user.uid);
                if (data) setOrders(data);
            } catch (error) {
                console.error("Error loading orders", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handleSaveOrder = async () => {
        const user = auth.currentUser;
        if (!user) return;

        if (!currentOrder.customerName || !currentOrder.date || (currentOrder.items?.length || 0) === 0) {
            alert("Preencha o cliente, data e adicione pelo menos um item.");
            return;
        }

        const newOrder: SalesOrder = {
            id: currentOrder.id || `order-${Date.now()}`,
            date: currentOrder.date!,
            customerName: currentOrder.customerName!,
            customerDoc: currentOrder.customerDoc,
            items: currentOrder.items as SalesItem[],
            totalAmount: currentOrder.items!.reduce((acc, item) => acc + item.total, 0),
            status: currentOrder.status as 'draft' | 'finalized' | 'cancelled',
            paymentMethod: currentOrder.paymentMethod,
            notes: currentOrder.notes
        };

        const updatedOrders = currentOrder.id
            ? orders.map(o => o.id === newOrder.id ? newOrder : o)
            : [newOrder, ...orders];

        setOrders(updatedOrders);
        setIsSaving(true);

        try {
            await saveSalesOrders(user.uid, updatedOrders);

            // If finalized, add to Financial Control
            if (newOrder.status === 'finalized' && (!currentOrder.id || orders.find(o => o.id === newOrder.id)?.status !== 'finalized')) {
                const transactions = await getTransactions(user.uid);
                const newTransaction: SavedTransaction = {
                    id: `sale-${newOrder.id}`,
                    date: newOrder.date,
                    description: `Venda - ${newOrder.customerName}`,
                    category: 'Vendas',
                    amount: newOrder.totalAmount,
                    type: 'income',
                    status: 'paid' // Assuming finalized sales are paid or receivable
                };
                await saveTransactions(user.uid, [newTransaction, ...transactions]);
                alert("Pedido salvo e lançado no financeiro com sucesso!");
            } else {
                alert("Pedido salvo com sucesso!");
            }

            setIsModalOpen(false);
            resetCurrentOrder();
        } catch (error) {
            console.error("Error saving order", error);
            alert("Erro ao salvar pedido.");
        } finally {
            setIsSaving(false);
        }
    };

    const resetCurrentOrder = () => {
        setCurrentOrder({
            items: [],
            status: 'draft',
            date: new Date().toISOString().split('T')[0],
            totalAmount: 0
        });
    };

    const addItemToOrder = () => {
        if (!newItem.description || !newItem.unitPrice) return;

        const item: SalesItem = {
            id: `item-${Date.now()}`,
            description: newItem.description,
            quantity: newItem.quantity || 1,
            unitPrice: Number(newItem.unitPrice),
            total: (newItem.quantity || 1) * Number(newItem.unitPrice)
        };

        setCurrentOrder(prev => ({
            ...prev,
            items: [...(prev.items || []), item],
            totalAmount: (prev.totalAmount || 0) + item.total
        }));

        setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    };

    const removeItemFromOrder = (itemId: string) => {
        setCurrentOrder(prev => {
            const updatedItems = prev.items?.filter(i => i.id !== itemId) || [];
            return {
                ...prev,
                items: updatedItems,
                totalAmount: updatedItems.reduce((acc, item) => acc + item.total, 0)
            };
        });
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este pedido?")) return;

        const user = auth.currentUser;
        if (!user) return;

        const updatedOrders = orders.filter(o => o.id !== orderId);
        setOrders(updatedOrders);
        await saveSalesOrders(user.uid, updatedOrders);
    };

    // --- NFe/NFS Import Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('Lendo arquivo...');

        try {
            if (file.type === 'application/pdf') {
                await processPdfNfe(file);
            } else if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                await processXmlNfe(file);
            } else {
                alert("Formato não suportado. Use PDF ou XML.");
                setImportStatus('');
            }
        } catch (error) {
            console.error("Import error", error);
            setImportStatus('Erro na importação.');
            alert("Erro ao processar arquivo. Verifique se é uma NFe ou NFS-e válida.");
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processXmlNfe = async (file: File) => {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        // Try to detect if it's NFe or NFS-e based on tags
        const isNfe = xmlDoc.getElementsByTagName('nfeProc').length > 0 || xmlDoc.getElementsByTagName('NFe').length > 0;

        let amount = 0;
        let date = new Date().toISOString().split('T')[0];
        let customer = 'Cliente Não Identificado';
        let type = 'NFe';

        if (isNfe) {
            // Standard NFe Parsing
            try {
                const vNF = xmlDoc.getElementsByTagName('vNF')[0]?.textContent;
                const dhEmi = xmlDoc.getElementsByTagName('dhEmi')[0]?.textContent;
                const xNome = xmlDoc.getElementsByTagName('dest')[0]?.getElementsByTagName('xNome')[0]?.textContent;

                if (vNF) amount = parseFloat(vNF);
                if (dhEmi) date = dhEmi.split('T')[0];
                if (xNome) customer = xNome;
            } catch (e) {
                console.warn("Erro ao ler campos da NFe", e);
            }
        } else {
            // Try Generic NFS-e Parsing (varies by city, but common tags exist)
            type = 'NFS-e';
            try {
                // Common tags for NFS-e
                const valorServicos = xmlDoc.getElementsByTagName('ValorServicos')[0]?.textContent ||
                    xmlDoc.getElementsByTagName('ValorLiquidoNfse')[0]?.textContent;

                const dataEmissao = xmlDoc.getElementsByTagName('DataEmissao')[0]?.textContent ||
                    xmlDoc.getElementsByTagName('Competencia')[0]?.textContent;

                const tomador = xmlDoc.getElementsByTagName('Tomador')[0];
                const razaoSocial = tomador?.getElementsByTagName('RazaoSocial')[0]?.textContent ||
                    xmlDoc.getElementsByTagName('RazaoSocialTomador')[0]?.textContent;

                if (valorServicos) amount = parseFloat(valorServicos.replace(',', '.'));
                if (dataEmissao) date = dataEmissao.split('T')[0];
                if (razaoSocial) customer = razaoSocial;
            } catch (e) {
                console.warn("Erro ao ler campos da NFS-e", e);
            }
        }

        if (amount === 0) {
            throw new Error("Não foi possível identificar o valor da nota.");
        }

        await createOrderFromImport(`Importação ${type} - ${customer}`, amount, date);
    };

    const processPdfNfe = async (file: File) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + ' ';
        }

        // Improved Regex for PDF
        const valueMatch = fullText.match(/Valor\s*Total.*?([\d.,]+)/i) || fullText.match(/Valor\s*Liquido.*?([\d.,]+)/i);
        const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);

        const extractedValue = valueMatch ? parseFloat(valueMatch[1].replace('.', '').replace(',', '.')) : 0;
        const extractedDate = dateMatch ? dateMatch[1].split('/').reverse().join('-') : new Date().toISOString().split('T')[0];

        if (extractedValue === 0) {
            alert("Aviso: Não foi possível ler o valor automaticamente do PDF. Verifique o valor importado.");
        }

        await createOrderFromImport("Importação via PDF", extractedValue, extractedDate);
    };

    const createOrderFromImport = async (customer: string, amount: number, date: string) => {
        const user = auth.currentUser;
        if (!user) return;

        const newOrder: SalesOrder = {
            id: `import-${Date.now()}`,
            date: date,
            customerName: customer,
            items: [{
                id: `item-${Date.now()}`,
                description: 'Importação Automática',
                quantity: 1,
                unitPrice: amount,
                total: amount
            }],
            totalAmount: amount,
            status: 'finalized',
            notes: 'Importado via arquivo digital'
        };

        const updatedOrders = [newOrder, ...orders];
        setOrders(updatedOrders);
        await saveSalesOrders(user.uid, updatedOrders);

        // Auto-create transaction
        const transactions = await getTransactions(user.uid);
        const newTransaction: SavedTransaction = {
            id: `sale-${newOrder.id}`,
            date: newOrder.date,
            description: `Venda - ${newOrder.customerName}`,
            category: 'Vendas',
            amount: newOrder.totalAmount,
            type: 'income',
            status: 'paid'
        };
        await saveTransactions(user.uid, [newTransaction, ...transactions]);

        setImportStatus('Importação concluída com sucesso!');
        setTimeout(() => setImportStatus(''), 3000);
    };

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        Gestão de Vendas
                        {isSaving && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-600">Gerencie pedidos e importe notas fiscais.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Importar NFe (PDF/XML)
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf, .xml"
                        className="hidden"
                    />
                    <button
                        onClick={() => { resetCurrentOrder(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Pedido
                    </button>
                </div>
            </header>

            {importStatus && (
                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {importStatus}
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'orders' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pedidos de Venda
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum pedido encontrado</h3>
                            <p className="text-slate-500">Crie um novo pedido ou importe uma NFe para começar.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data</th>
                                        <th className="py-3 px-4 text-sm font-semibold text-slate-600">Cliente</th>
                                        <th className="py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                                        <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor Total</th>
                                        <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4 text-sm text-slate-600">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
                                            <td className="py-3 px-4 text-sm text-slate-800 font-medium">{order.customerName}</td>
                                            <td className="py-3 px-4 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'finalized' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {order.status === 'finalized' ? 'Finalizado' : order.status === 'cancelled' ? 'Cancelado' : 'Rascunho'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-slate-800 text-right">
                                                {formatMoney(order.totalAmount)}
                                            </td>
                                            <td className="py-3 px-4 text-center flex justify-center gap-2">
                                                <button
                                                    onClick={() => { setCurrentOrder(order); setIsModalOpen(true); }}
                                                    className="text-slate-400 hover:text-brand-600 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Novo/Editar Pedido */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-brand-600" />
                                {currentOrder.id ? 'Editar Pedido' : 'Novo Pedido'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Header Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                                    <input
                                        type="text"
                                        value={currentOrder.customerName || ''}
                                        onChange={e => setCurrentOrder({ ...currentOrder, customerName: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="Nome do Cliente"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                                    <input
                                        type="date"
                                        value={currentOrder.date}
                                        onChange={e => setCurrentOrder({ ...currentOrder, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">CPF/CNPJ</label>
                                    <input
                                        type="text"
                                        value={currentOrder.customerDoc || ''}
                                        onChange={e => setCurrentOrder({ ...currentOrder, customerDoc: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        value={currentOrder.status}
                                        onChange={e => setCurrentOrder({ ...currentOrder, status: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                    >
                                        <option value="draft">Rascunho</option>
                                        <option value="finalized">Finalizado</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="font-medium text-slate-800 mb-3">Itens do Pedido</h4>

                                <div className="flex gap-2 mb-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 mb-1">Descrição</label>
                                        <input
                                            type="text"
                                            value={newItem.description}
                                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                            placeholder="Produto/Serviço"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="block text-xs text-slate-500 mb-1">Qtd</label>
                                        <input
                                            type="number"
                                            value={newItem.quantity}
                                            onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs text-slate-500 mb-1">Valor Unit.</label>
                                        <input
                                            type="number"
                                            value={newItem.unitPrice}
                                            onChange={e => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={addItemToOrder}
                                        className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-slate-600 font-medium">
                                            <tr>
                                                <th className="px-3 py-2">Descrição</th>
                                                <th className="px-3 py-2 text-center">Qtd</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                                <th className="px-3 py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentOrder.items?.map(item => (
                                                <tr key={item.id} className="border-t border-gray-200">
                                                    <td className="px-3 py-2">{item.description}</td>
                                                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right">{formatMoney(item.total)}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button onClick={() => removeItemFromOrder(item.id)} className="text-red-400 hover:text-red-600">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!currentOrder.items || currentOrder.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">
                                                        Nenhum item adicionado
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold text-slate-800">
                                            <tr>
                                                <td colSpan={2} className="px-3 py-2 text-right">Total do Pedido:</td>
                                                <td className="px-3 py-2 text-right">{formatMoney(currentOrder.totalAmount || 0)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t border-gray-200">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveOrder}
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {currentOrder.status === 'finalized' ? 'Salvar e Lançar' : 'Salvar Pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesView;
