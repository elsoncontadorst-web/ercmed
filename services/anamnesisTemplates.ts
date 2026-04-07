// Multiprofessional Anamnesis Templates
// Each template defines the structure for a specific healthcare profession

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'escala' | 'boolean';

export interface AnamnesisFieldDef {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];        // For select / radio / checkbox
  min?: number;              // For escala / number
  max?: number;              // For escala / number
  placeholder?: string;
  required?: boolean;
}

export interface AnamnesisSection {
  id: string;
  title: string;
  fields: AnamnesisFieldDef[];
}

export interface AnamnesisTemplate {
  id: string;
  name: string;             // Display name
  profession: string;       // Profession key
  icon: string;             // Emoji icon for visual identification
  color: string;            // Tailwind color class
  sections: AnamnesisSection[];
}

// ============================================================
// 1. ANAMNESE PSICOLÓGICA
// ============================================================
export const TEMPLATE_PSICOLOGICA: AnamnesisTemplate = {
  id: 'psicologica',
  name: 'Anamnese Psicológica',
  profession: 'Psicólogo(a)',
  icon: '🧠',
  color: 'purple',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação',
      fields: [
        { id: 'nome', label: 'Nome', type: 'text', required: true },
        { id: 'idade', label: 'Idade', type: 'number' },
        { id: 'sexo', label: 'Sexo', type: 'select', options: ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'] },
        { id: 'escolaridade', label: 'Escolaridade', type: 'text' },
        { id: 'profissao', label: 'Profissão', type: 'text' },
        { id: 'responsavel', label: 'Responsável (se criança/adolescente)', type: 'text' },
      ]
    },
    {
      id: 'queixa',
      title: 'Queixa Principal',
      fields: [
        { id: 'motivo_procura', label: 'Motivo da procura pelo atendimento', type: 'textarea', placeholder: 'Descreva o motivo que levou o paciente a buscar ajuda...' },
        { id: 'quem_encaminhou', label: 'Quem encaminhou', type: 'text', placeholder: 'Ex: Médico, familiar, espontâneo...' },
        { id: 'expectativa', label: 'Expectativa em relação ao atendimento', type: 'textarea' },
      ]
    },
    {
      id: 'historico_problema',
      title: 'Histórico do Problema',
      fields: [
        { id: 'quando_comecou', label: 'Quando começou o problema', type: 'text' },
        { id: 'frequencia', label: 'Frequência com que ocorre', type: 'text' },
        { id: 'situacoes', label: 'Situações em que ocorre', type: 'textarea' },
        { id: 'impacto_vida', label: 'Impacto na vida do paciente', type: 'textarea' },
      ]
    },
    {
      id: 'historico_pessoal',
      title: 'Histórico Pessoal',
      fields: [
        { id: 'gravidez', label: 'Informações sobre a gravidez (se relevante)', type: 'textarea' },
        { id: 'desenvolvimento_infantil', label: 'Desenvolvimento infantil', type: 'textarea' },
        { id: 'relacoes_familiares', label: 'Relações familiares na infância', type: 'textarea' },
        { id: 'escolarizacao', label: 'Escolarização', type: 'textarea' },
        { id: 'trabalho', label: 'Histórico profissional/trabalho', type: 'textarea' },
      ]
    },
    {
      id: 'historico_familiar',
      title: 'Histórico Familiar',
      fields: [
        { id: 'rel_familiar_atual', label: 'Relacionamento familiar atual', type: 'textarea' },
        { id: 'historico_transtornos', label: 'Histórico de transtornos mentais na família', type: 'textarea' },
        { id: 'uso_substancias_familia', label: 'Uso de substâncias na família', type: 'textarea' },
      ]
    },
    {
      id: 'aspectos_emocionais',
      title: 'Aspectos Emocionais',
      fields: [
        { id: 'ansiedade', label: 'Ansiedade (descrição, frequência, gatilhos)', type: 'textarea' },
        { id: 'humor', label: 'Humor predominante', type: 'textarea' },
        { id: 'medos', label: 'Medos / Fobias', type: 'textarea' },
        { id: 'comportamentos', label: 'Comportamentos relevantes', type: 'textarea' },
      ]
    },
    {
      id: 'vida_social',
      title: 'Vida Social',
      fields: [
        { id: 'amizades', label: 'Amizades e relações sociais', type: 'textarea' },
        { id: 'lazer', label: 'Atividades de lazer', type: 'textarea' },
        { id: 'relacoes_afetivas', label: 'Relações afetivas', type: 'textarea' },
      ]
    },
    {
      id: 'medicamentos',
      title: 'Uso de Medicamentos',
      fields: [
        { id: 'psicofarmacos', label: 'Psicofármacos em uso', type: 'textarea', placeholder: 'Nome, dosagem, frequência...' },
        { id: 'acompanhamento_psiquiatrico', label: 'Possui acompanhamento psiquiátrico', type: 'boolean' },
      ]
    },
    {
      id: 'hipotese',
      title: 'Hipótese Inicial',
      fields: [
        { id: 'impressoes_clinicas', label: 'Impressões clínicas iniciais', type: 'textarea', placeholder: 'Observações, hipóteses diagnósticas, indicadores...' },
      ]
    }
  ]
};

// ============================================================
// 2. ANAMNESE FONOAUDIOLÓGICA
// ============================================================
export const TEMPLATE_FONOAUDIOLOGIA: AnamnesisTemplate = {
  id: 'fonoaudiologia',
  name: 'Anamnese Fonoaudiológica',
  profession: 'Fonoaudiólogo(a)',
  icon: '🗣️',
  color: 'blue',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação',
      fields: [
        { id: 'nome', label: 'Nome', type: 'text', required: true },
        { id: 'idade', label: 'Idade', type: 'number' },
        { id: 'responsavel', label: 'Responsável (nome e parentesco)', type: 'text' },
        { id: 'escola', label: 'Escola (se criança)', type: 'text' },
      ]
    },
    {
      id: 'queixa',
      title: 'Queixa Principal',
      fields: [
        { id: 'descricao_queixa', label: 'Descrição da queixa', type: 'textarea', placeholder: 'Descreva o problema de comunicação observado...' },
        { id: 'tipo_queixa', label: 'Tipo de queixa (marque os que se aplicam)', type: 'checkbox', options: ['Atraso na fala', 'Dificuldade de pronúncia', 'Gagueira', 'Alteração de voz', 'Dificuldade de leitura/escrita', 'Problemas de deglutição', 'Perda auditiva'] },
        { id: 'quem_percebeu', label: 'Quem percebeu o problema', type: 'text' },
      ]
    },
    {
      id: 'gestacional',
      title: 'Histórico Gestacional',
      fields: [
        { id: 'gestacao', label: 'Como foi a gravidez', type: 'textarea' },
        { id: 'complicacoes', label: 'Complicações durante a gestação', type: 'textarea' },
        { id: 'tipo_parto', label: 'Tipo de parto', type: 'select', options: ['Normal', 'Cesárea', 'Fórceps', 'Outro'] },
        { id: 'prematuridade', label: 'Idade gestacional ao nascer (semanas)', type: 'number' },
      ]
    },
    {
      id: 'desenvolvimento',
      title: 'Desenvolvimento Neuropsicomotor',
      fields: [
        { id: 'meses_sentou', label: 'Sentou com quantos meses', type: 'number' },
        { id: 'meses_engatinhou', label: 'Engatinhou com quantos meses', type: 'number' },
        { id: 'meses_andou', label: 'Andou com quantos meses', type: 'number' },
        { id: 'primeiras_palavras_meses', label: 'Primeiras palavras com quantos meses', type: 'number' },
        { id: 'frases_meses', label: 'Primeiras frases com quantos meses', type: 'number' },
      ]
    },
    {
      id: 'linguagem',
      title: 'Desenvolvimento da Linguagem',
      fields: [
        { id: 'vocabulario_atual', label: 'Vocabulário atual', type: 'textarea', placeholder: 'Quantidade de palavras, diversidade...' },
        { id: 'compreensao_verbal', label: 'Compreensão verbal', type: 'textarea', placeholder: 'Segue comandos? Simples ou complexos?' },
        { id: 'articulacao', label: 'Articulação e pronúncia', type: 'textarea' },
      ]
    },
    {
      id: 'audicao',
      title: 'Audição',
      fields: [
        { id: 'teste_orelhinha', label: 'Fez o teste da orelhinha ao nascer', type: 'boolean' },
        { id: 'resultado_teste', label: 'Resultado do teste', type: 'text' },
        { id: 'infeccoes_ouvido', label: 'Infecções de ouvido (otites)', type: 'textarea' },
        { id: 'dificuldade_auditiva', label: 'Apresenta dificuldade auditiva', type: 'boolean' },
      ]
    },
    {
      id: 'alimentacao',
      title: 'Alimentação e Deglutição',
      fields: [
        { id: 'mastigacao', label: 'Mastigação', type: 'textarea', placeholder: 'Dificuldades, preferências, tempo...' },
        { id: 'deglutição', label: 'Deglutição', type: 'textarea' },
        { id: 'engasgos', label: 'Engasgos frequentes', type: 'textarea' },
        { id: 'amamentacao', label: 'Amamentação (histórico)', type: 'textarea' },
      ]
    },
    {
      id: 'escolarizacao',
      title: 'Escolarização e Socialização',
      fields: [
        { id: 'dificuldades_escolares', label: 'Dificuldades escolares observadas', type: 'textarea' },
        { id: 'interacao_social', label: 'Interação social com colegas', type: 'textarea' },
        { id: 'atendimento_anterior', label: 'Já fez fonoterapia antes', type: 'boolean' },
        { id: 'descricao_atendimento_anterior', label: 'Descreva o atendimento anterior', type: 'textarea' },
      ]
    }
  ]
};

// ============================================================
// 3. ANAMNESE DE TERAPIA OCUPACIONAL
// ============================================================
export const TEMPLATE_TERAPIA_OCUPACIONAL: AnamnesisTemplate = {
  id: 'terapia_ocupacional',
  name: 'Anamnese de Terapia Ocupacional',
  profession: 'Terapeuta Ocupacional',
  icon: '🖐️',
  color: 'green',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação',
      fields: [
        { id: 'nome', label: 'Nome', type: 'text', required: true },
        { id: 'idade', label: 'Idade', type: 'number' },
        { id: 'responsavel', label: 'Responsável (se menor)', type: 'text' },
        { id: 'diagnostico', label: 'Diagnóstico médico (se houver)', type: 'text' },
      ]
    },
    {
      id: 'queixa',
      title: 'Queixa Principal',
      fields: [
        { id: 'descricao_queixa', label: 'Descrição da queixa', type: 'textarea', placeholder: 'Por que busca a Terapia Ocupacional?' },
        { id: 'objetivo_tratamento', label: 'Objetivo esperado com o tratamento', type: 'textarea' },
      ]
    },
    {
      id: 'desenvolvimento',
      title: 'Desenvolvimento Infantil',
      fields: [
        { id: 'desenvolvimento_geral', label: 'Desenvolvimento geral (marcos)', type: 'textarea' },
        { id: 'historico_gestacional', label: 'Histórico gestacional relevante', type: 'textarea' },
        { id: 'complicacoes_nascimento', label: 'Complicações ao nascimento', type: 'textarea' },
      ]
    },
    {
      id: 'habilidades_funcionais',
      title: 'Habilidades Funcionais (AVDs)',
      fields: [
        { id: 'alimentacao', label: 'Alimentação (come sozinho, utensílios, dieta)', type: 'textarea' },
        { id: 'higiene', label: 'Higiene pessoal (banho, escovação, sanitário)', type: 'textarea' },
        { id: 'vestuario', label: 'Vestuário (se veste/despe, botões, cadarços)', type: 'textarea' },
        { id: 'escrita', label: 'Escrita (pega lápis, traçado, pressão)', type: 'textarea' },
        { id: 'coordenacao_motora', label: 'Coordenação motora (fina e ampla)', type: 'textarea' },
      ]
    },
    {
      id: 'sensorial',
      title: 'Sensibilidade Sensorial',
      fields: [
        { id: 'hipersensibilidade', label: 'Hipersensibilidade (o que incomoda)', type: 'textarea', placeholder: 'Toque, sons, texturas, luz...' },
        { id: 'hipossensibilidade', label: 'Hipossensibilidade (busca de estímulos)', type: 'textarea' },
        { id: 'comportamentos_senso', label: 'Comportamentos relacionados à sensorialidade', type: 'textarea' },
      ]
    },
    {
      id: 'rotina',
      title: 'Rotina Diária',
      fields: [
        { id: 'rotina_escola', label: 'Na escola (participação, interação, dificuldades)', type: 'textarea' },
        { id: 'brincadeiras', label: 'Brincadeiras e atividades preferidas', type: 'textarea' },
        { id: 'sono', label: 'Sono (qualidade, ritual, problemas)', type: 'textarea' },
        { id: 'tela', label: 'Tempo de tela', type: 'text' },
      ]
    },
    {
      id: 'autonomia',
      title: 'Autonomia e Participação',
      fields: [
        { id: 'independencia', label: 'Nível de independência nas tarefas', type: 'escala', min: 0, max: 10 },
        { id: 'descricao_autonomia', label: 'Descrição do nível de autonomia', type: 'textarea' },
        { id: 'contexto_social', label: 'Participação em contextos sociais', type: 'textarea' },
      ]
    }
  ]
};

// ============================================================
// 4. ANAMNESE DE FISIOTERAPIA (campos básicos)
// ============================================================
export const TEMPLATE_FISIOTERAPIA: AnamnesisTemplate = {
  id: 'fisioterapia',
  name: 'Anamnese de Fisioterapia',
  profession: 'Fisioterapeuta',
  icon: '🦴',
  color: 'orange',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação',
      fields: [
        { id: 'nome', label: 'Nome', type: 'text', required: true },
        { id: 'idade', label: 'Idade', type: 'number' },
        { id: 'diagnostico_clinico', label: 'Diagnóstico clínico/médico', type: 'text' },
        { id: 'data_inicio_sintomas', label: 'Data de início dos sintomas', type: 'date' },
      ]
    },
    {
      id: 'queixa',
      title: 'Queixa Principal',
      fields: [
        { id: 'queixa_principal', label: 'Queixa principal', type: 'textarea', required: true },
        { id: 'localizacao_dor', label: 'Localização da dor/problema', type: 'text' },
        { id: 'intensidade_dor', label: 'Intensidade da dor (0 a 10)', type: 'escala', min: 0, max: 10 },
        { id: 'caracteristica_dor', label: 'Característica da dor', type: 'select', options: ['Contínua', 'Intermitente', 'Noturna', 'Ao movimento', 'Em repouso', 'Outra'] },
      ]
    },
    {
      id: 'historico',
      title: 'Histórico Clínico',
      fields: [
        { id: 'historico_cirurgias', label: 'Cirurgias anteriores', type: 'textarea' },
        { id: 'tratamentos_anteriores', label: 'Tratamentos fisioterapêuticos anteriores', type: 'textarea' },
        { id: 'medicamentos_uso', label: 'Medicamentos em uso', type: 'textarea' },
        { id: 'patologias_associadas', label: 'Patologias associadas', type: 'textarea' },
      ]
    },
    {
      id: 'avaliacao_funcional',
      title: 'Avaliação Funcional',
      fields: [
        { id: 'amplitude_movimento', label: 'Amplitude de movimento (descrição)', type: 'textarea' },
        { id: 'forca_muscular', label: 'Força muscular (0 a 5)', type: 'escala', min: 0, max: 5 },
        { id: 'postura', label: 'Avaliação postural', type: 'textarea' },
        { id: 'marcha', label: 'Avaliação da marcha', type: 'textarea' },
        { id: 'limitacoes_funcao', label: 'Limitações nas atividades funcionais', type: 'textarea' },
      ]
    },
    {
      id: 'objetivos',
      title: 'Objetivos do Tratamento',
      fields: [
        { id: 'objetivo_paciente', label: 'O que o paciente espera alcançar', type: 'textarea' },
        { id: 'objetivo_profissional', label: 'Objetivos fisioterapêuticos', type: 'textarea' },
        { id: 'plano_tratamento', label: 'Plano de tratamento inicial', type: 'textarea' },
      ]
    }
  ]
};

// ============================================================
// 5. ANAMNESE NUTRICIONAL (campos básicos)
// ============================================================
export const TEMPLATE_NUTRICIONAL: AnamnesisTemplate = {
  id: 'nutricional',
  name: 'Anamnese Nutricional',
  profession: 'Nutricionista',
  icon: '🥗',
  color: 'teal',
  sections: [
    {
      id: 'identificacao',
      title: 'Identificação',
      fields: [
        { id: 'nome', label: 'Nome', type: 'text', required: true },
        { id: 'idade', label: 'Idade', type: 'number' },
        { id: 'sexo', label: 'Sexo', type: 'select', options: ['Masculino', 'Feminino', 'Outro'] },
        { id: 'peso_atual', label: 'Peso atual (kg)', type: 'number' },
        { id: 'altura', label: 'Altura (cm)', type: 'number' },
        { id: 'objetivo', label: 'Objetivo nutricional', type: 'select', options: ['Emagrecimento', 'Ganho de massa', 'Manutenção', 'Tratamento de doença', 'Outro'] },
      ]
    },
    {
      id: 'historico_saude',
      title: 'Histórico de Saúde',
      fields: [
        { id: 'diagnosticos', label: 'Doenças/diagnósticos atuais', type: 'textarea', placeholder: 'Diabetes, hipertensão, dislipidemia...' },
        { id: 'medicamentos', label: 'Medicamentos em uso', type: 'textarea' },
        { id: 'alergias_intolerancias', label: 'Alergias ou intolerâncias alimentares', type: 'textarea' },
        { id: 'historico_familiar', label: 'Histórico familiar de doenças', type: 'textarea' },
      ]
    },
    {
      id: 'habitos_alimentares',
      title: 'Hábitos Alimentares',
      fields: [
        { id: 'refeicoes_dia', label: 'Número de refeições por dia', type: 'number' },
        { id: 'horario_refeicoes', label: 'Horários das refeições', type: 'textarea' },
        { id: 'local_refeicoes', label: 'Local das principais refeições', type: 'text' },
        { id: 'velocidade_comer', label: 'Velocidade ao comer', type: 'select', options: ['Lento', 'Normal', 'Rápido', 'Muito rápido'] },
        { id: 'fome_sede', label: 'Percepção de fome e sede', type: 'textarea' },
        { id: 'preferencias', label: 'Alimentos preferidos', type: 'textarea' },
        { id: 'aversoes', label: 'Alimentos que não consome (aversões)', type: 'textarea' },
      ]
    },
    {
      id: 'hidratacao_atividade',
      title: 'Hidratação e Atividade Física',
      fields: [
        { id: 'agua_dia', label: 'Ingestão hídrica diária (litros)', type: 'number' },
        { id: 'pratica_atividade', label: 'Pratica atividade física', type: 'boolean' },
        { id: 'descricao_atividade', label: 'Tipo, frequência e duração da atividade', type: 'textarea' },
      ]
    },
    {
      id: 'habitos_vida',
      title: 'Hábitos de Vida',
      fields: [
        { id: 'sono', label: 'Qualidade do sono', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Péssimo'] },
        { id: 'estresse', label: 'Nível de estresse (0 a 10)', type: 'escala', min: 0, max: 10 },
        { id: 'uso_alcool', label: 'Consumo de álcool', type: 'textarea' },
        { id: 'tabagismo', label: 'Tabagismo', type: 'boolean' },
      ]
    },
    {
      id: 'recordatorio',
      title: 'Recordatório Alimentar (24h)',
      fields: [
        { id: 'cafe_manha', label: 'Café da manhã', type: 'textarea' },
        { id: 'lanche_manha', label: 'Lanche da manhã', type: 'textarea' },
        { id: 'almoco', label: 'Almoço', type: 'textarea' },
        { id: 'lanche_tarde', label: 'Lanche da tarde', type: 'textarea' },
        { id: 'jantar', label: 'Jantar', type: 'textarea' },
        { id: 'ceia', label: 'Ceia (se houver)', type: 'textarea' },
        { id: 'observacoes_recordatorio', label: 'Observações', type: 'textarea' },
      ]
    }
  ]
};

// ============================================================
// REGISTRY — All available templates
// ============================================================
export const ALL_ANAMNESIS_TEMPLATES: AnamnesisTemplate[] = [
  TEMPLATE_PSICOLOGICA,
  TEMPLATE_FONOAUDIOLOGIA,
  TEMPLATE_TERAPIA_OCUPACIONAL,
  TEMPLATE_FISIOTERAPIA,
  TEMPLATE_NUTRICIONAL,
];

export const getTemplateById = (id: string): AnamnesisTemplate | undefined => {
  return ALL_ANAMNESIS_TEMPLATES.find(t => t.id === id);
};
