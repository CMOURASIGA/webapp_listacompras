import { HelpGuide } from '../types';

const shareGuide: HelpGuide = {
  id: 'compartilhar-lista',
  icon: '📤',
  label: 'Compartilhar lista',
  title: 'Guia — Compartilhar lista',
  description: 'Envie a lista para família e amigos com texto legível e pronto para WhatsApp.',
  steps: [
    {
      title: 'Toque em compartilhar',
      description: 'Na aba Lista, use o botão “📤 Compartilhar lista”.',
      image: 'Mock: botão compartilhar na barra da lista',
      highlights: ['share-button'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Formato pronto para WhatsApp',
      description: 'O sistema gera texto com itens e quantidades, além do total estimado.',
      image: 'Mock: prévia de texto formatado da lista',
      highlights: ['share-text'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Mobile e desktop',
      description: 'No mobile usa Web Share API. No desktop, faz fallback para cópia do texto.',
      image: 'Mock: compartilhamento com fallback de cópia',
      highlights: ['share-button', 'share-text'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Compartilhamento simples para uso familiar',
    highlights: ['Botão compartilhar', 'Texto legível', 'Fallback desktop']
  }
};

export default shareGuide;
