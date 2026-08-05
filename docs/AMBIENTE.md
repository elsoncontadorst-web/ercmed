# Configuração do ambiente

## Variáveis da aplicação

Use `.env.example` como lista oficial. Os valores reais devem ficar em `.env.local`, que não é enviado ao GitHub.

Grupos atualmente utilizados:

- Firebase Web: API key pública da aplicação, domínio, projeto, bucket, sender ID e app ID.
- Firebase App Check: chave pública do reCAPTCHA Enterprise.
- Google Gemini: chave para recursos de IA habilitados.
- Groq: chaves principal e alternativa para recursos clínicos de IA.
- Mercado Pago: links públicos de checkout dos planos Professional, Advanced e Enterprise.

## Segredos de backend

Tokens privados, chaves administrativas, credenciais de webhooks e contas de serviço não devem usar variáveis `VITE_`, pois tudo que começa com `VITE_` pode ser entregue ao navegador.

Esses segredos devem ser configurados no ambiente seguro do Firebase Functions ou Google Cloud, conforme a integração utilizada.

## Serviços externos que precisam de acesso preservado

- GitHub: repositório e histórico do código.
- Firebase/Google Cloud: Authentication, Firestore, Storage, Functions, Hosting e App Check.
- Registrador/DNS: domínio `ercmed.com.br`.
- Mercado Pago: planos, links de checkout e integrações de pagamento.
- Gemini e Groq: recursos de inteligência artificial.

## Arquivos locais que não vão ao GitHub

- `.env` e `.env.local`;
- `.firebaserc`;
- chaves de conta de serviço;
- conteúdo de `.firebase/`;
- `node_modules/` e `dist/`;
- arquivos temporários em `.tmp/`;
- arquivos de clientes que não estejam intencionalmente em `public/`.

## Versões

- Aplicação: Node.js 20 ou superior.
- Firebase Functions: runtime Node.js 24, conforme `functions/package.json`.

Ao trocar versões do Node.js, valide tanto a aplicação quanto as Functions antes de publicar.
