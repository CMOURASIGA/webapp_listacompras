import { HelpGuide } from '../types';

const gettingStartedGuide: HelpGuide = {
  id: 'primeiros-passos',
  icon: '🚀',
  label: 'Primeiros passos',
  title: 'Guia 1 — Primeiros passos',
  description: 'Objetivo: orientar novos usuários no fluxo completo da primeira compra.',
  steps: [
    {
      title: 'Crie seu primeiro item',
      description: 'Na aba Lista, use o campo de adição rápida e confirme em um clique.',
      image: 'Mock: tela Lista com formulário de adição rápida',
      highlights: ['quick-add', 'adicionar'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Revise no carrinho',
      description: 'Marque o item e confira se ele foi movido para o carrinho.',
      image: 'Mock: item marcado com feedback no carrinho',
      highlights: ['item-checkbox', 'subtotal'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Finalize a compra',
      description: 'Use o botão principal para salvar a compra no histórico.',
      image: 'Mock: ação de finalizar e salvar',
      highlights: ['finalizar'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Consulte o histórico',
      description: 'Abra o Histórico e valide a compra finalizada.',
      image: 'Mock: card da compra exibido no histórico',
      highlights: ['history-list'],
      systemTarget: 'historico',
      deepLink: '/historico'
    }
  ],
  overviewMock: {
    caption: 'Fluxo visual da primeira jornada do usuário',
    highlights: ['Criar item', 'Carrinho', 'Finalizar', 'Histórico']
  }
};

export default gettingStartedGuide;
