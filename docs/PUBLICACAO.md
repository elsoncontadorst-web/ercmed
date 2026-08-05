# Publicação e checklist de versão

## Antes de publicar

1. Confirme a empresa e o projeto Firebase de destino.
2. Verifique se não há credenciais ou arquivos temporários preparados para commit.
3. Execute:

```bash
npx tsc --noEmit
npm run build
```

4. Teste os fluxos alterados no ambiente local.
5. Atualize o README ou os documentos da pasta `docs/` quando houver mudança de comportamento.

## Atualização do GitHub

```bash
git status
git add -A
git commit -m "descrição objetiva da versão"
git push origin main
```

Antes do envio, revise a quantidade e os nomes dos arquivos. Nunca envie `.env.local`, tokens, chaves administrativas ou dados particulares de pacientes e clientes.

## Publicação da interface

```bash
firebase deploy --only hosting
```

## Publicações administrativas

Regras, índices, Storage e Functions alteram o comportamento do backend e devem ser publicados somente quando a versão realmente depender dessas mudanças:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
firebase deploy --only functions
```

Não publique todos esses componentes automaticamente. Revise regras e Functions porque uma alteração incorreta pode bloquear usuários ou ampliar acesso a dados.

## Depois de publicar

- Abra `https://ercmed.com.br` em uma janela nova.
- Confirme que o servidor responde normalmente.
- Teste login e seleção de empresa.
- Teste o fluxo principal alterado.
- Verifique o console do navegador e os registros do Firebase quando houver erro.
- Confirme que o commit publicado aparece em `origin/main`.

## Retorno para uma versão anterior

Não apague o histórico com `reset --hard` em produção. Identifique o commit estável, crie uma reversão registrada com Git e publique novamente após validar a compilação.
