import { HelpGuide } from '../types';

const aiGuide: HelpGuide = {
  id: 'ativando-ia',
  icon: '🤖',
  label: 'Ativando a IA',
  title: 'Como ativar sugestões inteligentes',
  description: 'Guia crítico para ativação de IA no produto.',
  subsections: [
    {
      title: 'Usando Google Gemini',
      description: 'Fluxo recomendado para quem usa Gemini no backend atual.',
      bullets: [
        'Selecione Gemini no provider IA.',
        'Cole a Gemini API Key no campo correspondente.',
        'Salve e valide antes de pedir sugestões.'
      ]
    },
    {
      title: 'Usando OpenAI',
      description: 'Fluxo alternativo para utilizar sugestões com OpenAI.',
      bullets: [
        'Selecione OpenAI no provider IA.',
        'Cole a OpenAI API Key no campo correspondente.',
        'Salve e depois use o botão "Pedir IA".'
      ]
    }
  ],
  steps: [
    {
      title: 'Escolha o provedor',
      description: 'Na seção IA, selecione Gemini ou OpenAI.',
      image: 'Mock: seletor de provider IA',
      highlights: ['Provider IA'],
      systemTarget: 'configuracoes',
      deepLink: '/configuracoes'
    },
    {
      title: 'Cole sua API key',
      description: 'Preencha a chave no campo dinâmico do provider escolhido.',
      image: 'Mock: campo de API key em foco',
      highlights: ['API key'],
      systemTarget: 'configuracoes',
      deepLink: '/configuracoes'
    },
    {
      title: 'Clique em salvar',
      description: 'Salve as configurações para persistir e habilitar a integração.',
      image: 'Mock: botão salvar configurações',
      highlights: ['Salvar'],
      systemTarget: 'configuracoes',
      deepLink: '/configuracoes'
    },
    {
      title: 'Use o botão “Pedir IA”',
      description: 'Na aba Lista, abra Sugestões Inteligentes e clique em “Pedir IA”.',
      image: 'Mock: painel de sugestões com botão Pedir IA',
      highlights: ['Pedir IA'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Fluxo visual completo para ativar e usar IA',
    highlights: ['Configurações', 'Provider IA', 'API key', 'Salvar', 'Pedir IA']
  }
};

export default aiGuide;
