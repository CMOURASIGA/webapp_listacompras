import { HelpGuide } from '../types';

const apiKeyGuide: HelpGuide = {
  id: 'gerar-api-key',
  icon: '🔑',
  label: 'Como gerar API key',
  title: 'Guia — Como gerar API key',
  description: 'Siga os passos para gerar sua chave e ativar IA com menos atrito.',
  tabGuides: [
    {
      id: 'gemini',
      label: 'Google Gemini',
      cta: {
        label: '👉 Abrir Google AI Studio',
        url: 'https://aistudio.google.com/app/apikey'
      },
      steps: [
        {
          title: 'Acesse Google AI Studio',
          description: 'Abra o painel oficial do Google AI Studio para gerenciar chaves.',
          image: 'Mock: página inicial do Google AI Studio'
        },
        {
          title: 'Clique em “Get API key”',
          description: 'Use a opção de criação de chave no painel do AI Studio.',
          image: 'Mock: botão Get API key'
        },
        {
          title: 'Crie nova chave',
          description: 'Confirme a geração de uma nova credencial.',
          image: 'Mock: confirmação de criação de chave'
        },
        {
          title: 'Copie a chave',
          description: 'Copie o valor da chave gerada com cuidado.',
          image: 'Mock: chave gerada para cópia'
        },
        {
          title: 'Cole no Shopping Pro',
          description: 'No app, abra Configurações > IA e cole no campo Gemini API Key.',
          image: 'Mock: campo Gemini API Key preenchido',
          highlights: ['Provider IA', 'API key'],
          systemTarget: 'configuracoes',
          deepLink: '/configuracoes'
        },
        {
          title: 'Salve as configurações',
          description: 'Clique em salvar para habilitar o uso da IA no sistema.',
          image: 'Mock: botão salvar configurações da IA',
          highlights: ['Salvar'],
          systemTarget: 'configuracoes',
          deepLink: '/configuracoes'
        }
      ]
    },
    {
      id: 'openai',
      label: 'OpenAI',
      cta: {
        label: '👉 Abrir OpenAI Platform',
        url: 'https://platform.openai.com/api-keys'
      },
      steps: [
        {
          title: 'Acesse platform.openai.com',
          description: 'Entre na plataforma OpenAI com sua conta.',
          image: 'Mock: dashboard da OpenAI Platform'
        },
        {
          title: 'Vá em API Keys',
          description: 'Abra a área de gerenciamento de chaves.',
          image: 'Mock: seção API Keys da OpenAI'
        },
        {
          title: 'Create new secret key',
          description: 'Crie uma nova secret key e confirme.',
          image: 'Mock: modal de criação de secret key'
        },
        {
          title: 'Copie',
          description: 'Copie a chave gerada imediatamente.',
          image: 'Mock: chave OpenAI exibida'
        },
        {
          title: 'Cole no sistema',
          description: 'No Shopping Pro, cole no campo OpenAI API Key em Configurações.',
          image: 'Mock: campo OpenAI API Key preenchido',
          highlights: ['Provider IA', 'API key'],
          systemTarget: 'configuracoes',
          deepLink: '/configuracoes'
        },
        {
          title: 'Salve as configurações',
          description: 'Clique em salvar para concluir a ativação do provider OpenAI.',
          image: 'Mock: botão salvar configurações da IA',
          highlights: ['Salvar'],
          systemTarget: 'configuracoes',
          deepLink: '/configuracoes'
        }
      ]
    }
  ]
};

export default apiKeyGuide;
