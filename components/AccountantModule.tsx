import React, { useState } from 'react';
import { Calculator, FileText, Upload, Lock, Building2, LayoutDashboard } from 'lucide-react';
import { AppView } from '../types';
import { useUser } from '../contexts/UserContext';
import { canAccessAccountantModule, isMasterUser, UPGRADE_MESSAGES } from '../types/accountTiers';
import { UpgradePrompt } from './UpgradePrompt';
import InvoiceRequestView from './AccountantModule/InvoiceRequestView';
import DocumentsView from './AccountantModule/DocumentsView';
import DocumentManagementView from './AccountantModule/DocumentManagementView';
import FiscalOverviewView from './AccountantModule/FiscalOverviewView';
import LinkedClinicsView from './AccountantModule/LinkedClinicsView';
import AccountantDashboard from './AccountantModule/AccountantDashboard';

type TabType = 'dashboard' | 'clients' | 'overview' | 'invoice' | 'documents' | 'management';

const AccountantModule: React.FC<{ setView?: (view: AppView) => void }> = ({ setView }) => {
    const { userTier, user, userRole } = useUser();
    const isAccountant = (userRole as string) === 'accountant' || isMasterUser(user?.email);
    const [activeTab, setActiveTab] = useState<TabType>(isAccountant ? 'dashboard' : 'overview');

    const hasAccess = canAccessAccountantModule(userTier);
    const isMaster = isMasterUser(user?.email);

    const tabs = [
        ...(isAccountant ? [{ id: 'dashboard' as TabType, label: 'Carteira e Alertas', icon: LayoutDashboard }] : []),
        ...(isAccountant ? [{ id: 'clients' as TabType, label: 'Clientes Online', icon: Building2 }] : []),
        { id: 'overview' as TabType, label: 'Painel Fiscal', icon: Calculator },
        { id: 'invoice' as TabType, label: 'Solicitar Nota Fiscal', icon: FileText },
        { id: 'documents' as TabType, label: 'Documentos', icon: Upload },
        ...(isMaster ? [{ id: 'management' as TabType, label: 'Gestão de Documentos', icon: Lock }] : [])
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700">
                    <Calculator className="h-5 w-5" />
                </span>
                <div><h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
                    {isAccountant ? 'Dashboard do Contador' : 'Meu Contador'}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">Gestão contábil, documentos e visão fiscal do ERP</p></div>
            </div>

            {!hasAccess ? (
                <UpgradePrompt
                    featureName="Meu Contador"
                    message={UPGRADE_MESSAGES.accountantModule}
                    currentTier={userTier}
                />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/70 p-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex min-w-max items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeTab === tab.id
                                            ? 'bg-white text-teal-700 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4 sm:p-6">
                        {activeTab === 'dashboard' && isAccountant && <AccountantDashboard onClients={() => setActiveTab('clients')} onOpenCompany={() => setView?.(AppView.NFSE)} onOpenPayables={() => setView?.(AppView.ACCOUNTS_PAYABLE)} />}
                        {activeTab === 'clients' && isAccountant && <LinkedClinicsView onOpenCompany={() => setView?.(AppView.NFSE)} />}
                        {activeTab === 'overview' && <FiscalOverviewView />}
                        {activeTab === 'invoice' && <InvoiceRequestView />}
                        {activeTab === 'documents' && <DocumentsView />}
                        {activeTab === 'management' && isMaster && <DocumentManagementView />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountantModule;
