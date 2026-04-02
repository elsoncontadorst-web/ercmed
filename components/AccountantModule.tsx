import React, { useState } from 'react';
import { Calculator, FileText, Upload, Lock } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { canAccessAccountantModule, isMasterUser, UPGRADE_MESSAGES } from '../types/accountTiers';
import { UpgradePrompt } from './UpgradePrompt';
import InvoiceRequestView from './AccountantModule/InvoiceRequestView';
import DocumentsView from './AccountantModule/DocumentsView';
import DocumentManagementView from './AccountantModule/DocumentManagementView';

type TabType = 'invoice' | 'documents' | 'management';

const AccountantModule: React.FC = () => {
    const { userTier, user } = useUser();
    const [activeTab, setActiveTab] = useState<TabType>('invoice');

    const hasAccess = canAccessAccountantModule(userTier);
    const isMaster = isMasterUser(user?.email);

    const tabs = [
        { id: 'invoice' as TabType, label: 'Solicitar Nota Fiscal', icon: FileText },
        { id: 'documents' as TabType, label: 'Documentos', icon: Upload },
        ...(isMaster ? [{ id: 'management' as TabType, label: 'Gestão de Documentos', icon: Lock }] : [])
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-brand-600" />
                    Meu Contador
                </h1>
                <p className="text-slate-500">Gestão contábil e documentos fiscais</p>
            </div>

            {!hasAccess ? (
                <UpgradePrompt
                    featureName="Meu Contador"
                    message={UPGRADE_MESSAGES.accountantModule}
                    currentTier={userTier}
                />
            ) : (
                <>
                    {/* Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="flex border-b border-gray-200">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${activeTab === tab.id
                                                ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50'
                                                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === 'invoice' && <InvoiceRequestView />}
                            {activeTab === 'documents' && <DocumentsView />}
                            {activeTab === 'management' && isMaster && <DocumentManagementView />}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AccountantModule;
