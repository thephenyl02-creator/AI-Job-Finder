export interface LawFirmConfig {
  name: string;
  careerUrl: string;
  type: 'startup' | 'company' | 'biglaw' | 'tech-legal';
  greenhouseId?: string;
  leverPostingsUrl?: string;
  ashbyUrl?: string;
  selectors?: {
    jobList?: string;
    title?: string;
    location?: string;
    applyLink?: string;
  };
}

export const LAW_FIRMS_AND_COMPANIES: LawFirmConfig[] = [
  // Legal AI Startups
  {
    name: 'Harvey AI',
    careerUrl: 'https://www.harvey.ai/careers',
    type: 'startup',
  },
  {
    name: 'CoCounsel (Casetext)',
    careerUrl: 'https://casetext.com/careers',
    type: 'startup',
  },
  {
    name: 'EvenUp',
    careerUrl: 'https://www.evenuplaw.com/careers',
    type: 'startup',
  },
  {
    name: 'Robin AI',
    careerUrl: 'https://www.robinai.com/careers',
    type: 'startup',
  },
  {
    name: 'Ironclad',
    careerUrl: 'https://ironcladapp.com/careers/',
    type: 'startup',
  },
  {
    name: 'Lexion',
    careerUrl: 'https://www.lexion.ai/careers',
    type: 'startup',
  },
  
  // Legal Tech Companies
  {
    name: 'Clio',
    careerUrl: 'https://www.clio.com/company/careers/',
    greenhouseId: 'clio',
    type: 'company',
  },
  {
    name: 'Relativity',
    careerUrl: 'https://www.relativity.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/relativity',
    type: 'company',
  },
  {
    name: 'DISCO',
    careerUrl: 'https://www.csdisco.com/careers',
    type: 'company',
  },
  {
    name: 'Everlaw',
    careerUrl: 'https://www.everlaw.com/careers/',
    greenhouseId: 'everlaw',
    type: 'company',
  },
  {
    name: 'vLex',
    careerUrl: 'https://vlex.com/careers',
    type: 'company',
  },
];
