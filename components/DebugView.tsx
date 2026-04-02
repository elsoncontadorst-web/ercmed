import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUser } from '../contexts/UserContext';

const DebugView: React.FC = () => {
    const { user, userProfile } = useUser();
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const runDiagnostics = async () => {
        setLoading(true);
        setLogs([]);
        addLog(`Starting diagnostics at ${new Date().toLocaleTimeString()}`);

        if (!user) {
            addLog("No user logged in.");
            setLoading(false);
            return;
        }

        addLog(`User: ${user.email} (${user.uid})`);
        addLog(`Profile CNPJ: ${userProfile?.cnpj || 'N/A'}`);
        addLog(`Is Clinic Manager: ${userProfile?.isClinicManager}`);

        try {
            // 1. Check Requests for this Manager ID
            addLog("--- Checking Requests for this Manager ID ---");
            const q1 = query(collection(db, 'clinic_link_requests'), where('managerId', '==', user.uid));
            const snap1 = await getDocs(q1);
            addLog(`Found ${snap1.size} requests for managerId=${user.uid}`);
            snap1.forEach(doc => {
                const data = doc.data();
                addLog(`- Request ${doc.id}: User=${data.userEmail}, Status=${data.status}`);
            });

            // 2. Check ALL Requests (limit 10) to see if there are others
            addLog("--- Checking Recent Requests (All) ---");
            const snap2 = await getDocs(collection(db, 'clinic_link_requests'));
            addLog(`Total requests in collection: ${snap2.size}`);
            snap2.forEach(doc => {
                const data = doc.data();
                addLog(`- [${doc.id}] ManagerID=${data.managerId}, User=${data.userEmail}, Status=${data.status}`);
            });

            // 3. Check User Profile for this CNPJ
            if (userProfile?.cnpj) {
                addLog(`--- Checking Profiles with CNPJ ${userProfile.cnpj} ---`);
                const q3 = query(collection(db, 'user_profiles'), where('cnpj', '==', userProfile.cnpj));
                const snap3 = await getDocs(q3);
                snap3.forEach(doc => {
                    addLog(`- Profile ${doc.id}: Email=${doc.data().email}, IsManager=${doc.data().isClinicManager}`);
                });
            }

        } catch (error: any) {
            addLog(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug Diagnostics</h1>
            <button
                onClick={runDiagnostics}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Running...' : 'Run Diagnostics'}
            </button>

            <div className="mt-6 p-4 bg-slate-100 rounded border border-slate-300 font-mono text-sm whitespace-pre-wrap h-96 overflow-auto">
                {logs.length === 0 ? 'Click run to start...' : logs.join('\n')}
            </div>
        </div>
    );
};

export default DebugView;
