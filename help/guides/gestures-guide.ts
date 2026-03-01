import { HelpGuide } from '../types';

const gesturesGuide: HelpGuide = {
  id: 'gestos-rapidos',
  icon: '👆',
  label: 'Gestos rápidos',
  title: 'Guia — Gestos rápidos',
  description: 'Use swipes para operar a lista com uma mão sem poluir a interface.',
  steps: [
    {
      title: 'Swipe para direita',
      description: 'Arraste o item para a direita para mover direto para o carrinho.',
      image: 'Mock: swipe direita com feedback verde',
      highlights: ['swipe-right-cart', 'checkbox'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Swipe para esquerda',
      description: 'Arraste para a esquerda para iniciar exclusão com feedback vermelho.',
      image: 'Mock: swipe esquerda para excluir',
      highlights: ['swipe-left-delete'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Confirmação antes de excluir',
      description: 'Ao soltar para esquerda, o app abre confirmação para evitar exclusão acidental.',
      image: 'Mock: modal de confirmação de exclusão',
      highlights: ['delete-confirm-modal'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Editar continua no lápis',
      description: 'Para editar, use o botão de lápis. O swipe não substitui a edição.',
      image: 'Mock: ações do item com lápis',
      highlights: ['item-actions'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Fluxo mobile de gestos rápidos',
    highlights: ['Swipe direita', 'Swipe esquerda', 'Confirmação', 'Editar no lápis']
  }
};

export default gesturesGuide;
