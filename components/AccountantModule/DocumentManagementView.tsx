import React, { useState, useEffect } from 'react';
import { Upload, Trash2, FileText, AlertCircle } from 'lucide-react';
import { uploadAccountingDocument, getAccountingDocuments, deleteAccountingDocument } from '../../services/accountantService';
import { AccountingDocument, DocumentType, DOCUMENT_TYPE_LABELS } from '../../types/accountant';

const DocumentManagementView: React.FC = () => {
    const [documents, setDocuments] = useState<AccountingDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [uploadForm, setUploadForm] = useState({
        type: 'cnpj' as DocumentType,
        file: null as File | null,
        contractVersion: ''
    });

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await getAccountingDocuments();
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadForm({ ...uploadForm, file: e.target.files[0] });
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!uploadForm.file) {
            alert('Selecione um arquivo');
            return;
        }

        setUploading(true);
        try {
            const result = await uploadAccountingDocument(
                uploadForm.file,
                uploadForm.type,
                uploadForm.type === 'contract' ? uploadForm.contractVersion : undefined
            );

            if (result) {
                alert('Documento enviado com sucesso!');
                setUploadForm({
                    type: 'cnpj',
                    file: null,
                    contractVersion: ''
                });
                // Reset file input
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';

                await loadDocuments();
            } else {
                alert('Erro ao enviar documento. Tente novamente.');
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Erro ao enviar documento. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc: AccountingDocument) => {
        if (!confirm(`Tem certeza que deseja excluir "${doc.fileName}"?`)) return;

        try {
            const result = await deleteAccountingDocument(doc.id, doc.fileUrl);
            if (result) {
                alert('Documento excluído com sucesso!');
                await loadDocuments();
            } else {
                alert('Erro ao excluir documento. Tente novamente.');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Erro ao excluir documento. Tente novamente.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Gestão de Documentos</h2>
                <p className="text-sm text-slate-500">Faça upload e gerencie documentos contábeis (Master Only)</p>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                <h3 className="font-semibold text-slate-800">Enviar Novo Documento</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Tipo de Documento *</label>
                        <select
                            value={uploadForm.type}
                            onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as DocumentType })}
                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                                <option key={type} value={type}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {uploadForm.type === 'contract' && (
                        <div>
                            <label className="text-sm font-medium text-slate-700">Versão do Contrato *</label>
                            <input
                                type="text"
                                value={uploadForm.contractVersion}
                                onChange={(e) => setUploadForm({ ...uploadForm, contractVersion: e.target.value })}
                                placeholder="Ex: Última alteração, Alteração 1"
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                required={uploadForm.type === 'contract'}
                            />
                        </div>
                    )}

                    <div className={uploadForm.type === 'contract' ? 'col-span-2' : 'col-span-1'}>
                        <label className="text-sm font-medium text-slate-700">Arquivo *</label>
                        <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Formatos aceitos: PDF, JPG, PNG</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={uploading}
                    className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Enviando...' : 'Enviar Documento'}
                </button>
            </form>

            {/* Documents List */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4">Documentos Cadastrados</h3>

                {loading ? (
                    <div className="text-center py-10">Carregando...</div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Nenhum documento cadastrado.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-brand-600" />
                                    <div>
                                        <p className="font-medium text-slate-800">{doc.fileName}</p>
                                        <p className="text-sm text-slate-500">
                                            {DOCUMENT_TYPE_LABELS[doc.type]}
                                            {doc.contractVersion && ` - ${doc.contractVersion}`}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            Enviado em {new Date(doc.uploadedAt.seconds * 1000).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentManagementView;
