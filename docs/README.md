# Configuração do Lista de Compras Pro

Para que o App funcione corretamente no Vercel, você precisa configurar duas frentes.

### 1. No Google Apps Script (CRUCIAL)
O erro mais comum é a permissão de acesso.
1. No seu editor de script, clique no botão azul **Implantar** (Deploy) -> **Nova implantação**.
2. Selecione o tipo **App da Web**.
3. Em **Executar como**, selecione **Eu** (sua conta).
4. Em **Quem tem acesso**, selecione **Qualquer pessoa** (Anyone). 
   - *Nota: Se você selecionar "Qualquer pessoa com conta Google", o app vai falhar porque o Vercel não consegue fazer login por você.*
5. Clique em **Implantar** e copie a URL gerada (ela deve terminar em `/exec`).

### 2. Configurar Variáveis de Ambiente no Vercel
No Dashboard do seu projeto no Vercel, vá em **Settings** -> **Environment Variables**:

| Chave | Valor |
| :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | O ID do OAuth Client (para o login funcionar) |
| `APPS_SCRIPT_URL` | A URL que você copiou acima (terminando em `/exec`) |
| `API_KEY` | Sua chave da API do Google Gemini (opcional, para sugestões de IA) |

### Exemplo de código do Script
Certifique-se de que sua função `doGet` retorne JSON corretamente:

```javascript
function doGet(e) {
  const action = e.parameter.action;
  // Lógica...
  const data = { status: "sucesso", data: [] }; // exemplo
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```
