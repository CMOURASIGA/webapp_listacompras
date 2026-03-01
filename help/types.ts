export interface GuideStep {
  id: string;
  title: string;
  description: string;
  highlightTarget: string;
  deepLink?: string;
}

export interface Guide {
  id: string;
  title: string;
  steps: GuideStep[];
}

export type HelpStepData = {
  title: string;
  description: string;
  image: string;
  highlights?: string[];
  systemTarget?: HelpSystemTarget;
  deepLink?: string;
};

export type HelpSystemTarget = 'lista' | 'carrinho' | 'historico' | 'configuracoes';

export type HelpSubsection = {
  title: string;
  description: string;
  bullets: string[];
};

export type HelpExternalLink = {
  label: string;
  url: string;
};

export type HelpTabGuide = {
  id: string;
  label: string;
  cta: HelpExternalLink;
  steps: HelpStepData[];
};

export type HelpGuide = {
  id: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  subsections?: HelpSubsection[];
  steps?: HelpStepData[];
  tabGuides?: HelpTabGuide[];
  overviewMock?: {
    caption: string;
    highlights: string[];
  };
};
