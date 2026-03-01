import { HelpGuide } from '../types';

const marketModeGuide: HelpGuide = {
  id: 'modo-mercado',
  icon: '🛒',
  label: 'Modo mercado',
  title: 'Guia — Modo mercado',
  description: 'Transforme o carrinho em checklist rápido para uso dentro do mercado.',
  steps: [
    {
      title: 'Ative o modo mercado',
      description: 'No carrinho, toque em “🛒 Modo mercado” para entrar no layout de operação rápida.',
      image: 'Mock: botão de ativação do modo mercado',
      highlights: ['market-mode'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Checklist ampliado',
      description: 'Com o modo ativo, os itens ficam maiores e fáceis de marcar com um toque.',
      image: 'Mock: cards ampliados no checklist',
      highlights: ['checklist-item', 'checkbox'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Subtotal fixo no topo',
      description: 'Acompanhe subtotal e progresso em tempo real enquanto caminha pelo mercado.',
      image: 'Mock: subtotal sticky durante a compra',
      highlights: ['subtotal', 'finalize'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    }
  ],
  overviewMock: {
    caption: 'Fluxo de checklist para compra física',
    highlights: ['Ativar modo', 'Itens grandes', 'Subtotal fixo']
  }
};

export default marketModeGuide;
