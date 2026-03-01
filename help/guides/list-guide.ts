import { HelpGuide } from '../types';

const listGuide: HelpGuide = {
  id: 'montando-lista',
  icon: '📝',
  label: 'Montando sua lista',
  title: 'Guia 2 — Montando sua lista',
  description: 'Mock da tela Lista com os pontos principais para cadastro rápido.',
  subsections: [
    {
      title: 'Bloco Sugestões Inteligentes',
      description: 'Ajuda a montar a lista mais rápido com sugestões prontas.',
      bullets: [
        'Frequentes: itens recorrentes do seu uso.',
        'Última compra: reaproveita itens da compra anterior.',
        'IA: gera novas sugestões com base no contexto da sua lista.'
      ]
    }
  ],
  steps: [
    {
      title: 'Quick add',
      description: 'Digite o nome ou escolha uma sugestão para reduzir o tempo de cadastro.',
      image: 'Mock: campo principal de adicionar item',
      highlights: ['quick-add'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Quantidade',
      description: 'Ajuste com stepper ou número direto para cada item.',
      image: 'Mock: controle de quantidade',
      highlights: ['Quantidade'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Categoria',
      description: 'Use a categoria automática ou ajuste manualmente no modo completo.',
      image: 'Mock: seletor de categoria',
      highlights: ['Categoria'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Sugestões Inteligentes',
      description: 'Use o bloco de sugestões para adicionar itens com 1 clique e acelerar a montagem da lista.',
      image: 'Mock: painel de sugestões inteligentes',
      highlights: ['Pedir IA'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Elementos críticos da tela Lista',
    highlights: ['quick-add', 'Quantidade', 'Categoria', 'Pedir IA']
  }
};

export default listGuide;
