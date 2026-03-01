import { HelpGuide } from '../types';

const cartGuide: HelpGuide = {
  id: 'usando-carrinho',
  icon: '🛒',
  label: 'Usando o carrinho',
  title: 'Guia 3 — Usando o carrinho',
  description: 'Marque os itens conforme for colocando no carrinho do mercado.',
  steps: [
    {
      title: 'Checkbox',
      description: 'Use o checkbox grande para marcar e desmarcar itens rapidamente.',
      image: 'Mock: checkbox em destaque no item do carrinho',
      highlights: ['item-checkbox'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Subtotal',
      description: 'Acompanhe o subtotal e o progresso em tempo real durante a compra.',
      image: 'Mock: subtotal e barra de progresso do carrinho',
      highlights: ['Subtotal'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    },
    {
      title: 'Botão finalizar',
      description: 'Quando concluir, use o botão principal para salvar no histórico.',
      image: 'Mock: botão Finalizar e salvar',
      highlights: ['Finalizar e salvar'],
      systemTarget: 'carrinho',
      deepLink: '/carrinho'
    }
  ],
  overviewMock: {
    caption: 'Visão de compra em andamento com feedback instantâneo',
    highlights: ['Checkbox', 'Subtotal', 'Finalizar e salvar']
  }
};

export default cartGuide;
