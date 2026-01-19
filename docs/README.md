# Configuração do Lista de Compras Pro

Para que o App funcione corretamente no Vercel, você precisa configurar duas variáveis principais.

### 1. Criar o Google OAuth Client ID (Essencial para o Login)
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um existente.
3. Vá em **APIs e Serviços** -> **Tela de consentimento OAuth**.
   - Configure como "Externo".
   - Adicione seu email de suporte e informações básicas.
   - Na aba "Domínios autorizados", adicione `vercel.app`.
4. Vá em **Credenciais** -> **Criar Credenciais** -> **ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Nome: `Lista de Compras Vercel`.
   - **Origens JavaScript autorizadas**: 
     - `http://localhost:3000` (para teste local)
     - `https://SEU-APP.vercel.app` (sua URL do Vercel)
5. Copie o **ID do cliente** gerado.

### 2. Configurar Variáveis de Ambiente no Vercel
No Dashboard do seu projeto no Vercel, vá em **Settings** -> **Environment Variables** e adicione:

| Chave | Valor |
| :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | O ID que você copiou no passo anterior |
| `APPS_SCRIPT_URL` | A URL do seu script terminando em `/exec` |
| `API_KEY` | Sua chave da API do Google Gemini (opcional, para sugestões) |

### 3. Google Apps Script (doGet)
Certifique-se de que seu script esteja publicado como **App da Web**, executando como **Você** e acessível por **Qualquer pessoa**.

```javascript
function doGet(e) {
  const action = e.parameter.action;
  const userEmail = e.parameter.userEmail;
  // Sua lógica aqui...
  return ContentService.createTextOutput(JSON.stringify({data: resultado}))
    .setMimeType(ContentService.MimeType.JSON);
}
```