
# Lista de Compras Pro (Vercel + Google Sheets)

Este documento explica como conectar o WebApp rodando no Vercel à sua planilha Google Sheets existente, sem alterar uma única célula da sua estrutura atual.

## Como a conexão é feita (O "Pulo do Gato")

Diferente do Apps Script, o Vercel acessa sua planilha via **API**. O fluxo é:

1.  **Service Account**: O backend do Vercel se identifica como um "membro da equipe" (um robô).
2.  **Compartilhamento**: Você compartilha sua planilha com o e-mail desse robô (ex: `shopping-bot@projeto.iam.gserviceaccount.com`) como Editor.
3.  **Identificação**: O ID da sua planilha (encontrado na URL) é configurado nas variáveis de ambiente do Vercel.

## Passo a Passo para Conectar sua Planilha Hoje

### 1. Preparar o Google Cloud
- Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
- Ative a **Google Sheets API**.
- Vá em `Credenciais` -> `Criar Credenciais` -> `Conta de Serviço`.
- Após criar, clique na conta, vá em `Chaves` -> `Adicionar Chave` -> `Criar nova chave (JSON)`. **Guarde este arquivo.**

### 2. Dar Acesso ao App
- Abra sua planilha de compras atual.
- Clique em **Compartilhar**.
- Cole o e-mail da Conta de Serviço que você criou (está no JSON que você baixou).
- Dê permissão de **Editor** e desmarque "Notificar pessoas".

### 3. Configurar o Vercel
No painel do seu projeto no Vercel, adicione as seguintes `Environment Variables`:

- `GOOGLE_SHEET_ID`: O ID da sua planilha (ex: `1abc123...`).
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: O e-mail do robô.
- `GOOGLE_PRIVATE_KEY`: A chave privada que está dentro do arquivo JSON.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Obtidos no console do Google para permitir o Login Social dos usuários (seu e-mail e de quem você compartilha).

## Por que a estrutura não muda?
O código do backend (Vercel API Routes) utiliza mapeadores que respeitam a ordem das suas colunas:
- Se sua aba de itens tem o nome `Items`, o código buscará por `Items`.
- Se a coluna `C` é a `Quantidade`, o código lerá a `coluna index 2`.

Isso garante que você pode até continuar abrindo a planilha manualmente e o app continuará funcionando em sincronia perfeita.
