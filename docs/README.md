
# Integração Vercel + Google Apps Script

Para que o App no Vercel funcione com sua planilha real, siga estes passos:

### 1. Preparar o Apps Script (Backend)
No seu editor de script do Google (onde está o seu `code.gs`), você precisa garantir que o `doGet` consiga retornar JSON para o Vercel. Adicione/Modifique o início do seu `doGet`:

```javascript
function doGet(e) {
  // Roteador para chamadas de API do Vercel
  if (e.parameter.action) {
    const action = e.parameter.action;
    const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : null;
    let result;

    try {
      switch(action) {
        case 'listarItens': result = listarItens(); break;
        case 'listarCategorias': result = listarCategorias(); break;
        case 'adicionarItem': result = adicionarItem(payload.nome, payload.quantidade, payload.categoria, payload.precoEstimado); break;
        case 'getUserEmail': result = Session.getActiveUser().getEmail(); break;
        // ... adicione as outras funções conforme necessário
      }
      return ContentService.createTextOutput(JSON.stringify({data: result}))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({error: err.message}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Se não for uma chamada de API, retorna o HTML normal (opcional)
  return HtmlService.createTemplateFromFile('Index').evaluate();
}
```

### 2. Publicar o Script
1. Clique em **Implantar** -> **Nova Implantação**.
2. Tipo: **App da Web**.
3. Quem pode acessar: **Qualquer pessoa** (Isso é necessário para o Vercel conseguir "bater" na URL, mas os dados só serão lidos se o usuário estiver logado no Google).
4. Copie a **URL do App da Web**.

### 3. Configurar no Vercel
1. Vá no dashboard do seu projeto no Vercel.
2. Vá em **Settings** -> **Environment Variables**.
3. Adicione uma nova variável:
   - Key: `VITE_APPS_SCRIPT_URL`
   - Value: `https://script.google.com/macros/s/SUA_URL_AQUI/exec`
4. **Importante**: Faça um novo deploy ou clique em "Redeploy" para que o Vercel reconheça a nova variável.

### 4. Como o sistema identifica sozinho?
O arquivo `services/api.ts` lê automaticamente o valor de `import.meta.env.VITE_APPS_SCRIPT_URL`. 
- Se a variável estiver vazia, ele pode falhar ou usar o modo demo.
- Se estiver preenchida, cada clique em "Adicionar" ou "Finalizar" dispara um comando real para o seu Google Sheets.
