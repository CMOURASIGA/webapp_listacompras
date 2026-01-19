
# Lista de Compras Pro (Vercel + Google Sheets)

Esta é a migração da Lista de Compras de Apps Script para uma aplicação React moderna hospedada na Vercel.

## Arquitetura
- **Frontend**: React 18 + Tailwind CSS.
- **Backend (API)**: Next.js API Routes (ou Node.js Vercel Functions).
- **Banco de Dados**: Google Sheets API v4.
- **Auth**: Google OAuth (identificação via e-mail).

## Setup de Desenvolvimento

1. **Credenciais do Google**:
   - Vá ao [Google Cloud Console](https://console.cloud.google.com/).
   - Crie um projeto e habilite a **Google Sheets API**.
   - Crie uma **Service Account** e baixe o arquivo JSON de credenciais.
   - Compartilhe sua planilha de compras com o e-mail da Service Account (acesso de Editor).

2. **Variáveis de Ambiente (Vercel)**:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: E-mail da service account.
   - `GOOGLE_PRIVATE_KEY`: Chave privada da service account (substitua `\n` por quebras de linha reais).
   - `GOOGLE_SHEET_ID`: O ID da planilha (presente na URL: `/d/[ID]/edit`).
   - `NEXTAUTH_SECRET`: Uma string aleatória para segurança da sessão.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Para o login social do usuário final.

3. **Deploy**:
   - Conecte o repositório ao Vercel.
   - Configure as variáveis acima.
   - O deploy será automático.

## Regras de Negócio (Mantidas)
- **Status**: Itens com status `pendente` aparecem na aba Lista. `comprado` aparecem no Carrinho.
- **Finalização**: Ao finalizar, itens `comprado` são removidos da `Lista_Atual` e registrados na aba `Histórico`.
- **Compartilhamento**: O acesso é validado via e-mail do usuário logado contra a lista de permissões na aba `Configurações`.

## Checklist de Testes
- [ ] Login via Google autentica corretamente.
- [ ] Adição de itens persiste na planilha.
- [ ] Filtro por categoria funciona.
- [ ] Botão de "comprar" move item visualmente e no banco de dados.
- [ ] Cálculo do total do carrinho reflete os preços estimados.
- [ ] Finalizar compra limpa a lista e cria registro no histórico.
- [ ] Recarregar itens do histórico adiciona-os novamente como pendentes.
