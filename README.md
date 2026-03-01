# Shopping Pro WebApp

Aplicacao web para lista de compras com Google Sheets + Google Apps Script, foco mobile, historico reutilizavel e sugestoes com IA (Gemini/OpenAI).

## Visao geral

O sistema foi construido para uso real de compras:

- Login com Google (ou modo convidado para teste).
- Cada usuario usa sua propria planilha automaticamente (bootstrap por email).
- Fluxo de compra completo:
  - Lista atual
  - Carrinho (itens marcados)
  - Historico
- Sugestoes inteligentes (frequentes, ultima compra e IA).
- Central de ajuda completa em `/help` com guias visuais.

## Principais funcionalidades implementadas

### 1) Lista, carrinho e historico

- Adicao de itens com formulario completo e adicao rapida.
- Categoria automatica por dicionario + cadastro de categoria manual.
- Marcar/desmarcar item para mover entre `pendente` e `comprado`.
- Carrinho com subtotal, progresso e finalizacao de compra.
- Historico sob demanda (carrega so quando o usuario pedir).
- Busca e filtros no historico (7d, 30d, maior valor, menor valor).
- Recarregar compra antiga para a lista atual com 1 clique.

### 2) Edicao de item responsiva

- Componente unificado: `components/EditItemPanel.tsx`
- Desktop: `EditItemDrawer` (slide da direita, overlay, ESC).
- Mobile: `EditItemBottomSheet` (85dvh, drag handle, rodape fixo, ajuste para teclado via `visualViewport`).
- Campos de edicao:
  - Nome
  - Quantidade (stepper)
  - Categoria
  - Preco
- Acoes:
  - Salvar
  - Remover item
  - Cancelar
- Clique no card da lista abre edicao.

### 3) IA desacoplada por provider

- Camada unica: `services/ai/aiService.ts`
- Providers:
  - `services/ai/providers/geminiProvider.ts`
  - `services/ai/providers/openaiProvider.ts`
- Validacoes antes de chamar IA:
  - Provider desativado
  - API key ausente
  - Erro de rede
- Loading e feedback visual no painel de sugestoes.

### 4) Configuracoes (usuario final)

Modal de configuracao focado em IA:

- Provider IA: `disabled | gemini | openai`
- Campo dinamico de API key por provider
- Persistencia local em `localStorage` via store:
  - `store/appSettingsStore.tsx`

Observacao: campos tecnicos de integracao foram removidos da UI final.

### 5) Central de ajuda em /help

- Rota dedicada de ajuda (`/help`).
- Busca de guias.
- Sidebar + conteudo em layout responsivo.
- Guias com passos visuais, mock de telas e highlights animados.
- Botao "Ver no sistema" com deep link para tela real.
- Opcao configuravel: fechar ajuda ao navegar ou manter ajuda aberta.
- Lembra ultimo guia aberto.

Arquivos principais:

- `help/HelpLayout.tsx`
- `help/HelpContent.tsx`
- `help/GuideStep.tsx`
- `help/HighlightBox.tsx`
- `help/highlightMap.ts`
- `help/guides/*`
- `help/mocks/*`

### 6) UX e responsividade

- Header com tabs e status online/offline.
- Tabs com scroll horizontal no mobile.
- Touch targets ajustados para mobile.
- Toques, toasts, confirmacoes e loading states.
- Onboarding de primeira execucao.

### 7) Backend Google Apps Script

- Codigo em `google-script/Code.gs`.
- Bootstrap por usuario (email) com criacao/descoberta automatica de planilha.
- Abas padrao:
  - `Lista_Atual`
  - `Historico`
  - `Categorias`
  - `Configuracoes`
- Acoes expostas:
  - bootstrap
  - listar/adicionar categoria
  - listar/adicionar/editar/remover item
  - marcarComoComprado
  - finalizarCompra
  - obterHistorico
  - carregarListaDoHistorico

## Arquitetura (resumo)

- Frontend:
  - React 19 + Vite + TypeScript
  - Entrada: `index.tsx`
  - Tela principal: `App.tsx`
- API:
  - Proxy serverless em `api/index.ts` (Vercel Edge)
- Estado:
  - `store/appSettingsStore.tsx`
  - `store/notificationsStore.tsx`
- Integracao:
  - `services/api.ts` (Google Script/proxy)
  - `services/ai/*` (providers de IA)

## Requisitos

- Node.js 20+ (recomendado)
- NPM 10+ (ou compativel)
- Conta Google com permissao para Google Apps Script/Sheets

## Variaveis de ambiente

Use `.env.local` no frontend:

```env
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_DEPLOY/exec
VITE_GOOGLE_CLIENT_ID=SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com
VITE_FORCE_DIRECT_SCRIPT=false
```

Para deploy no Vercel (serverless `/api`):

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_DEPLOY/exec
API_KEY=SUA_CHAVE_GEMINI
```

Referencia adicional: `docs/README.md`.

## Como rodar local

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
npm run preview
```

## Deploy

- Frontend + API serverless preparados para Vercel.
- Arquivo de rotas: `vercel.json`.
- Endpoint `/api` reescreve para `api/index.ts`.

## Observacoes operacionais

- Em dev local, o app prioriza `/api` para reduzir problemas de CORS/redirect.
- Opcionalmente pode forcar chamada direta ao Apps Script com:
  - `VITE_FORCE_DIRECT_SCRIPT=true`
- Se houver erros de autenticacao/redirect:
  - validar deploy `/exec`
  - validar permissao de acesso do Apps Script
  - validar login Google no navegador

## Scripts NPM

- `npm run dev` -> ambiente local
- `npm run build` -> type-check + build Vite
- `npm run preview` -> preview local do build

