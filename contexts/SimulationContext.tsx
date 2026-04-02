import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MonthlyRecord, SimulationConfig } from '../types';
import { useSettings } from './SettingsContext';
import { auth } from '../services/firebase';
import { getSimulationRecords, saveSimulationRecord } from '../services/userDataService';

interface SimulationContextType {
    config: SimulationConfig;
    updateMonth: (index: number, data: Partial<MonthlyRecord>) => void;
    importData: (months: MonthlyRecord[]) => void;
    setActivity: (activity: any) => void;
    resetData: () => void;
    isSyncing: boolean;
    lastSync: Date | null;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const STORAGE_KEY = 'lancamentosAppContador';

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { cloudSaveEnabled } = useSettings();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Initialize with 12 empty months
    const initialMonths: MonthlyRecord[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        revenue: 0,
        expenses: 0,
        payroll: 0
    }));

    const [config, setConfig] = useState<SimulationConfig>({
        activity: 'SERVICOS_FATOR_R',
        months: initialMonths
    });

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure structure is correct
                if (parsed.months && Array.isArray(parsed.months)) {
                    // Merge with initial structure to ensure all fields exist
                    const mergedMonths = initialMonths.map((m, i) => ({
                        ...m,
                        ...(parsed.months[i] || {})
                    }));
                    setConfig({ ...parsed, months: mergedMonths });
                }
            } catch (e) {
                console.error("Error loading from local storage", e);
            }
        }
    }, []);

    // Load from Cloud if enabled
    useEffect(() => {
        const loadCloudData = async () => {
            if (!cloudSaveEnabled) return;

            const user = auth.currentUser;
            if (!user) return;

            setIsSyncing(true);
            try {
                const savedRecords = await getSimulationRecords(user.uid);
                if (savedRecords.length > 0) {
                    setConfig(prev => {
                        const newMonths = [...prev.months];
                        savedRecords.forEach(record => {
                            if (record.month >= 1 && record.month <= 12) {
                                newMonths[record.month - 1] = {
                                    ...newMonths[record.month - 1],
                                    revenue: record.revenue,
                                    expenses: record.expenses,
                                    payroll: record.payroll
                                };
                            }
                        });
                        // Save merged data to local storage to keep them in sync
                        const newConfig = { ...prev, months: newMonths };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
                        return newConfig;
                    });
                    setLastSync(new Date());
                }
            } catch (err) {
                console.error("Error loading from cloud:", err);
            } finally {
                setIsSyncing(false);
            }
        };

        // Listen for auth state changes to trigger load
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                loadCloudData();
            }
        });

        // Also try loading immediately if user is already there
        loadCloudData();

        return () => unsubscribe();
    }, [cloudSaveEnabled]); // Reload if cloud save is toggled on

    const updateMonth = useCallback(async (index: number, data: Partial<MonthlyRecord>) => {
        setConfig(prev => {
            const newMonths = [...prev.months];
            newMonths[index] = { ...newMonths[index], ...data };

            const newConfig = { ...prev, months: newMonths };

            // Always save to LocalStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));

            return newConfig;
        });

        // Conditionally save to Cloud
        if (cloudSaveEnabled) {
            const user = auth.currentUser;
            if (user) {
                // We use the updated state in the next render, but here we need the value *now*.
                // So we reconstruct it.
                const currentMonth = config.months[index];
                const updatedMonth = { ...currentMonth, ...data };

                try {
                    await saveSimulationRecord(user.uid, {
                        month: updatedMonth.month,
                        year: new Date().getFullYear(),
                        revenue: updatedMonth.revenue,
                        expenses: updatedMonth.expenses,
                        payroll: updatedMonth.payroll
                    });
                    setLastSync(new Date());
                } catch (e) {
                    console.error("Error saving to cloud", e);
                }
            }
        }
    }, [cloudSaveEnabled, config.months]);

    const importData = useCallback((newMonths: MonthlyRecord[]) => {
        setConfig(prev => {
            const newConfig = { ...prev, months: newMonths };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
            return newConfig;
        });

        if (cloudSaveEnabled) {
            const user = auth.currentUser;
            if (user) {
                newMonths.forEach(async (month) => {
                    try {
                        await saveSimulationRecord(user.uid, {
                            month: month.month,
                            year: new Date().getFullYear(),
                            revenue: month.revenue,
                            expenses: month.expenses,
                            payroll: month.payroll
                        });
                    } catch (e) {
                        console.error("Error syncing imported data", e);
                    }
                });
                setLastSync(new Date());
            }
        }
    }, [cloudSaveEnabled]);

    const setActivity = useCallback((activity: any) => {
        setConfig(prev => {
            const newConfig = { ...prev, activity };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
            return newConfig;
        });
    }, []);

    const resetData = useCallback(() => {
        const newConfig = {
            activity: config.activity,
            months: initialMonths
        };
        setConfig(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }, [config.activity]);

    return (
        <SimulationContext.Provider value={{ config, updateMonth, importData, setActivity, resetData, isSyncing, lastSync }}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (context === undefined) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};
