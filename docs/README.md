# Guia de Implantação: Lista de Compras Pro

Siga estes passos para conectar o WebApp do Vercel à sua planilha Google Sheets.

## 1. Configuração do Google Apps Script

1. Acesse sua planilha: [Planilha de Dados](https://docs.google.com/spreadsheets/d/1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c/edit)
2. Vá em **Extensões** -> **Apps Script**.
3. Abra o arquivo `google-script/Code.gs` deste projeto, copie todo o conteúdo e cole no editor do Google.
4. Clique em **Implantar** -> **Nova Implantação**.
5. Tipo: **App da Web**.
6. Executar como: **Eu (seu email)**.
7. Quem tem acesso: **Qualquer pessoa**.
8. **Copie a URL gerada** (termina em `/exec`).

## 2. Configuração no Vercel

No painel do Vercel, adicione esta variável de ambiente:

| Nome | Valor |
| :--- | :--- |
| `APPS_SCRIPT_URL` | A URL que você copiou no passo anterior |
| `API_KEY` | Sua chave do Google Gemini |
| `VITE_GOOGLE_CLIENT_ID` | Seu Client ID do Google Cloud |

## 3. Estrutura da Planilha

O sistema utiliza as seguintes abas:
- **Lista_Atual**: Itens que você está comprando agora.
- **Histórico**: Registro de todas as compras passadas.
- **Categorias**: Lista de categorias com ícones e cores.
- **Configurações**: Parâmetros do sistema.
