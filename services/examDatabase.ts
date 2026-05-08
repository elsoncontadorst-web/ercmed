export interface ExamDefinition {
  name: string;
  category: string;
  subcategory?: string;
}

export const EXAM_DATABASE: ExamDefinition[] = [
  // 1. Exames Laboratoriais Gerais - Hematologia
  { name: "Hemograma completo", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Hematócrito", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Hemoglobina", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Contagem de plaquetas", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Reticulócitos", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "VHS (Velocidade de Hemossedimentação)", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Coagulograma", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "TAP/INR", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "TTPA", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Fibrinogênio", category: "Laboratorial", subcategory: "Hematologia" },
  { name: "Dímero-D", category: "Laboratorial", subcategory: "Hematologia" },

  // Bioquímica
  { name: "Glicemia em jejum", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Hemoglobina glicada (HbA1c)", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Insulina", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Peptídeo C", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Ureia", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Creatinina", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Ácido úrico", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Sódio", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Potássio", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Magnésio", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Cálcio", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Fósforo", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Cloro", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Osmolalidade", category: "Laboratorial", subcategory: "Bioquímica" },
  { name: "Lactato", category: "Laboratorial", subcategory: "Bioquímica" },

  // Perfil Lipídico
  { name: "Colesterol total", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "HDL", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "LDL", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "VLDL", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "Triglicerídeos", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "Lipoproteína(a)", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "Apolipoproteína A1", category: "Laboratorial", subcategory: "Perfil Lipídico" },
  { name: "Apolipoproteína B", category: "Laboratorial", subcategory: "Perfil Lipídico" },

  // Função Hepática
  { name: "TGO (AST)", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "TGP (ALT)", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "GGT", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "Fosfatase alcalina", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "Bilirrubina total e frações", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "Albumina", category: "Laboratorial", subcategory: "Função Hepática" },
  { name: "Proteínas totais e frações", category: "Laboratorial", subcategory: "Função Hepática" },

  // Função Renal
  { name: "Clearance de creatinina", category: "Laboratorial", subcategory: "Função Renal" },
  { name: "Proteinúria", category: "Laboratorial", subcategory: "Função Renal" },
  { name: "Microalbuminúria", category: "Laboratorial", subcategory: "Função Renal" },
  { name: "Relação albumina/creatinina", category: "Laboratorial", subcategory: "Função Renal" },

  // 2. Exames Hormonais - Tireoide
  { name: "TSH", category: "Hormonal", subcategory: "Tireoide" },
  { name: "T3", category: "Hormonal", subcategory: "Tireoide" },
  { name: "T4 livre", category: "Hormonal", subcategory: "Tireoide" },
  { name: "T4 total", category: "Hormonal", subcategory: "Tireoide" },
  { name: "Anti-TPO", category: "Hormonal", subcategory: "Tireoide" },
  { name: "Anti-tireoglobulina", category: "Hormonal", subcategory: "Tireoide" },
  { name: "TRAb", category: "Hormonal", subcategory: "Tireoide" },

  // Hormônios Sexuais Masculinos
  { name: "Testosterona total", category: "Hormonal", subcategory: "Masculino" },
  { name: "Testosterona livre", category: "Hormonal", subcategory: "Masculino" },
  { name: "SHBG", category: "Hormonal", subcategory: "Masculino" },
  { name: "LH", category: "Hormonal", subcategory: "Masculino" },
  { name: "FSH", category: "Hormonal", subcategory: "Masculino" },
  { name: "Estradiol", category: "Hormonal", subcategory: "Masculino" },
  { name: "Prolactina", category: "Hormonal", subcategory: "Masculino" },
  { name: "DHT", category: "Hormonal", subcategory: "Masculino" },

  // Hormônios Sexuais Femininos
  { name: "AMH (Hormônio Anti-mülleriano)", category: "Hormonal", subcategory: "Feminino" },
  { name: "Progesterona", category: "Hormonal", subcategory: "Feminino" },
  { name: "Beta-hCG", category: "Hormonal", subcategory: "Feminino" },
  { name: "Androstenediona", category: "Hormonal", subcategory: "Feminino" },

  // Adrenais
  { name: "Cortisol", category: "Hormonal", subcategory: "Adrenais" },
  { name: "ACTH", category: "Hormonal", subcategory: "Adrenais" },
  { name: "DHEA", category: "Hormonal", subcategory: "Adrenais" },
  { name: "DHEA-S", category: "Hormonal", subcategory: "Adrenais" },
  { name: "Aldosterona", category: "Hormonal", subcategory: "Adrenais" },
  { name: "Renina", category: "Hormonal", subcategory: "Adrenais" },

  // Metabólicos/Vitaminas
  { name: "Vitamina D", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Vitamina B12", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Ácido fólico", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Ferritina", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Zinco", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Cobre", category: "Laboratorial", subcategory: "Metabólicos" },
  { name: "Selênio", category: "Laboratorial", subcategory: "Metabólicos" },

  // 3. Exames Cardiológicos
  { name: "Eletrocardiograma (ECG)", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Ecocardiograma", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Holter 24h", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "MAPA 24h", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Teste ergométrico", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Angiotomografia coronária", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Cateterismo cardíaco", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Cintilografia miocárdica", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Doppler vascular", category: "Imagem/Funcional", subcategory: "Cardiológico" },
  { name: "Ultrassom Doppler carotídeo", category: "Imagem/Funcional", subcategory: "Cardiológico" },

  // 4. Exames Neurológicos
  { name: "Eletroencefalograma (EEG)", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Eletroneuromiografia", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Potencial evocado", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Polissonografia", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Tomografia de crânio", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Ressonância magnética cerebral", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Angiorressonância", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "PET-CT cerebral", category: "Imagem/Funcional", subcategory: "Neurológico" },
  { name: "Punção lombar", category: "Imagem/Funcional", subcategory: "Neurológico" },

  // 5. Exames Gastroenterológicos
  { name: "Endoscopia digestiva alta", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "Colonoscopia", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "Retossigmoidoscopia", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "Pesquisa de sangue oculto nas fezes", category: "Laboratorial", subcategory: "Gastroenterológico" },
  { name: "Elastografia hepática", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "PHmetria", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "Manometria esofágica", category: "Imagem/Funcional", subcategory: "Gastroenterológico" },
  { name: "Coprocultura", category: "Laboratorial", subcategory: "Gastroenterológico" },
  { name: "Parasitológico de fezes", category: "Laboratorial", subcategory: "Gastroenterológico" },
  { name: "Calprotectina fecal", category: "Laboratorial", subcategory: "Gastroenterológico" },

  // 6. Exames Pulmonares
  { name: "Espirometria", category: "Imagem/Funcional", subcategory: "Pulmonar" },
  { name: "Gasometria arterial", category: "Laboratorial", subcategory: "Pulmonar" },
  { name: "Broncoscopia", category: "Imagem/Funcional", subcategory: "Pulmonar" },
  { name: "Tomografia de tórax", category: "Imagem/Funcional", subcategory: "Pulmonar" },
  { name: "Radiografia de tórax", category: "Imagem/Funcional", subcategory: "Pulmonar" },
  { name: "Oximetria", category: "Imagem/Funcional", subcategory: "Pulmonar" },
  { name: "Prova de função pulmonar", category: "Imagem/Funcional", subcategory: "Pulmonar" },

  // 7. Exames Urológicos e Nefrológicos
  { name: "PSA total", category: "Laboratorial", subcategory: "Urológico" },
  { name: "PSA livre", category: "Laboratorial", subcategory: "Urológico" },
  { name: "Urina tipo 1 (EAS)", category: "Laboratorial", subcategory: "Urológico" },
  { name: "Urocultura", category: "Laboratorial", subcategory: "Urológico" },
  { name: "Ultrassom de rins e vias urinárias", category: "Imagem/Funcional", subcategory: "Urológico" },
  { name: "Fluxometria urinária", category: "Imagem/Funcional", subcategory: "Urológico" },
  { name: "Cistoscopia", category: "Imagem/Funcional", subcategory: "Urológico" },
  { name: "Espermograma", category: "Laboratorial", subcategory: "Urológico" },

  // 8. Exames Ginecológicos e Obstétricos
  { name: "Papanicolau", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Colposcopia", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Ultrassom transvaginal", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Mamografia", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Ultrassom mamário", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Histerossalpingografia", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Cardiotocografia", category: "Imagem/Funcional", subcategory: "Ginecológico" },
  { name: "Ultrassom obstétrico", category: "Imagem/Funcional", subcategory: "Obstétrico" },
  { name: "Morfológico fetal", category: "Imagem/Funcional", subcategory: "Obstétrico" },
  { name: "NIPT", category: "Laboratorial/Genético", subcategory: "Obstétrico" },

  // 9. Exames Oncológicos (Marcadores)
  { name: "CEA", category: "Oncológico", subcategory: "Marcadores" },
  { name: "CA 19-9", category: "Oncológico", subcategory: "Marcadores" },
  { name: "CA 125", category: "Oncológico", subcategory: "Marcadores" },
  { name: "AFP", category: "Oncológico", subcategory: "Marcadores" },
  { name: "CA 15-3", category: "Oncológico", subcategory: "Marcadores" },
  { name: "Calcitonina", category: "Oncológico", subcategory: "Marcadores" },

  // 10. Exames Infectológicos (Sorologias)
  { name: "HIV (Anti-HIV)", category: "Infectológico", subcategory: "Sorologias" },
  { name: "Hepatite A/B/C", category: "Infectológico", subcategory: "Sorologias" },
  { name: "Sífilis (VDRL/FTA-ABS)", category: "Infectológico", subcategory: "Sorologias" },
  { name: "Dengue/Zika/Chikungunya", category: "Infectológico", subcategory: "Sorologias" },
  { name: "COVID-19 (PCR/Antígeno)", category: "Infectológico", subcategory: "Sorologias" },
  { name: "Toxoplasmose/Citomegalovírus", category: "Infectológico", subcategory: "Sorologias" },

  // 11. Autoimunes
  { name: "FAN (Fator Antinúcleo)", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "Anti-DNA", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "Fator reumatoide", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "Anti-CCP", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "ANCA", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "Complemento C3/C4", category: "Autoimune", subcategory: "Reumatológico" },
  { name: "HLA-B27", category: "Autoimune", subcategory: "Reumatológico" },

  // 12. Genéticos
  { name: "Cariótipo", category: "Genético", subcategory: "Molecular" },
  { name: "Painel genético", category: "Genético", subcategory: "Molecular" },
  { name: "Sequenciamento genético", category: "Genético", subcategory: "Molecular" },
  { name: "Exoma", category: "Genético", subcategory: "Molecular" },
  { name: "PCR genético", category: "Genético", subcategory: "Molecular" },
  { name: "Testes farmacogenéticos", category: "Genético", subcategory: "Molecular" },

  // 14. Imagem Adicional
  { name: "Densitometria óssea", category: "Imagem", subcategory: "Radiologia" },
  { name: "PET-CT", category: "Imagem", subcategory: "Medicina Nuclear" },
  { name: "Cintilografia", category: "Imagem", subcategory: "Medicina Nuclear" },

  // 19. Nutricionais e Metabólicos
  { name: "Bioimpedância", category: "Nutricional", subcategory: "Metabólico" },
  { name: "Taxa metabólica basal", category: "Nutricional", subcategory: "Metabólico" },
  { name: "Perfil vitamínico completo", category: "Nutricional", subcategory: "Metabólico" },
  { name: "Perfil mineral intracelular", category: "Nutricional", subcategory: "Metabólico" },

  // 20. Funcionais e Integrativos
  { name: "Microbioma intestinal", category: "Funcional", subcategory: "Integrativo" },
  { name: "Intolerância alimentar (IgG)", category: "Funcional", subcategory: "Integrativo" },
  { name: "Estresse oxidativo", category: "Funcional", subcategory: "Integrativo" },
  { name: "Perfil inflamatório avançado", category: "Funcional", subcategory: "Integrativo" }
];
