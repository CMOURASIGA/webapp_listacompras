import { HelpGuide } from '../types';

const duplicatesGuide: HelpGuide = {
  id: 'evitar-duplicados',
  icon: '🧩',
  label: 'Evitar duplicados',
  title: 'Guia — Evitar duplicados',
  description: 'Quando um item repetido é detectado, você escolhe como continuar.',
  steps: [
    {
      title: 'Detecção automática',
      description: 'Ao adicionar um item com mesmo nome normalizado, o sistema identifica duplicidade.',
      image: 'Mock: detecção de item já existente',
      highlights: ['quick-add', 'delete-confirm-modal'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Escolha no diálogo',
      description: 'O diálogo oferece: Somar quantidade, Manter separado ou Cancelar.',
      image: 'Mock: opções do diálogo de duplicados',
      highlights: ['delete-confirm-modal'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Somar quantidade',
      description: 'Selecionando “Somar quantidade”, o item existente é atualizado e você recebe feedback.',
      image: 'Mock: ação de soma de quantidade',
      highlights: ['sum-quantity', 'quantity'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Prevenção de lista duplicada com decisão do usuário',
    highlights: ['Detecção', 'Diálogo', 'Somar quantidade']
  }
};

export default duplicatesGuide;
