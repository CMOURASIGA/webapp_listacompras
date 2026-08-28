# 7Mercado

Aplicação mobile-first da Consult Services para planejamento, execução e inteligência de compras.

## Branches

- `main`: produção atual, preservada.
- `nova-visao`: protótipo local-first aprovado, preservado.
- `develop`: evolução completa com Supabase, ambiente de validação.

## Configuração

Copie `.env.example` para `.env.local` e informe a chave publicável do projeto. Nunca use `service_role` no frontend.

```bash
npm install
npm run dev
```

## Banco

A migration inicial está em `supabase/migrations/20260828180000_initial_shopping_intelligence.sql`. Ela cria tabelas, índices, triggers e RLS por usuário.

Depois de criar um usuário de desenvolvimento, `supabase/seed.sql` gera uma lista e seis meses de compras para validar comparação, recorrência, despensa e insights. O seed não deve ser executado em produção.

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
