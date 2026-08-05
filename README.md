# ERCMed — Gestão Inteligente em Saúde

Plataforma web para gestão integrada de clínicas, laboratórios, profissionais e grupos empresariais da área da saúde.

Produção: [ercmed.com.br](https://ercmed.com.br)

## Principais recursos

- Dashboard executivo por empresa ou grupo consolidado.
- Controle financeiro com contas a receber, contas a pagar, caixa e conciliação.
- Separação entre faturamento clínico e laboratorial.
- Importação de planilhas Excel, XML e PDF fiscais.
- Associação individual ou em massa de notas a profissionais e sócios.
- Rateio de impostos conforme a participação de cada profissional no faturamento.
- Uso prioritário dos lançamentos da categoria `Impostos e Tributos`; na ausência deles, cálculo estimado pelo Simples Nacional.
- Painel Fiscal com memória do Fator R, RBT12, anexos e faixas do Simples Nacional.
- Relatórios executivos financeiros em PDF.
- Gestão de contratos, sócios, profissionais, repasses e produção.
- Cadastro de empresas e unidades com visão consolidada.
- Prontuário, pacientes, atendimentos, agenda e recursos clínicos.
- Controle de acesso por plano, perfil e permissões.

## Regras financeiras importantes

### Empresas e unidades

Os lançamentos e as importações são vinculados à empresa selecionada no topo do sistema. A opção **Grupo consolidado** reúne os dados das unidades permitidas ao usuário.

### Importação de Excel

O importador aceita arquivos `.xlsx` e `.xls` em dois formatos principais:

1. **Lista de lançamentos:** uma linha por registro, com títulos como data, descrição, categoria e valor.
2. **Grade mensal:** descrições nas linhas e meses nas colunas.

Cada aba pode ser classificada como receita ou despesa. Para receitas, também é possível definir se o faturamento é clínico ou laboratorial.

### XML e profissionais responsáveis

As notas fiscais importadas podem ser vinculadas a profissionais ou sócios. A tela financeira permite:

- selecionar várias notas e atribuir um responsável;
- localizar notas ainda não vinculadas;
- filtrar a lista por profissional;
- visualizar o total do profissional no mês, ano e pesquisa selecionados;
- baixar os XMLs arquivados.

### Impostos e rateio

Para cada período, o dashboard procura despesas classificadas exatamente na categoria **Impostos e Tributos**:

- quando existem lançamentos, utiliza a soma desses valores como imposto apurado;
- quando não existem, utiliza a estimativa calculada pelo Fator R e pelas regras do Simples Nacional.

O imposto do período é rateado proporcionalmente ao faturamento atribuído a cada profissional.

> Os valores do painel são apoio gerencial. A apuração oficial e o DAS devem ser conferidos com a contabilidade e com o PGDAS-D.

## Tecnologias

- React 19 e TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication, Firestore, Storage, Functions e Hosting
- jsPDF e PDF.js
- SheetJS

## Ambiente local

### Requisitos

- Node.js 20 ou superior
- npm
- Projeto Firebase configurado

### Instalação

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha somente as variáveis necessárias ao seu ambiente. Nunca envie `.env.local`, tokens ou chaves administrativas ao repositório.

### Desenvolvimento

```bash
npm run dev
```

### Validação

```bash
npx tsc --noEmit
npm run build
```

### Publicação no Firebase Hosting

```bash
firebase deploy --only hosting
```

## Estrutura resumida

- `components/`: telas e componentes da aplicação.
- `components/AccountantModule/`: painel fiscal e recursos contábeis.
- `services/`: acesso a dados, regras de negócio, importações e integrações.
- `types/`: contratos TypeScript compartilhados.
- `functions/`: funções de backend do Firebase.
- `public/`: arquivos públicos e marcas autorizadas exibidas na landing page.

## Segurança

- Credenciais privadas não devem ser armazenadas no código-fonte.
- As regras de Firestore e Storage fazem parte do versionamento e devem ser revisadas antes de cada implantação.
- Alterações financeiras e fiscais devem preservar o escopo da empresa selecionada.

## Situação atual

O projeto está em evolução ativa. Antes de publicar uma versão, execute a verificação de tipos e a compilação de produção.

## Documentação de continuidade

Para manutenção, troca de computador ou recuperação do projeto, consulte:

- [Troca de computador e recuperação](docs/RECUPERACAO.md)
- [Configuração do ambiente](docs/AMBIENTE.md)
- [Publicação e checklist de versão](docs/PUBLICACAO.md)
- [Backup de código, dados e credenciais](docs/BACKUP.md)

O GitHub armazena o código e esta documentação. Os dados do Firestore, arquivos do Storage e credenciais privadas precisam de rotinas próprias de backup.
