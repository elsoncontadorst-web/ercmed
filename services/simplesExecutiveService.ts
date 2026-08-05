export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';

interface FaixaSimples {
  faixa: number;
  limite: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
}

const TABELAS_SIMPLES: Record<AnexoSimples, FaixaSimples[]> = {
  I: [
    { faixa: 1, limite: 180000, aliquotaNominal: 4.0, parcelaDeduzir: 0 },
    { faixa: 2, limite: 360000, aliquotaNominal: 7.3, parcelaDeduzir: 5940 },
    { faixa: 3, limite: 720000, aliquotaNominal: 9.5, parcelaDeduzir: 13860 },
    { faixa: 4, limite: 1800000, aliquotaNominal: 10.7, parcelaDeduzir: 22500 },
    { faixa: 5, limite: 3600000, aliquotaNominal: 14.3, parcelaDeduzir: 87300 },
    { faixa: 6, limite: 4800000, aliquotaNominal: 19.0, parcelaDeduzir: 378000 }
  ],
  II: [
    { faixa: 1, limite: 180000, aliquotaNominal: 4.5, parcelaDeduzir: 0 },
    { faixa: 2, limite: 360000, aliquotaNominal: 7.8, parcelaDeduzir: 5940 },
    { faixa: 3, limite: 720000, aliquotaNominal: 10.0, parcelaDeduzir: 13860 },
    { faixa: 4, limite: 1800000, aliquotaNominal: 11.2, parcelaDeduzir: 22500 },
    { faixa: 5, limite: 3600000, aliquotaNominal: 14.7, parcelaDeduzir: 85500 },
    { faixa: 6, limite: 4800000, aliquotaNominal: 30.0, parcelaDeduzir: 720000 }
  ],
  III: [
    { faixa: 1, limite: 180000, aliquotaNominal: 6.0, parcelaDeduzir: 0 },
    { faixa: 2, limite: 360000, aliquotaNominal: 11.2, parcelaDeduzir: 9360 },
    { faixa: 3, limite: 720000, aliquotaNominal: 13.5, parcelaDeduzir: 17640 },
    { faixa: 4, limite: 1800000, aliquotaNominal: 16.0, parcelaDeduzir: 35640 },
    { faixa: 5, limite: 3600000, aliquotaNominal: 21.0, parcelaDeduzir: 125640 },
    { faixa: 6, limite: 4800000, aliquotaNominal: 33.0, parcelaDeduzir: 648000 }
  ],
  IV: [
    { faixa: 1, limite: 180000, aliquotaNominal: 4.5, parcelaDeduzir: 0 },
    { faixa: 2, limite: 360000, aliquotaNominal: 9.0, parcelaDeduzir: 8100 },
    { faixa: 3, limite: 720000, aliquotaNominal: 10.2, parcelaDeduzir: 12420 },
    { faixa: 4, limite: 1800000, aliquotaNominal: 14.0, parcelaDeduzir: 39780 },
    { faixa: 5, limite: 3600000, aliquotaNominal: 22.0, parcelaDeduzir: 183780 },
    { faixa: 6, limite: 4800000, aliquotaNominal: 33.0, parcelaDeduzir: 828000 }
  ],
  V: [
    { faixa: 1, limite: 180000, aliquotaNominal: 15.5, parcelaDeduzir: 0 },
    { faixa: 2, limite: 360000, aliquotaNominal: 18.0, parcelaDeduzir: 4500 },
    { faixa: 3, limite: 720000, aliquotaNominal: 19.5, parcelaDeduzir: 9900 },
    { faixa: 4, limite: 1800000, aliquotaNominal: 20.5, parcelaDeduzir: 17100 },
    { faixa: 5, limite: 3600000, aliquotaNominal: 23.0, parcelaDeduzir: 62100 },
    { faixa: 6, limite: 4800000, aliquotaNominal: 30.5, parcelaDeduzir: 540000 }
  ]
};

export interface ExecutiveSimplesSnapshot {
  anexo: AnexoSimples;
  rbt12: number;
  faixa: number;
  aliquotaNominal: number;
  aliquotaEfetiva: number;
  parcelaDeduzir: number;
  impostoMensalEstimado: number;
}

export interface SimplesTaxComponent {
  key: 'IRPJ' | 'CSLL' | 'COFINS' | 'PIS_PASEP' | 'CPP' | 'ISS' | 'ICMS' | 'IPI';
  label: string;
  sharePercent: number;
  effectivePercent: number;
  amount: number;
  applicable: boolean;
}

const SERVICE_PARTITIONS_2026: Record<'III' | 'V', number[][]> = {
  III: [[4, 3.5, 12.82, 2.78, 43.4, 33.5], [4, 3.5, 14.05, 3.05, 43.4, 32], [4, 3.5, 13.64, 2.96, 43.4, 32.5], [4, 3.5, 13.64, 2.96, 43.4, 32.5], [4, 3.5, 12.82, 2.78, 43.4, 33.5], [35, 15, 16.03, 3.47, 30.5, 0]],
  V: [[25, 15, 14.1, 3.05, 28.85, 14], [23, 15, 14.1, 3.05, 27.85, 17], [24, 15, 14.92, 3.23, 23.85, 19], [21, 15, 15.74, 3.41, 23.85, 21], [23, 12.5, 14.1, 3.05, 23.85, 23.5], [35, 15.5, 16.44, 3.56, 29.5, 0]],
};

export const calculateSimplesTaxComposition = (snapshot: ExecutiveSimplesSnapshot, revenue: number): SimplesTaxComponent[] => {
  if (snapshot.anexo !== 'III' && snapshot.anexo !== 'V') return [];
  const keys: SimplesTaxComponent['key'][] = ['IRPJ', 'CSLL', 'COFINS', 'PIS_PASEP', 'CPP', 'ISS'];
  const labels = ['IRPJ', 'CSLL', 'COFINS', 'PIS/Pasep', 'CPP', 'ISS'];
  const shares = [...SERVICE_PARTITIONS_2026[snapshot.anexo][Math.max(0, snapshot.faixa - 1)]];
  let effectiveRates = shares.map(share => snapshot.aliquotaEfetiva * share / 100);
  if (effectiveRates[5] > 5) {
    const federalWeight = shares.slice(0, 5).reduce((sum, share) => sum + share, 0);
    const federalEffective = Math.max(0, snapshot.aliquotaEfetiva - 5);
    effectiveRates = shares.map((share, index) => index === 5 ? 5 : federalEffective * share / federalWeight);
  }
  const components = keys.map((key, index) => ({ key, label: labels[index], sharePercent: snapshot.aliquotaEfetiva > 0 ? effectiveRates[index] / snapshot.aliquotaEfetiva * 100 : 0, effectivePercent: effectiveRates[index], amount: revenue * effectiveRates[index] / 100, applicable: true }));
  return [...components,
    { key: 'ICMS', label: 'ICMS', sharePercent: 0, effectivePercent: 0, amount: 0, applicable: false },
    { key: 'IPI', label: 'IPI', sharePercent: 0, effectivePercent: 0, amount: 0, applicable: false },
  ];
};

export const calculateExecutiveSimples = (
  faturamentoMensal: number,
  rbt12: number,
  anexo: AnexoSimples = 'III'
): ExecutiveSimplesSnapshot => {
  const tabela = TABELAS_SIMPLES[anexo];
  const faixa = tabela.find(item => rbt12 <= item.limite) || tabela[tabela.length - 1];
  const aliquotaEfetiva = rbt12 > 0
    ? Math.max(0, (((rbt12 * (faixa.aliquotaNominal / 100)) - faixa.parcelaDeduzir) / rbt12) * 100)
    : faixa.aliquotaNominal;

  return {
    anexo,
    rbt12,
    faixa: faixa.faixa,
    aliquotaNominal: faixa.aliquotaNominal,
    aliquotaEfetiva,
    parcelaDeduzir: faixa.parcelaDeduzir,
    impostoMensalEstimado: faturamentoMensal * (aliquotaEfetiva / 100)
  };
};
