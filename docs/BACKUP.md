# Backup do ERCMed

O sistema possui quatro grupos de informações que precisam de proteção independente.

## 1. Código e documentação

Destino principal: GitHub.

Rotina recomendada:

- enviar alterações ao final de cada conjunto funcional validado;
- usar mensagens de commit claras;
- conferir se `main` está sincronizada com `origin/main`;
- manter a documentação atualizada junto com o código.

O GitHub não guarda `.env.local`, bancos de dados nem arquivos enviados pelos usuários.

## 2. Dados do Firestore

O Firestore armazena dados operacionais e financeiros. Configure exportações periódicas para um bucket administrativo do Google Cloud com retenção e acesso restrito.

Antes de restaurar uma exportação, confirme o projeto de destino. Uma restauração no projeto errado pode misturar ambientes ou sobrescrever informações.

Frequência sugerida:

- backup diário dos dados de produção;
- retenção de cópias diárias recentes e cópias mensais;
- teste periódico de restauração em ambiente separado.

## 3. Firebase Storage

XMLs, documentos e outros arquivos podem estar no Storage. Configure cópia ou versionamento do bucket e uma política de retenção compatível com a LGPD e com as obrigações da empresa.

Não coloque backups contendo dados pessoais em pastas públicas ou no GitHub.

## 4. Credenciais e acessos

Guarde em cofre seguro:

- variáveis de `.env.local`;
- usuários administradores e recuperação de conta;
- acesso ao Firebase e Google Cloud;
- acesso ao GitHub;
- acesso ao domínio e DNS;
- chaves e contas dos serviços de IA;
- acesso ao Mercado Pago;
- segredos configurados nas Functions.

Ative autenticação em dois fatores e mantenha pelo menos dois administradores confiáveis quando a plataforma permitir.

## Checklist mensal

- [ ] GitHub contém a última versão publicada.
- [ ] O repositório local não possui alterações esquecidas.
- [ ] Exportação recente do Firestore existe e está acessível.
- [ ] Arquivos do Storage estão protegidos por backup ou versionamento.
- [ ] Credenciais podem ser recuperadas sem depender de um único computador.
- [ ] Contas administrativas possuem autenticação em dois fatores.
- [ ] Uma restauração de teste foi realizada dentro do período definido pela empresa.

## LGPD

Backups podem conter dados pessoais e dados sensíveis de saúde. O acesso deve ser mínimo, rastreável e protegido. Defina prazo de retenção, criptografia, responsáveis e procedimento de descarte seguro com orientação jurídica e de segurança da informação.
