import { useState, useEffect, useRef } from 'react';
import { auth } from '../services/firebase';
import { saveCalculatorData, getCalculatorData } from '../services/userDataService';

export const useCloudSync = (
    calculatorId: string,
    currentData: any,
    onDataLoaded: (data: any) => void
) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Ref para evitar loop de salvamento ao carregar dados
    const isInitialLoad = useRef(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 1. Carregar dados ao montar
    useEffect(() => {
        const loadData = async () => {
            const user = auth.currentUser;
            if (!user) {
                setIsLoaded(true); // Se não tiver user, libera para edição local
                return;
            }

            setIsSyncing(true);
            try {
                const data = await getCalculatorData(user.uid, calculatorId);
                if (data) {
                    onDataLoaded(data);
                    setLastSync(data.updatedAt?.toDate() || new Date());
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setIsSyncing(false);
                setIsLoaded(true);
                // Pequeno delay para garantir que o state update do load não dispare o save
                setTimeout(() => {
                    isInitialLoad.current = false;
                }, 500);
            }
        };

        loadData();
    }, [calculatorId]); // Apenas na montagem ou mudança de ID

    // 2. Salvar dados quando mudarem (Debounced)
    useEffect(() => {
        // Não salva se ainda está carregando ou se é o load inicial
        if (!isLoaded || isInitialLoad.current) return;

        const user = auth.currentUser;
        if (!user) return;

        // Limpa timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setIsSyncing(true);

        // Define novo timeout (debounce de 1.5s)
        timeoutRef.current = setTimeout(async () => {
            try {
                await saveCalculatorData(user.uid, calculatorId, currentData);
                setLastSync(new Date());
            } catch (error) {
                console.error("Erro ao salvar dados:", error);
            } finally {
                setIsSyncing(false);
            }
        }, 1500);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentData, calculatorId, isLoaded]);

    return { isSyncing, lastSync, isLoaded };
};
