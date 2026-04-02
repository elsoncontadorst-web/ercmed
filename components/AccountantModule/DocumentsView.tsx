import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, Filter } from 'lucide-react';
import { getAccountingDocuments, getDocumentsByType } from '../../services/accountantService';
import { AccountingDocument, DocumentType, DOCUMENT_TYPE_LABELS } from '../../types/accountant';

const DocumentsView: React.FC = () => {
    const [documents, setDocuments] = useState<AccountingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');

    useEffect(() => {
        loadDocuments();
    }, [filterType]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = filterType === 'all'
                ? await getAccountingDocuments()
                : await getDocumentsByType(filterType);
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (doc: AccountingDocument) => {
        window.open(doc.fileUrl, '_blank');
    };

    const groupedDocuments = documents.reduce((acc, doc) => {
        if (!acc[doc.type]) {
            acc[doc.type] = [];
        }
        acc[doc.type].push(doc);
        return acc;
    }, {} as Record<DocumentType, AccountingDocument[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Documentos Contábeis</h2>
                    <p className="text-sm text-slate-500">Baixe seus documentos fiscais e contábeis</p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as DocumentType | 'all')}
                        className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    >
                        <option value="all">Todos os Documentos</option>
                        {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                            <option key={type} value={type}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando documentos...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhum documento disponível.</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Os documentos serão disponibilizados pelo contador
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedDocuments).map(([type, docs]) => (
                        <div key={type} className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-brand-600" />
                                {DOCUMENT_TYPE_LABELS[type as DocumentType]}
                            </h3>

                            <div className="space-y-2">
                                {docs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800">{doc.fileName}</p>
                                            {doc.contractVersion && (
                                                <p className="text-sm text-slate-500">{doc.contractVersion}</p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">
                                                Enviado em {new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(doc)}
                                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Baixar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentsView;
