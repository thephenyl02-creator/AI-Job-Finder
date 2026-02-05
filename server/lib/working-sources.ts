// Only sources that are confirmed to return jobs
export const WORKING_SOURCES = [
  // Lever-based sources (working)
  { name: 'Everlaw', leverPostingsUrl: 'https://jobs.lever.co/everlaw', type: 'company' as const },
  { name: 'NetDocuments', leverPostingsUrl: 'https://jobs.lever.co/netdocuments', type: 'company' as const },
  { name: 'Mitratech', leverPostingsUrl: 'https://jobs.lever.co/mitratech', type: 'company' as const },
  { name: 'Brightflag', leverPostingsUrl: 'https://jobs.lever.co/brightflag', type: 'company' as const },
  { name: 'Axiom', leverPostingsUrl: 'https://jobs.lever.co/axiomlaw', type: 'alsp' as const },
  { name: 'QuisLex', leverPostingsUrl: 'https://jobs.lever.co/quislex', type: 'alsp' as const },
  { name: 'Neota Logic', leverPostingsUrl: 'https://jobs.lever.co/neotalogic', type: 'company' as const },
];
