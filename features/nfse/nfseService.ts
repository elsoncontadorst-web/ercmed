import { httpsCallable } from 'firebase/functions';
import { getCloudFunctions } from '../../services/firebase';
import type {
    NfseCertificateStatus,
    NfseDraft,
    NfseEmissionResult,
    NfseFiscalProfile,
    NfseHistoryItem,
    NfsePreparationResult
} from './types';

const callable = <Request, Response>(name: string) =>
    httpsCallable<Request, Response>(getCloudFunctions(), name);

export async function getNfseFiscalProfile(clinicId: string, competence: string): Promise<NfseFiscalProfile | null> {
    const response = await callable<{ clinicId: string; competence: string }, { profile: NfseFiscalProfile | null }>('consultarPerfilFiscalNfse')({ clinicId, competence });
    return response.data.profile;
}

export async function saveNfseFiscalProfile(clinicId: string, profile: NfseFiscalProfile): Promise<NfseFiscalProfile> {
    const response = await callable<{ clinicId: string; profile: NfseFiscalProfile }, { saved: boolean; profile: NfseFiscalProfile }>('salvarPerfilFiscalNfse')({ clinicId, profile });
    return response.data.profile;
}

export async function prepareNationalNfse(clinicId: string, draft: NfseDraft): Promise<NfsePreparationResult> {
    return (await callable<{ clinicId: string; draft: NfseDraft }, NfsePreparationResult>('prepararNfseNacional')({ clinicId, draft })).data;
}

export async function configureNfseCertificate(clinicId: string, file: File, password: string) {
    const pfxBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Não foi possível ler o certificado.'));
        reader.readAsDataURL(file);
    });
    return (await callable<{ clinicId: string; pfxBase64: string; password: string }, { configured: boolean; subject: string; expiresAt: string }>('configurarCertificadoNfse')({ clinicId, pfxBase64, password })).data;
}

export async function getNfseCertificateStatus(clinicId: string): Promise<NfseCertificateStatus> {
    return (await callable<{ clinicId: string }, NfseCertificateStatus>('consultarConfiguracaoNfse')({ clinicId })).data;
}

export async function issueNfse(clinicId: string, draft: NfseDraft): Promise<NfseEmissionResult> {
    const production = draft.environment === 'producao';
    const name = production ? 'emitirNfseProducao' : 'emitirNfseHomologacao';
    return (await callable<{ clinicId: string; draft: NfseDraft; confirmation?: string }, NfseEmissionResult>(name)({
        clinicId,
        draft,
        confirmation: production ? 'EMITIR NFS-E REAL' : undefined
    })).data;
}

export async function listNationalNfse(clinicId: string): Promise<NfseHistoryItem[]> {
    return (await callable<{ clinicId: string }, { documents: NfseHistoryItem[] }>('listarNfseNacional')({ clinicId })).data.documents;
}

export async function downloadNationalNfseXml(clinicId: string, id: string): Promise<void> {
    const document = (await callable<{ clinicId: string; id: string }, { authorizedXml?: string; signedDpsXml?: string; accessKey?: string }>('obterNfseNacional')({ clinicId, id })).data;
    const content = document.authorizedXml || document.signedDpsXml;
    if (!content) throw new Error('XML ainda não está disponível.');
    const url = URL.createObjectURL(new Blob([content], { type: 'application/xml;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `nfse-${document.accessKey || id}.xml`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadNationalDanfse(clinicId: string, id: string): Promise<void> {
    const result = (await callable<{ clinicId: string; id: string }, { pdfBase64: string; accessKey: string }>('obterDanfseNacional')({ clinicId, id })).data;
    const bytes = Uint8Array.from(atob(result.pdfBase64), character => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `danfse-${result.accessKey}.pdf`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printNationalDanfse(clinicId: string, id: string): Promise<void> {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Permita a abertura de pop-ups para imprimir o DANFSe.');
    printWindow.document.write('<!doctype html><title>Preparando DANFSe...</title><p style="font:16px sans-serif;padding:24px">Carregando o DANFSe oficial...</p>');
    try {
        const result = (await callable<{ clinicId: string; id: string }, { pdfBase64: string; accessKey: string }>('obterDanfseNacional')({ clinicId, id })).data;
        const bytes = Uint8Array.from(atob(result.pdfBase64), character => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        printWindow.location.replace(url);
        window.setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 2500);
        window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    } catch (error) {
        printWindow.close();
        throw error;
    }
}

export async function verifyNationalNfse(clinicId: string, id: string) {
    return (await callable<{ clinicId: string; id: string }, { authorized: boolean; status: string; accessKey?: string }>('verificarDpsNfseProducao')({ clinicId, id })).data;
}

export async function deleteRejectedNationalNfse(clinicId: string, id: string): Promise<void> {
    await callable<{ clinicId: string; id: string }, { deleted: boolean }>('excluirNfseRejeitada')({ clinicId, id });
}
