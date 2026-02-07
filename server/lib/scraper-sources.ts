export type OrgType = 'legaltech-core' | 'legaltech' | 'lawfirm' | 'legalaid';

export interface ScraperSource {
  name: string;
  id: string;
  type: OrgType;
  platform: 'greenhouse' | 'lever';
}

export const SCRAPER_SOURCES: ScraperSource[] = [
  { name: 'Everlaw', id: 'everlaw', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'NetDocuments', id: 'netdocuments', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'Mitratech', id: 'mitratech', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'Brightflag', id: 'brightflag', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'Rocket Lawyer', id: 'rocketlawyer', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'Gibson Dunn', id: 'gibsondunn', type: 'lawfirm', platform: 'greenhouse' },
  { name: 'Legal Services NYC', id: 'legalservicesnyc', type: 'legalaid', platform: 'greenhouse' },
  { name: 'Axiom', id: 'axiom', type: 'legaltech-core', platform: 'greenhouse' },
  { name: 'Anthropic', id: 'anthropic', type: 'legaltech', platform: 'greenhouse' },
  { name: 'OneTrust', id: 'onetrust', type: 'legaltech', platform: 'greenhouse' },
  { name: 'Notion', id: 'notion', type: 'legaltech', platform: 'greenhouse' },
  { name: 'Factor', id: 'factorlegal', type: 'legaltech-core', platform: 'lever' },
];

export const GREENHOUSE_SOURCES = SCRAPER_SOURCES.filter(s => s.platform === 'greenhouse');
export const LEVER_SOURCES = SCRAPER_SOURCES.filter(s => s.platform === 'lever');
