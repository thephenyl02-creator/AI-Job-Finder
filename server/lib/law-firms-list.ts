export interface LawFirmConfig {
  name: string;
  careerUrl: string;
  type: 'startup' | 'company' | 'biglaw' | 'tech-legal' | 'alsp';
  greenhouseId?: string;
  leverPostingsUrl?: string;
  ashbyUrl?: string;
  workday?: {
    company: string;
    instance: string;
    site: string;
  };
  rippling?: string;
  icims?: string;
  workableId?: string;
  smartrecruitersId?: string;
  bamboohrId?: string;
  selectors?: {
    jobList?: string;
    title?: string;
    location?: string;
    applyLink?: string;
  };
}

export const LAW_FIRMS_AND_COMPANIES: LawFirmConfig[] = [
  // ===================================================
  // LEGAL AI STARTUPS (Global)
  // ===================================================
  {
    name: 'Harvey AI',
    careerUrl: 'https://www.harvey.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/harvey',
    type: 'startup',
  },
  {
    name: 'EvenUp',
    careerUrl: 'https://jobs.ashbyhq.com/evenup',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/evenup',
    type: 'startup',
  },
  {
    name: 'Spellbook',
    careerUrl: 'https://www.spellbook.legal/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/spellbook.legal',
    type: 'startup',
  },
  {
    name: 'Darrow',
    careerUrl: 'https://www.darrow.ai/open-positions',
    greenhouseId: 'darrowai',
    type: 'startup',
  },
  {
    name: 'Legora',
    careerUrl: 'https://www.legora.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/legora',
    type: 'startup',
  },
  {
    name: 'Hebbia',
    careerUrl: 'https://www.hebbia.ai/careers',
    greenhouseId: 'hebbia',
    type: 'startup',
  },
  {
    name: 'SeedLegals',
    careerUrl: 'https://seedlegals.com/careers/',
    workableId: 'seedlegals',
    type: 'startup',
  },
  {
    name: 'Eve Legal',
    careerUrl: 'https://evelegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/Eve',
    type: 'startup',
  },
  {
    name: 'LegalOn Technologies',
    careerUrl: 'https://www.legalon.ai/careers',
    rippling: 'legalontech-inc',
    type: 'startup',
  },
  {
    name: 'Neota Logic',
    careerUrl: 'https://www.neotalogic.com/careers/',
    workableId: 'neota',
    type: 'startup',
  },
  {
    name: 'Norm.ai',
    careerUrl: 'https://www.norm.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/norm',
    type: 'startup',
  },
  {
    name: 'Orbital Witness',
    careerUrl: 'https://www.orbitalwitness.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/orbital',
    type: 'startup',
  },
  {
    name: 'Haast',
    careerUrl: 'https://jobs.ashbyhq.com/haast',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/haast',
    type: 'startup',
  },
  {
    name: 'Plexus',
    careerUrl: 'https://jobs.lever.co/plexus',
    leverPostingsUrl: 'https://jobs.lever.co/plexus',
    type: 'startup',
  },

  // ===================================================
  // EUROPEAN & INTERNATIONAL LEGAL TECH STARTUPS
  // ===================================================
  {
    name: 'Juro',
    careerUrl: 'https://juro.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/juro',
    type: 'startup',
  },
  {
    name: 'Legl',
    careerUrl: 'https://legl.com/careers',
    greenhouseId: 'legl',
    type: 'startup',
  },
  {
    name: 'Legatics',
    careerUrl: 'https://legatics.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/legatics',
    type: 'startup',
  },
  {
    name: 'Robin AI',
    careerUrl: 'https://www.robin.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/robin-ai',
    type: 'startup',
  },
  {
    name: 'Lawhive',
    careerUrl: 'https://lawhive.co.uk/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/lawhive',
    type: 'startup',
  },
  {
    name: 'Definely',
    careerUrl: 'https://definely.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/definely',
    type: 'startup',
  },
  {
    name: 'ThoughtRiver',
    careerUrl: 'https://www.thoughtriver.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/thoughtriver',
    type: 'startup',
  },
  {
    name: 'Henchman',
    careerUrl: 'https://www.henchman.io/careers',
    leverPostingsUrl: 'https://jobs.lever.co/henchman',
    type: 'startup',
  },
  {
    name: 'Avvoka',
    careerUrl: 'https://avvoka.com/careers',
    greenhouseId: 'avvoka',
    type: 'startup',
  },
  {
    name: 'BRYTER',
    careerUrl: 'https://bryter.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/bryter',
    type: 'startup',
  },
  {
    name: 'Reynen Court',
    careerUrl: 'https://www.reynencourt.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/reynencourt',
    type: 'startup',
  },
  {
    name: 'Syntheia',
    careerUrl: 'https://syntheia.io/careers',
    leverPostingsUrl: 'https://jobs.lever.co/syntheia',
    type: 'startup',
  },
  {
    name: 'Checkbox',
    careerUrl: 'https://www.checkbox.ai/careers',
    leverPostingsUrl: 'https://jobs.lever.co/checkbox',
    type: 'startup',
  },
  {
    name: 'Josef Legal',
    careerUrl: 'https://joseflegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/josef',
    type: 'startup',
  },
  {
    name: 'Zegal',
    careerUrl: 'https://www.zegal.com/careers',
    greenhouseId: 'zegal',
    type: 'startup',
  },

  // ===================================================
  // LEGAL TECH COMPANIES (Established - Global)
  // ===================================================

  // --- Major Legal Information Providers ---
  {
    name: 'LexisNexis',
    careerUrl: 'https://relx.wd3.myworkdayjobs.com/LexisNexisLegal',
    workday: { company: 'relx', instance: 'wd3', site: 'LexisNexisLegal' },
    type: 'company',
  },
  {
    name: 'Thomson Reuters',
    careerUrl: 'https://careers.thomsonreuters.com/',
    workday: { company: 'thomsonreuters', instance: 'wd5', site: 'External_Career_Site' },
    type: 'company',
  },
  {
    name: 'Wolters Kluwer',
    careerUrl: 'https://careers.wolterskluwer.com/',
    workday: { company: 'wk', instance: 'wd3', site: 'External' },
    type: 'company',
  },

  // --- Practice Management & Case Management ---
  {
    name: 'Clio',
    careerUrl: 'https://www.clio.com/company/careers/',
    workday: { company: 'clio', instance: 'wd3', site: 'ClioCareerSite' },
    type: 'tech-legal',
  },
  {
    name: 'Filevine',
    careerUrl: 'https://www.filevine.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/filevine',
    type: 'tech-legal',
  },
  {
    name: 'Litify',
    careerUrl: 'https://www.litify.com/careers/',
    greenhouseId: 'litify',
    type: 'tech-legal',
  },
  {
    name: 'Smokeball',
    careerUrl: 'https://www.smokeball.com/careers/',
    rippling: 'smokeballcareers',
    type: 'tech-legal',
  },
  {
    name: 'Lawmatics',
    careerUrl: 'https://www.lawmatics.com/careers/',
    greenhouseId: 'embed',
    type: 'tech-legal',
  },

  // --- Contract Lifecycle Management ---
  {
    name: 'Ironclad',
    careerUrl: 'https://ironcladapp.com/careers/',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/ironcladhq',
    type: 'tech-legal',
  },
  {
    name: 'Agiloft',
    careerUrl: 'https://www.agiloft.com/company/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/agiloft',
    type: 'tech-legal',
  },
  {
    name: 'ContractPodAi',
    careerUrl: 'https://contractpodai.com/careers/',
    bamboohrId: 'leah',
    type: 'tech-legal',
  },
  {
    name: 'Onit',
    careerUrl: 'https://www.onit.com/company/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/onit',
    type: 'tech-legal',
  },
  {
    name: 'LinkSquares',
    careerUrl: 'https://linksquares.com/careers/',
    greenhouseId: 'linksquaresinc',
    type: 'tech-legal',
  },
  {
    name: 'DocuSign',
    careerUrl: 'https://careers.docusign.com/',
    greenhouseId: 'docusign',
    type: 'company',
  },

  // --- Legal Spend & Operations ---
  {
    name: 'Brightflag',
    careerUrl: 'https://www.brightflag.com/careers/',
    greenhouseId: 'brightflag',
    type: 'tech-legal',
  },
  {
    name: 'Mitratech',
    careerUrl: 'https://mitratech.com/careers',
    greenhouseId: 'miaboratech',
    type: 'company',
  },

  // --- Document Management & Collaboration ---
  {
    name: 'NetDocuments',
    careerUrl: 'https://www.netdocuments.com/careers',
    greenhouseId: 'netdocuments',
    type: 'company',
  },
  {
    name: 'Litera',
    careerUrl: 'https://www.litera.com/careers',
    greenhouseId: 'litera',
    workday: { company: 'litera', instance: 'wd12', site: 'Litera_Careers' },
    type: 'company',
  },

  // --- eDiscovery & Litigation ---
  {
    name: 'CS Disco',
    careerUrl: 'https://www.csdisco.com/careers',
    greenhouseId: 'csdisco',
    type: 'company',
  },
  {
    name: 'Everlaw',
    careerUrl: 'https://www.everlaw.com/careers/',
    greenhouseId: 'everlaw',
    type: 'tech-legal',
  },
  {
    name: 'Relativity',
    careerUrl: 'https://www.relativity.com/careers',
    workday: { company: 'relataborat', instance: 'Relativity', site: 'Relativity' },
    type: 'company',
  },
  {
    name: 'Onna',
    careerUrl: 'https://onna.com/careers/',
    greenhouseId: 'onna',
    type: 'tech-legal',
  },
  {
    name: 'Epiq Global',
    careerUrl: 'https://www.epiqglobal.com/en-us/careers',
    workday: { company: 'epiqsystems', instance: 'wd503', site: 'Epiq_Careers' },
    type: 'tech-legal',
  },
  {
    name: 'LogicGate',
    careerUrl: 'https://www.logicgate.com/careers/',
    greenhouseId: 'logicgate',
    type: 'tech-legal',
  },

  // --- Legal Research & Data ---
  {
    name: 'Lex Machina',
    careerUrl: 'https://lexmachina.com/careers/',
    greenhouseId: 'lex',
    type: 'tech-legal',
  },

  // --- AI & NLP for Legal ---
  {
    name: 'Kira Systems',
    careerUrl: 'https://kirasystems.com/careers/',
    workday: { company: 'litera', instance: 'wd12', site: 'Litera_Careers' },
    type: 'tech-legal',
  },

  // --- IP & Patent Tech ---
  {
    name: 'PatSnap',
    careerUrl: 'https://www.patsnap.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/patsnap',
    type: 'tech-legal',
  },
  {
    name: 'Clarivate (IP)',
    careerUrl: 'https://clarivate.com/careers/',
    workday: { company: 'clarivate', instance: 'wd3', site: 'Clarivate_Careers' },
    type: 'company',
  },
  {
    name: 'Dennemeyer',
    careerUrl: 'https://www.dennemeyer.com/careers/',
    workday: { company: 'dennemeyer', instance: 'wd3', site: 'dennemeyer_careers' },
    type: 'tech-legal',
  },

  // --- Enterprise Tech with Major Legal Products ---
  {
    name: 'Commvault',
    careerUrl: 'https://www.commvault.com/careers',
    greenhouseId: 'commvault',
    type: 'company',
  },
  {
    name: 'Palantir',
    careerUrl: 'https://www.palantir.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/palantir',
    type: 'company',
  },

  // --- Additional Legal Tech (US) ---
  {
    name: 'DiliTrust',
    careerUrl: 'https://www.dilitrust.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/dilitrust',
    type: 'tech-legal',
  },
  {
    name: 'Evisort',
    careerUrl: 'https://www.evisort.com/careers',
    greenhouseId: 'evisort',
    type: 'tech-legal',
  },
  {
    name: 'Notarize',
    careerUrl: 'https://www.notarize.com/careers',
    greenhouseId: 'notarize',
    type: 'tech-legal',
  },
  {
    name: 'iManage',
    careerUrl: 'https://imanage.com/company/careers/',
    greenhouseId: 'imanage',
    type: 'tech-legal',
  },
  {
    name: 'Aderant',
    careerUrl: 'https://www.aderant.com/careers/',
    workday: { company: 'aderant', instance: 'wd5', site: 'Aderant_External_Careers' },
    type: 'tech-legal',
  },
  {
    name: 'Precisely',
    careerUrl: 'https://www.precisely.com/careers',
    greenhouseId: 'precisely',
    type: 'tech-legal',
  },

  // --- Canadian Legal Tech ---
  {
    name: 'Blue J Legal',
    careerUrl: 'https://www.bluej.com/careers',
    greenhouseId: 'bluej',
    type: 'startup',
  },
  {
    name: 'Athennian',
    careerUrl: 'https://www.athennian.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/athennian',
    type: 'startup',
  },

  // ===================================================
  // AM LAW 200 / BIG LAW FIRMS - US (ATS-configured)
  // ===================================================
  {
    name: 'Kirkland & Ellis',
    careerUrl: 'https://staffjobsus.kirkland.com/',
    workday: { company: 'kirkland', instance: 'wd1', site: 'Kirkland' },
    type: 'biglaw',
  },
  {
    name: 'Latham & Watkins',
    careerUrl: 'https://www.lw.com/careers',
    icims: 'lw',
    type: 'biglaw',
  },
  {
    name: 'DLA Piper',
    careerUrl: 'https://www.dlapiper.com/en/us/careers/',
    workday: { company: 'dlapiper', instance: 'wd1', site: 'dlapiper' },
    type: 'biglaw',
  },
  {
    name: 'Skadden',
    careerUrl: 'https://www.skadden.com/careers',
    workday: { company: 'skadden', instance: 'wd5', site: 'Skadden_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Hogan Lovells',
    careerUrl: 'https://www.hoganlovells.com/en/careers',
    workday: { company: 'hoganlovells', instance: 'wd3', site: 'Search' },
    type: 'biglaw',
  },
  {
    name: 'Morgan Lewis',
    careerUrl: 'https://www.morganlewis.com/careers',
    workday: { company: 'morganlewis', instance: 'wd5', site: 'morganlewis' },
    type: 'biglaw',
  },
  {
    name: 'Cooley',
    careerUrl: 'https://www.cooley.com/careers',
    workday: { company: 'cooley', instance: 'wd1', site: 'Cooley_US_LLP' },
    type: 'biglaw',
  },
  {
    name: 'Goodwin Procter',
    careerUrl: 'https://www.goodwinlaw.com/careers',
    workday: { company: 'goodwinprocter', instance: 'wd5', site: 'External_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Perkins Coie',
    careerUrl: 'https://www.perkinscoie.com/en/careers.html',
    workday: { company: 'perkinscoie', instance: 'wd1', site: 'perkinscoieexternal' },
    type: 'biglaw',
  },
  {
    name: 'Fenwick & West',
    careerUrl: 'https://www.fenwick.com/careers',
    workday: { company: 'fenwick', instance: 'wd1', site: 'Fenwick_External_Careers' },
    type: 'biglaw',
  },
  {
    name: 'McDermott Will & Emery',
    careerUrl: 'https://www.mwe.com/careers/',
    workday: { company: 'mwe', instance: 'wd5', site: 'mwe_careers' },
    type: 'biglaw',
  },
  {
    name: 'Greenberg Traurig',
    careerUrl: 'https://www.gtlaw.com/en/careers',
    workday: { company: 'gtlaw', instance: 'wd1', site: 'GTLAW' },
    type: 'biglaw',
  },
  {
    name: 'Holland & Knight',
    careerUrl: 'https://www.hklaw.com/en/careers',
    workday: { company: 'hklaw', instance: 'wd1', site: 'Holland_Knight' },
    type: 'biglaw',
  },
  {
    name: 'Foley & Lardner',
    careerUrl: 'https://www.foley.com/careers/',
    icims: 'foley',
    type: 'biglaw',
  },
  {
    name: 'Alston & Bird',
    careerUrl: 'https://www.alston.com/en/careers',
    workday: { company: 'alston', instance: 'wd1', site: 'ExternalCareer' },
    type: 'biglaw',
  },

  // ===================================================
  // UK / MAGIC CIRCLE & MAJOR UK FIRMS (ATS-configured)
  // ===================================================
  {
    name: 'Clifford Chance',
    careerUrl: 'https://www.cliffordchance.com/careers.html',
    workday: { company: 'cliffordchance', instance: 'wd1', site: 'CliffordChance' },
    type: 'biglaw',
  },
  {
    name: 'Allen & Overy (A&O Shearman)',
    careerUrl: 'https://www.aoshearman.com/careers',
    workday: { company: 'aoshearman', instance: 'wd3', site: 'AOShearman' },
    type: 'biglaw',
  },
  {
    name: 'Freshfields',
    careerUrl: 'https://www.freshfields.com/en-gb/careers/',
    workday: { company: 'freshfields', instance: 'wd3', site: 'Freshfields' },
    type: 'biglaw',
  },
  {
    name: 'Linklaters',
    careerUrl: 'https://www.linklaters.com/en/careers',
    workday: { company: 'linklaters', instance: 'wd3', site: 'Linklaters' },
    type: 'biglaw',
  },
  {
    name: 'Herbert Smith Freehills',
    careerUrl: 'https://www.herbertsmithfreehills.com/careers',
    workday: { company: 'herbertsmithfreehills', instance: 'wd3', site: 'External' },
    type: 'biglaw',
  },
  {
    name: 'Norton Rose Fulbright',
    careerUrl: 'https://www.nortonrosefulbright.com/en/careers',
    workday: { company: 'nrf', instance: 'wd3', site: 'External' },
    type: 'biglaw',
  },
  {
    name: 'Clyde & Co',
    careerUrl: 'https://www.clydeco.com/en/careers',
    workday: { company: 'clydeco', instance: 'wd103', site: 'clydecocareers' },
    type: 'biglaw',
  },
  {
    name: 'Stephenson Harwood',
    careerUrl: 'https://www.shlegal.com/careers',
    icims: 'shlegal',
    type: 'biglaw',
  },

  // ===================================================
  // ASIA-PACIFIC LAW FIRMS (ATS-configured)
  // ===================================================
  {
    name: 'Allens',
    careerUrl: 'https://www.allens.com.au/careers/',
    workday: { company: 'allens', instance: 'wd3', site: 'Allens' },
    type: 'biglaw',
  },
  {
    name: 'Clayton Utz',
    careerUrl: 'https://www.claytonutz.com/careers',
    workday: { company: 'claytonutz', instance: 'wd3', site: 'Claytonutz1' },
    type: 'biglaw',
  },
  {
    name: 'Nishimura & Asahi',
    careerUrl: 'https://www.nishimura.com/en/careers',
    workday: { company: 'jurists', instance: 'wd3', site: 'global' },
    type: 'biglaw',
  },

  // ===================================================
  // CANADIAN LAW FIRMS (ATS-configured)
  // ===================================================
  {
    name: 'Norton Rose Fulbright Canada',
    careerUrl: 'https://www.nortonrosefulbright.com/en-ca/careers',
    workday: { company: 'nrfcanada', instance: 'wd10', site: 'en-CA' },
    type: 'biglaw',
  },

  // ===================================================
  // ALTERNATIVE LEGAL SERVICE PROVIDERS (ALSPs)
  // ===================================================
  {
    name: 'Axiom',
    careerUrl: 'https://www.axiomlaw.com/careers',
    greenhouseId: 'axiomtalentplatform',
    type: 'alsp',
  },
  {
    name: 'Integreon',
    careerUrl: 'https://www.integreon.com/careers/',
    icims: 'integreon',
    type: 'alsp',
  },
  {
    name: 'QuisLex',
    careerUrl: 'https://www.quislex.com/careers/',
    icims: 'quislex',
    type: 'alsp',
  },
];
