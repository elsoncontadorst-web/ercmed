# Troca de computador e recuperação do ERCMed

Este guia permite reconstruir o ambiente de desenvolvimento sem depender do computador anterior.

## O que deve existir antes da troca

1. Todo o código deve estar enviado para a branch `main` do repositório `elsoncontadorst-web/ercmed`.
2. O computador antigo não pode ter arquivos modificados ou novos sem commit.
3. As credenciais privadas devem estar guardadas em um cofre de senhas ou armazenamento criptografado.
4. Deve existir um backup recente do Firestore e dos arquivos do Firebase Storage.
5. Os acessos ao GitHub, Firebase, Google Cloud, Mercado Pago, Gemini, Groq e domínio devem estar confirmados.

## Instalação no computador novo

Instale:

- Git;
- Node.js 20 ou superior para a aplicação;
- Firebase CLI;
- um editor de código, como Visual Studio Code;
- Google Cloud CLI somente se for realizar exportações administrativas do Firestore e Storage.

Clone o projeto:

```bash
git clone https://github.com/elsoncontadorst-web/ercmed.git
cd ercmed
npm install
npm --prefix functions install
```

Crie o arquivo `.env.local` usando `.env.example` como referência. Nunca copie credenciais privadas para o README ou para arquivos versionados.

Entre nas contas necessárias:

```bash
firebase login
```

Associe o projeto Firebase quando necessário:

```bash
firebase use --add
```

Escolha o projeto de produção correto e dê a ele um apelido local. O arquivo `.firebaserc` é local e não deve ser enviado ao GitHub.

## Verificação antes de trabalhar

```bash
npx tsc --noEmit
npm run build
```

Abra a aplicação localmente:

```bash
npm run dev
```

Confirme login, seleção de empresa, dashboard, financeiro e leitura dos dados antes de fazer qualquer publicação.

## Recuperação de emergência

Se o computador antigo não estiver disponível:

1. Recupere o código pelo GitHub.
2. Recupere as variáveis privadas pelo cofre de credenciais.
3. Entre no Firebase com uma conta administradora autorizada.
4. Confirme se Firestore, Authentication e Storage continuam disponíveis no projeto em produção.
5. Restaure os dados apenas se o ambiente Firebase também tiver sido perdido ou corrompido.
6. Execute as validações e publique somente depois de testar localmente.

## Conferência final

- `git status` deve estar limpo.
- A branch local deve estar sincronizada com `origin/main`.
- A compilação deve terminar sem erros.
- O domínio `https://ercmed.com.br` deve responder normalmente após a publicação.
