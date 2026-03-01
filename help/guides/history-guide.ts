import { HelpGuide } from '../types';

const historyGuide: HelpGuide = {
  id: 'entendendo-historico',
  icon: '📊',
  label: 'Entendendo o histórico',
  title: 'Guia 4 — Histórico',
  description: 'Reaproveite compras anteriores com busca e recarga de lista.',
  steps: [
    {
      title: 'Compras anteriores',
      description: 'Veja a lista de compras já finalizadas e seus itens.',
      image: 'Mock: lista de compras anteriores',
      highlights: ['Compras anteriores'],
      systemTarget: 'historico'
    },
    {
      title: 'Botão recarregar',
      description: 'Use "🔁 Recarregar esta compra" para criar uma nova lista baseada nessa compra.',
      image: 'Mock: botão recarregar destacado no card',
      highlights: ['Botão recarregar'],
      systemTarget: 'historico'
    },
    {
      title: 'Valor total',
      description: 'Confira o total de cada compra para comparar períodos.',
      image: 'Mock: valor total por compra',
      highlights: ['Valor total'],
      systemTarget: 'historico'
    }
  ],
  overviewMock: {
    caption: 'Cards de compras passadas com recarga em um clique',
    highlights: ['Compras anteriores', 'Botão recarregar', 'Valor total']
  }
};

export default historyGuide;
