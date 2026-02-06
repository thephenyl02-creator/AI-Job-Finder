export interface LawFirmConfig {
  name: string;
  careerUrl: string;
  type: 'startup' | 'company' | 'biglaw' | 'tech-legal' | 'alsp';
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
  // ===================
  // LEGAL AI STARTUPS
  // ===================
  {
    name: 'Harvey AI',
    careerUrl: 'https://www.harvey.ai/careers',
    greenhouseId: 'harvey',
    type: 'startup',
  },
  {
    name: 'EvenUp',
    careerUrl: 'https://www.evenuplaw.com/careers',
    greenhouseId: 'evenuplaw',
    type: 'startup',
  },
  {
    name: 'Spellbook',
    careerUrl: 'https://www.spellbook.legal/careers',
    leverPostingsUrl: 'https://jobs.lever.co/spellbook',
    type: 'startup',
  },
  {
    name: 'Luminance',
    careerUrl: 'https://www.luminance.com/careers/',
    greenhouseId: 'luminance',
    type: 'startup',
  },
  {
    name: 'Darrow',
    careerUrl: 'https://www.darrow.ai/careers',
    greenhouseId: 'darrow',
    type: 'startup',
  },
  {
    name: 'Legora',
    careerUrl: 'https://www.leya.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/leya',
    type: 'startup',
  },
  {
    name: 'Atrium (Legal AI)',
    careerUrl: 'https://www.atrium.ai/careers',
    greenhouseId: 'atrium',
    type: 'startup',
  },
  {
    name: 'Responsiv',
    careerUrl: 'https://responsiv.ai/careers',
    leverPostingsUrl: 'https://jobs.lever.co/responsiv',
    type: 'startup',
  },

  // ===================
  // LEGAL TECH COMPANIES (Established)
  // ===================
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
    name: 'Everlaw',
    careerUrl: 'https://www.everlaw.com/careers/',
    greenhouseId: 'everlaw',
    type: 'company',
  },
  {
    name: 'Ironclad',
    careerUrl: 'https://ironcladapp.com/careers/',
    greenhouseId: 'ironcladapp',
    type: 'company',
  },
  {
    name: 'LexisNexis',
    careerUrl: 'https://www.lexisnexis.com/en-us/about-us/careers.page',
    type: 'company',
  },
  {
    name: 'Thomson Reuters Legal',
    careerUrl: 'https://careers.thomsonreuters.com/',
    type: 'company',
  },
  {
    name: 'Litera',
    careerUrl: 'https://www.litera.com/company/careers/',
    greenhouseId: 'litera',
    type: 'company',
  },
  {
    name: 'NetDocuments',
    careerUrl: 'https://www.netdocuments.com/company/careers',
    greenhouseId: 'netdocuments',
    type: 'company',
  },
  {
    name: 'Filevine',
    careerUrl: 'https://www.filevine.com/careers/',
    greenhouseId: 'filevine',
    type: 'company',
  },
  {
    name: 'PracticePanther',
    careerUrl: 'https://www.practicepanther.com/careers/',
    greenhouseId: 'practicepanther',
    type: 'company',
  },
  {
    name: 'MyCase',
    careerUrl: 'https://www.mycase.com/company/careers/',
    type: 'company',
  },
  {
    name: 'Smokeball',
    careerUrl: 'https://www.smokeball.com/careers/',
    greenhouseId: 'smokeball',
    type: 'company',
  },
  {
    name: 'Juro',
    careerUrl: 'https://juro.com/careers',
    greenhouseId: 'juro',
    type: 'company',
  },
  {
    name: 'ContractPodAi',
    careerUrl: 'https://contractpodai.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/contractpodai',
    type: 'company',
  },
  {
    name: 'Agiloft',
    careerUrl: 'https://www.agiloft.com/company/careers/',
    greenhouseId: 'agiloft',
    type: 'company',
  },
  {
    name: 'LinkSquares',
    careerUrl: 'https://linksquares.com/careers/',
    greenhouseId: 'linksquares',
    type: 'company',
  },
  {
    name: 'Onit',
    careerUrl: 'https://www.onit.com/company/careers/',
    greenhouseId: 'onit',
    type: 'company',
  },
  {
    name: 'SimpleLegal',
    careerUrl: 'https://www.simplelegal.com/careers',
    greenhouseId: 'simplelegal',
    type: 'company',
  },
  {
    name: 'Brightflag',
    careerUrl: 'https://www.brightflag.com/careers/',
    greenhouseId: 'brightflag',
    type: 'company',
  },
  {
    name: 'Lawmatics',
    careerUrl: 'https://www.lawmatics.com/careers/',
    greenhouseId: 'lawmatics',
    type: 'company',
  },
  {
    name: 'Mitratech',
    careerUrl: 'https://mitratech.com/company/careers/',
    greenhouseId: 'mitratech',
    type: 'company',
  },
  {
    name: 'DocuSign',
    careerUrl: 'https://www.docusign.com/careers',
    greenhouseId: 'docusign',
    type: 'company',
  },
  {
    name: 'Icertis',
    careerUrl: 'https://www.icertis.com/company/careers/',
    greenhouseId: 'icertis',
    type: 'company',
  },

  // ===================
  // EDISCOVERY & LITIGATION
  // ===================
  {
    name: 'DISCO',
    careerUrl: 'https://www.csdisco.com/careers',
    greenhouseId: 'csdisco',
    type: 'company',
  },
  {
    name: 'Logikcull',
    careerUrl: 'https://www.logikcull.com/careers',
    greenhouseId: 'logikcull',
    type: 'company',
  },
  {
    name: 'Reveal Data',
    careerUrl: 'https://www.revealdata.com/careers',
    greenhouseId: 'revealdata',
    type: 'company',
  },
  {
    name: 'Nuix',
    careerUrl: 'https://www.nuix.com/company/careers',
    greenhouseId: 'nuix',
    type: 'company',
  },
  {
    name: 'Onna',
    careerUrl: 'https://onna.com/careers/',
    greenhouseId: 'onna',
    type: 'company',
  },
  {
    name: 'Hanzo',
    careerUrl: 'https://www.hanzo.co/careers',
    greenhouseId: 'hanzo',
    type: 'company',
  },
  {
    name: 'Exterro',
    careerUrl: 'https://www.exterro.com/careers',
    greenhouseId: 'exterro',
    type: 'company',
  },

  // ===================
  // AM LAW 200 / BIG LAW FIRMS (Tech & Innovation)
  // ===================
  {
    name: 'Kirkland & Ellis',
    careerUrl: 'https://www.kirkland.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Latham & Watkins',
    careerUrl: 'https://www.lw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Baker McKenzie',
    careerUrl: 'https://www.bakermckenzie.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'DLA Piper',
    careerUrl: 'https://www.dlapiper.com/en/us/careers/',
    type: 'biglaw',
  },
  {
    name: 'Clifford Chance',
    careerUrl: 'https://www.cliffordchance.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Allen & Overy',
    careerUrl: 'https://www.allenovery.com/en-gb/careers',
    type: 'biglaw',
  },
  {
    name: 'Freshfields',
    careerUrl: 'https://www.freshfields.com/en-gb/careers/',
    type: 'biglaw',
  },
  {
    name: 'Linklaters',
    careerUrl: 'https://www.linklaters.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Hogan Lovells',
    careerUrl: 'https://www.hoganlovells.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Morgan Lewis',
    careerUrl: 'https://www.morganlewis.com/careers',
    type: 'biglaw',
  },
  {
    name: 'White & Case',
    careerUrl: 'https://www.whitecase.com/careers',
    greenhouseId: 'whitecase',
    type: 'biglaw',
  },
  {
    name: 'Jones Day',
    careerUrl: 'https://www.jonesday.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Sidley Austin',
    careerUrl: 'https://www.sidley.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Skadden',
    careerUrl: 'https://www.skadden.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Davis Polk',
    careerUrl: 'https://www.davispolk.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Sullivan & Cromwell',
    careerUrl: 'https://www.sullcrom.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Simpson Thacher',
    careerUrl: 'https://www.stblaw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Weil Gotshal',
    careerUrl: 'https://www.weil.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cleary Gottlieb',
    careerUrl: 'https://www.clearygottlieb.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cravath',
    careerUrl: 'https://www.cravath.com/careers/',
    type: 'biglaw',
  },

  // ===================
  // ALTERNATIVE LEGAL SERVICE PROVIDERS (ALSPs)
  // ===================
  {
    name: 'Axiom',
    careerUrl: 'https://www.axiomlaw.com/careers',
    greenhouseId: 'axiom',
    type: 'alsp',
  },
  {
    name: 'UnitedLex',
    careerUrl: 'https://www.unitedlex.com/careers',
    greenhouseId: 'unitedlex',
    type: 'alsp',
  },
  {
    name: 'Elevate',
    careerUrl: 'https://elevateservices.com/careers/',
    greenhouseId: 'elevate',
    type: 'alsp',
  },
  {
    name: 'Factor (fka Axiom Managed Solutions)',
    careerUrl: 'https://www.factor.law/careers',
    leverPostingsUrl: 'https://jobs.lever.co/factor',
    type: 'alsp',
  },
  {
    name: 'Integreon',
    careerUrl: 'https://www.integreon.com/careers/',
    type: 'alsp',
  },
  {
    name: 'QuisLex',
    careerUrl: 'https://www.quislex.com/careers/',
    type: 'alsp',
  },
  {
    name: 'LOD (Lawyers On Demand)',
    careerUrl: 'https://www.lodlaw.com/careers/',
    type: 'alsp',
  },
  {
    name: 'Morae Global',
    careerUrl: 'https://www.moraeglobal.com/careers/',
    greenhouseId: 'morae',
    type: 'alsp',
  },

  // ===================
  // LEGAL RESEARCH & DATA
  // ===================
  {
    name: 'vLex',
    careerUrl: 'https://vlex.com/careers',
    greenhouseId: 'vlex',
    type: 'company',
  },
  {
    name: 'Fastcase',
    careerUrl: 'https://www.fastcase.com/careers/',
    type: 'company',
  },
  {
    name: 'Ravel Law (LexisNexis)',
    careerUrl: 'https://www.lexisnexis.com/en-us/about-us/careers.page',
    type: 'company',
  },
  {
    name: 'Westlaw (Thomson Reuters)',
    careerUrl: 'https://careers.thomsonreuters.com/',
    type: 'company',
  },
  {
    name: 'Docket Alarm',
    careerUrl: 'https://www.docketalarm.com/careers',
    type: 'company',
  },
  {
    name: 'Lex Machina',
    careerUrl: 'https://lexmachina.com/careers/',
    type: 'company',
  },

  // ===================
  // LEGAL WORKFLOW & AUTOMATION
  // ===================
  {
    name: 'Lawyaw',
    careerUrl: 'https://lawyaw.com/careers',
    type: 'startup',
  },
  {
    name: 'Gavel (fka Documate)',
    careerUrl: 'https://www.gavel.io/careers',
    greenhouseId: 'gavel',
    type: 'startup',
  },
  {
    name: 'Josef',
    careerUrl: 'https://joseflegal.com/careers/',
    type: 'startup',
  },
  {
    name: 'Neota Logic',
    careerUrl: 'https://www.neotalogic.com/careers/',
    type: 'startup',
  },
  {
    name: 'Checkbox',
    careerUrl: 'https://www.checkbox.ai/careers',
    greenhouseId: 'checkbox',
    type: 'startup',
  },
  {
    name: 'Reynen Court',
    careerUrl: 'https://www.reynencourt.com/careers',
    type: 'startup',
  },

  // ===================
  // IP & PATENT TECH
  // ===================
  {
    name: 'Anaqua',
    careerUrl: 'https://www.anaqua.com/company/careers/',
    greenhouseId: 'anaqua',
    type: 'company',
  },
  {
    name: 'CPA Global',
    careerUrl: 'https://www.cpaglobal.com/careers',
    type: 'company',
  },
  {
    name: 'Dennemeyer',
    careerUrl: 'https://www.dennemeyer.com/careers/',
    type: 'company',
  },
  {
    name: 'PatSnap',
    careerUrl: 'https://www.patsnap.com/careers/',
    greenhouseId: 'patsnap',
    type: 'company',
  },
  {
    name: 'Clarivate (IP)',
    careerUrl: 'https://clarivate.com/careers/',
    type: 'company',
  },

  // ===================
  // COMPLIANCE & REGTECH
  // ===================
  {
    name: 'Kira Systems',
    careerUrl: 'https://kirasystems.com/careers/',
    greenhouseId: 'kirasystems',
    type: 'company',
  },
  {
    name: 'Eigen Technologies',
    careerUrl: 'https://eigentech.com/careers/',
    greenhouseId: 'eigentech',
    type: 'company',
  },
  {
    name: 'Knowable',
    careerUrl: 'https://www.knowablehq.com/careers',
    type: 'startup',
  },
  {
    name: 'Della',
    careerUrl: 'https://della.ai/careers',
    type: 'startup',
  },
  {
    name: 'Henchman',
    careerUrl: 'https://www.henchman.io/careers',
    greenhouseId: 'henchman',
    type: 'startup',
  },
];
