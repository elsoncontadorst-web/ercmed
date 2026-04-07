import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { HealthInsurance, TissTable, TissGuide, TissBatch, TissGlosa } from '../types/tiss';

// ==================== HEALTH INSURANCE ====================

export const addHealthInsurance = async (
    professionalId: string,
    insurance: Omit<HealthInsurance, 'id' | 'professionalId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const insuranceRef = collection(db, 'health_insurances');
        const docRef = await addDoc(insuranceRef, {
            ...insurance,
            professionalId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar convênio:', error);
        return null;
    }
};

export const getHealthInsurances = async (professionalId: string): Promise<HealthInsurance[]> => {
    try {
        const insuranceRef = collection(db, 'health_insurances');
        const q = query(insuranceRef, where('professionalId', '==', professionalId), where('active', '==', true));
        const snapshot = await getDocs(q);
        const insurances = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as HealthInsurance));
        // Sort client-side to avoid composite index requirement
        return insurances.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Erro ao buscar convênios:', error);
        return [];
    }
};

export const updateHealthInsurance = async (
    insuranceId: string,
    data: Partial<Omit<HealthInsurance, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const insuranceRef = doc(db, 'health_insurances', insuranceId);
        await updateDoc(insuranceRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar convênio:', error);
        return false;
    }
};

// ==================== TISS TABLES ====================

export const addTissTable = async (
    professionalId: string,
    table: Omit<TissTable, 'id' | 'professionalId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const tablesRef = collection(db, 'tiss_tables');
        const docRef = await addDoc(tablesRef, {
            ...table,
            professionalId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar tabela:', error);
        return null;
    }
};

export const getTissTables = async (professionalId: string, insuranceId?: string): Promise<TissTable[]> => {
    try {
        const tablesRef = collection(db, 'tiss_tables');
        let q;
        if (insuranceId) {
            q = query(tablesRef, where('professionalId', '==', professionalId), where('insuranceId', '==', insuranceId), where('active', '==', true));
        } else {
            q = query(tablesRef, where('professionalId', '==', professionalId), where('active', '==', true));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TissTable));
    } catch (error) {
        console.error('Erro ao buscar tabelas:', error);
        return [];
    }
};

export const updateTissTable = async (
    tableId: string,
    data: Partial<Omit<TissTable, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const tableRef = doc(db, 'tiss_tables', tableId);
        await updateDoc(tableRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        return false;
    }
};

// ==================== TISS GUIDES ====================

export const addTissGuide = async (
    guide: Omit<TissGuide, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const guidesRef = collection(db, 'tiss_guides');
        const docRef = await addDoc(guidesRef, {
            ...guide,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar guia:', error);
        return null;
    }
};

export const getTissGuides = async (professionalId: string, filters?: {
    insuranceId?: string;
    status?: string;
    batchId?: string;
}): Promise<TissGuide[]> => {
    try {
        const guidesRef = collection(db, 'tiss_guides');
        let q = query(guidesRef, where('professionalId', '==', professionalId), orderBy('serviceDate', 'desc'));

        if (filters?.insuranceId) {
            q = query(guidesRef, where('professionalId', '==', professionalId), where('insuranceId', '==', filters.insuranceId), orderBy('serviceDate', 'desc'));
        }
        if (filters?.status) {
            q = query(guidesRef, where('professionalId', '==', professionalId), where('status', '==', filters.status), orderBy('serviceDate', 'desc'));
        }
        if (filters?.batchId) {
            q = query(guidesRef, where('professionalId', '==', professionalId), where('batchId', '==', filters.batchId), orderBy('serviceDate', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TissGuide));
    } catch (error) {
        console.error('Erro ao buscar guias:', error);
        return [];
    }
};

export const updateTissGuide = async (
    guideId: string,
    data: Partial<Omit<TissGuide, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const guideRef = doc(db, 'tiss_guides', guideId);
        await updateDoc(guideRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar guia:', error);
        return false;
    }
};

// ==================== TISS BATCHES ====================

export const addTissBatch = async (
    batch: Omit<TissBatch, 'id' | 'createdAt'>
): Promise<string | null> => {
    try {
        const batchesRef = collection(db, 'tiss_batches');
        const docRef = await addDoc(batchesRef, {
            ...batch,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao criar lote:', error);
        return null;
    }
};

export const getTissBatches = async (professionalId: string, insuranceId?: string): Promise<TissBatch[]> => {
    try {
        const batchesRef = collection(db, 'tiss_batches');
        let q;
        if (insuranceId) {
            q = query(batchesRef, where('professionalId', '==', professionalId), where('insuranceId', '==', insuranceId), orderBy('createdAt', 'desc'));
        } else {
            q = query(batchesRef, where('professionalId', '==', professionalId), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TissBatch));
    } catch (error) {
        console.error('Erro ao buscar lotes:', error);
        return [];
    }
};

export const updateTissBatch = async (
    batchId: string,
    data: Partial<Omit<TissBatch, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const batchRef = doc(db, 'tiss_batches', batchId);
        await updateDoc(batchRef, data);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar lote:', error);
        return false;
    }
};

// ==================== TISS GLOSAS ====================

export const addTissGlosa = async (
    glosa: Omit<TissGlosa, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const glosasRef = collection(db, 'tiss_glosas');
        const docRef = await addDoc(glosasRef, {
            ...glosa,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar glosa:', error);
        return null;
    }
};

export const getTissGlosas = async (professionalId: string, filters?: {
    insuranceId?: string;
    status?: string;
}): Promise<TissGlosa[]> => {
    try {
        const glosasRef = collection(db, 'tiss_glosas');
        let q = query(glosasRef, where('professionalId', '==', professionalId), orderBy('glosaDate', 'desc'));

        if (filters?.insuranceId) {
            q = query(glosasRef, where('professionalId', '==', professionalId), where('insuranceId', '==', filters.insuranceId), orderBy('glosaDate', 'desc'));
        }
        if (filters?.status) {
            q = query(glosasRef, where('professionalId', '==', professionalId), where('status', '==', filters.status), orderBy('glosaDate', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TissGlosa));
    } catch (error) {
        console.error('Erro ao buscar glosas:', error);
        return [];
    }
};

export const updateTissGlosa = async (
    glosaId: string,
    data: Partial<Omit<TissGlosa, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const glosaRef = doc(db, 'tiss_glosas', glosaId);
        await updateDoc(glosaRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar glosa:', error);
        return false;
    }
};

// ==================== XML GENERATION ====================

export const generateTissXml = (batch: TissBatch, guides: TissGuide[]): string => {
    // Simplified TISS XML structure
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const timestamp = new Date().toISOString();

    let xml = `${xmlHeader}
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
    <ans:cabecalho>
        <ans:identificacaoTransacao>
            <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
            <ans:sequencialTransacao>${batch.batchNumber}</ans:sequencialTransacao>
            <ans:dataTransacao>${timestamp}</ans:dataTransacao>
        </ans:identificacaoTransacao>
        <ans:origem>
            <ans:identificacaoPrestador>
                <ans:codigoPrestadorNaOperadora>PRESTADOR_001</ans:codigoPrestadorNaOperadora>
            </ans:identificacaoPrestador>
        </ans:origem>
        <ans:destino>
            <ans:registroANS>${batch.insuranceName}</ans:registroANS>
        </ans:destino>
    </ans:cabecalho>
    <ans:prestadorParaOperadora>
        <ans:loteGuias>
            <ans:numeroLote>${batch.batchNumber}</ans:numeroLote>
            <ans:guias>`;

    guides.forEach(guide => {
        xml += `
                <ans:guiaConsulta>
                    <ans:numeroGuia>${guide.guideNumber}</ans:numeroGuia>
                    <ans:dadosBeneficiario>
                        <ans:nomeBeneficiario>${guide.patientName}</ans:nomeBeneficiario>
                        <ans:numeroCarteira>${guide.patientCardNumber || 'N/A'}</ans:numeroCarteira>
                    </ans:dadosBeneficiario>
                    <ans:dadosExecutante>
                        <ans:nomeContratado>${guide.professionalName}</ans:nomeContratado>
                        <ans:conselhoProfissional>${guide.professionalCrm || 'N/A'}</ans:conselhoProfissional>
                    </ans:dadosExecutante>
                    <ans:dataAtendimento>${guide.serviceDate}</ans:dataAtendimento>
                    <ans:procedimentos>`;

        guide.procedures.forEach(proc => {
            xml += `
                        <ans:procedimento>
                            <ans:codigoProcedimento>${proc.code}</ans:codigoProcedimento>
                            <ans:descricaoProcedimento>${proc.description}</ans:descricaoProcedimento>
                            <ans:quantidadeExecutada>${proc.quantity}</ans:quantidadeExecutada>
                            <ans:valorUnitario>${proc.unitPrice.toFixed(2)}</ans:valorUnitario>
                            <ans:valorTotal>${proc.totalPrice.toFixed(2)}</ans:valorTotal>
                        </ans:procedimento>`;
        });

        xml += `
                    </ans:procedimentos>
                    <ans:valorTotal>${guide.totalValue.toFixed(2)}</ans:valorTotal>
                </ans:guiaConsulta>`;
    });

    xml += `
            </ans:guias>
        </ans:loteGuias>
    </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

    return xml;
};
