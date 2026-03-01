import { HelpGuide } from '../types';

const favoritesGuide: HelpGuide = {
  id: 'favoritos',
  icon: '⭐',
  label: 'Favoritos',
  title: 'Guia — Favoritos',
  description: 'Marque itens importantes para acelerar compras recorrentes.',
  steps: [
    {
      title: 'Marque com estrela',
      description: 'Use a estrela no item da lista para favoritar ou desfavoritar rapidamente.',
      image: 'Mock: estrela de favorito no item',
      highlights: ['favorite-star'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Filtre favoritos',
      description: 'Ative o chip “⭐ Favoritos” para ver apenas os itens prioritários.',
      image: 'Mock: filtro rápido de favoritos',
      highlights: ['favorites-filter'],
      systemTarget: 'lista',
      deepLink: '/lista'
    },
    {
      title: 'Prioridade nas sugestões',
      description: 'Itens favoritos ganham prioridade no bloco de sugestões inteligentes.',
      image: 'Mock: sugestões com prioridade de favoritos',
      highlights: ['favorite-star', 'ask-ai'],
      systemTarget: 'lista',
      deepLink: '/lista'
    }
  ],
  overviewMock: {
    caption: 'Favoritos para acelerar listas recorrentes',
    highlights: ['Estrela', 'Filtro', 'Sugestões prioritárias']
  }
};

export default favoritesGuide;
