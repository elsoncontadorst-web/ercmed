import React, { useEffect, useState } from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { getClinics } from '../services/clinicService';
import { Clinic } from '../types/clinic';

interface ClinicSyncStatusProps {
  onSyncClick?: () => void;
}

export const ClinicSyncStatus: React.FC<ClinicSyncStatusProps> = ({ onSyncClick }) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const data = await getClinics();
      setClinics(data);
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await loadClinics();
      setLastSync(new Date());
      onSyncClick?.();
    } finally {
      setLoading(false);
    }
  };

  const syncText = !lastSync
    ? 'Nunca'
    : lastSync.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div>
            <h3 className="font-semibold text-slate-800">Sincronização de Clínicas</h3>
            <p className="text-sm text-slate-500">
              Status: <span className="font-medium text-green-600">Ativa</span>
              {' • '}
              {clinics.length} clínica{clinics.length !== 1 ? 's' : ''} sincronizada{clinics.length !== 1 ? 's' : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">Última sincronização: {syncText}</p>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {clinics.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="mb-2 text-sm font-medium text-slate-700">Clínicas Sincronizadas</h4>
          <div className="space-y-2">
            {clinics.map(clinic => (
              <div key={clinic.id} className="flex items-center gap-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                <span className="font-medium">{clinic.name}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">{clinic.specialty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicSyncStatus;
