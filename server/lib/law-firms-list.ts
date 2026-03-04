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
    label?: string;
  } | {
    company: string;
    instance: string;
    site: string;
    label?: string;
  }[];
  ultipro?: {
    companyCode: string;
    boardId: string;
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
    name: 'Spellbook',
    careerUrl: 'https://www.spellbook.legal/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/spellbook.legal',
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
    name: 'Neota Logic',
    careerUrl: 'https://www.neotalogic.com/careers/',
    workableId: 'neota',
    type: 'startup',
  },
  {
    name: 'Norm AI',
    careerUrl: 'https://www.norm.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/norm-ai',
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
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/juro',
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
    name: 'Vector Legal',
    careerUrl: 'https://www.vectorlegal.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/vector',
    type: 'startup',
  },
  {
    name: 'Eudia',
    careerUrl: 'https://www.eudia.com/careers',
    greenhouseId: 'eudia',
    type: 'startup',
  },
  {
    name: 'Diligent Corporation',
    careerUrl: 'https://www.diligent.com/company/careers',
    greenhouseId: 'diligentcorporation',
    type: 'company',
  },

  // ===================================================
  // LEGAL TECH COMPANIES (Established - Global)
  // ===================================================

  // --- Major Legal Information Providers ---
  {
    name: 'LexisNexis',
    careerUrl: 'https://relx.wd3.myworkdayjobs.com/LexisNexisLegal',
    workday: [
      { company: 'relx', instance: 'wd3', site: 'LexisNexisLegal', label: 'US' },
      { company: 'relx', instance: 'wd3', site: 'RELXCareers', label: 'Global/RELX' },
    ],
    type: 'company',
  },
  {
    name: 'Thomson Reuters',
    careerUrl: 'https://careers.thomsonreuters.com/',
    workday: [
      { company: 'thomsonreuters', instance: 'wd5', site: 'External_Career_Site', label: 'US' },
      { company: 'thomsonreuters', instance: 'wd5', site: 'External_Career_Site_EMEA', label: 'EMEA' },
      { company: 'thomsonreuters', instance: 'wd5', site: 'External_Career_Site_APAC', label: 'APAC' },
    ],
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
    smartrecruitersId: 'DocuSign',
    type: 'company',
  },
  {
    name: 'Icertis',
    careerUrl: 'https://www.icertis.com/careers/',
    smartrecruitersId: 'Icertis',
    type: 'tech-legal',
  },
  {
    name: 'Precisely',
    careerUrl: 'https://www.precisely.com/careers',
    type: 'company',
  },

  // --- Legal Spend & Operations ---
  {
    name: 'Brightflag',
    careerUrl: 'https://www.brightflag.com/careers/',
    greenhouseId: 'brightflag',
    type: 'tech-legal',
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
    workday: { company: 'litera', instance: 'wd12', site: 'Litera_Careers' },
    type: 'company',
  },

  // --- eDiscovery & Litigation ---
  {
    name: 'CS Disco',
    careerUrl: 'https://www.csdisco.com/careers',
    greenhouseId: 'disco',
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
    greenhouseId: 'relativity',
    type: 'company',
  },
  {
    name: 'Lighthouse',
    careerUrl: 'https://www.lighthouseglobal.com/careers',
    greenhouseId: 'lighthouse',
    type: 'company',
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
  {
    name: 'Mitratech',
    careerUrl: 'https://www.mitratech.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Checkbox',
    careerUrl: 'https://www.checkbox.ai/careers',
    type: 'startup',
  },

  // --- Contract Automation & AI ---
  {
    name: 'Ontra',
    careerUrl: 'https://www.ontra.ai/careers/',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/ontra',
    type: 'tech-legal',
  },
  {
    name: 'Droit Financial',
    careerUrl: 'https://www.droit.tech/careers',
    greenhouseId: 'droit',
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

  // --- Compliance & RegTech ---
  {
    name: 'Vanta',
    careerUrl: 'https://www.vanta.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/vanta',
    type: 'tech-legal',
  },
  {
    name: 'Drata',
    careerUrl: 'https://drata.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/drata',
    type: 'tech-legal',
  },
  {
    name: 'OneTrust',
    careerUrl: 'https://www.onetrust.com/careers/',
    smartrecruitersId: 'OneTrust',
    type: 'tech-legal',
  },
  {
    name: 'Workiva',
    careerUrl: 'https://www.workiva.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'NICE Actimize',
    careerUrl: 'https://www.niceactimize.com/careers/',
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
  {
    name: 'CPA Global (Clarivate)',
    careerUrl: 'https://clarivate.com/careers/',
    workday: { company: 'clarivate', instance: 'wd3', site: 'Clarivate_Careers' },
    type: 'tech-legal',
  },

  // --- Enterprise Tech with Major Legal Products ---
  {
    name: 'Commvault',
    careerUrl: 'https://www.commvault.com/careers',
    greenhouseId: 'commvault',
    type: 'company',
  },

  // --- Additional Legal Tech (US & Global) ---
  {
    name: 'DiliTrust',
    careerUrl: 'https://www.dilitrust.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/dilitrust',
    type: 'tech-legal',
  },
  {
    name: 'Aderant',
    careerUrl: 'https://www.aderant.com/careers/',
    workday: { company: 'aderant', instance: 'wd5', site: 'Aderant_External_Careers' },
    type: 'tech-legal',
  },

  // --- Canadian Legal Tech ---
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
    workday: [
      { company: 'dlapiper', instance: 'wd1', site: 'dlapiper', label: 'US' },
      { company: 'dlapiper', instance: 'wd1', site: 'dlapiperuk', label: 'UK' },
      { company: 'dlapiper', instance: 'wd1', site: 'dlapiperemea', label: 'EMEA' },
    ],
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
    workday: [
      { company: 'hoganlovells', instance: 'wd3', site: 'Search', label: 'US' },
      { company: 'hoganlovells', instance: 'wd3', site: 'SearchUK', label: 'UK' },
    ],
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
  {
    name: 'White & Case',
    careerUrl: 'https://www.whitecase.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Weil Gotshal & Manges',
    careerUrl: 'https://www.weil.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Davis Polk & Wardwell',
    careerUrl: 'https://www.davispolk.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cravath Swaine & Moore',
    careerUrl: 'https://www.cravath.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Paul Weiss',
    careerUrl: 'https://www.paulweiss.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Debevoise & Plimpton',
    careerUrl: 'https://www.debevoise.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cleary Gottlieb',
    careerUrl: 'https://www.clearygottlieb.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Baker McKenzie',
    careerUrl: 'https://www.bakermckenzie.com/en/careers',
    workday: [
      { company: 'bakermckenzie', instance: 'wd5', site: 'BakerMcKenzie', label: 'US' },
      { company: 'bakermckenzie', instance: 'wd5', site: 'BakerMcKenzieUK', label: 'UK' },
      { company: 'bakermckenzie', instance: 'wd5', site: 'BakerMcKenzieEMEA', label: 'EMEA' },
    ],
    type: 'biglaw',
  },
  {
    name: 'Dentons',
    careerUrl: 'https://www.dentons.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Jones Day',
    careerUrl: 'https://www.jonesday.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'King & Spalding',
    careerUrl: 'https://www.kslaw.com/pages/careers',
    workday: { company: 'kslaw', instance: 'wd1', site: 'Careers' },
    type: 'biglaw',
  },
  {
    name: 'Sidley Austin',
    careerUrl: 'https://www.sidley.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Mayer Brown',
    careerUrl: 'https://www.mayerbrown.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Milbank',
    careerUrl: 'https://www.milbank.com/en/careers',
    icims: 'milbank',
    type: 'biglaw',
  },
  {
    name: 'Quinn Emanuel',
    careerUrl: 'https://www.quinnemanuel.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'WilmerHale',
    careerUrl: 'https://www.wilmerhale.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Gibson Dunn',
    careerUrl: 'https://www.gibsondunn.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Ropes & Gray',
    careerUrl: 'https://www.ropesgray.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Morrison & Foerster',
    careerUrl: 'https://www.mofo.com/careers',
    workday: { company: 'mofo', instance: 'wd5', site: 'MoFo_External' },
    type: 'biglaw',
  },
  {
    name: 'Willkie Farr & Gallagher',
    careerUrl: 'https://www.willkie.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Proskauer Rose',
    careerUrl: 'https://www.proskauer.com/careers',
    workday: { company: 'proskauer', instance: 'wd5', site: 'Proskauer_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Dechert',
    careerUrl: 'https://www.dechert.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Shearman & Sterling',
    careerUrl: 'https://www.aoshearman.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Akin Gump',
    careerUrl: 'https://www.akingump.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Arnold & Porter',
    careerUrl: 'https://www.arnoldporter.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Husch Blackwell',
    careerUrl: 'https://recruiting2.ultipro.com/HUS1001HUSCH/JobBoard/b6637591-8c8d-49b8-b093-5524b203b157',
    ultipro: { companyCode: 'HUS1001HUSCH', boardId: 'b6637591-8c8d-49b8-b093-5524b203b157' },
    type: 'biglaw',
  },

  // ===================================================
  // UK / MAGIC CIRCLE & MAJOR UK FIRMS (ATS-configured)
  // ===================================================
  {
    name: 'Clifford Chance',
    careerUrl: 'https://www.cliffordchance.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Allen & Overy (A&O Shearman)',
    careerUrl: 'https://www.aoshearman.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Freshfields',
    careerUrl: 'https://www.freshfields.com/en-gb/careers/',
    workday: { company: 'freshfields', instance: 'wd3', site: 'FBD_101' },
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
    workday: [
      { company: 'nrf', instance: 'wd3', site: 'External', label: 'Global' },
      { company: 'nrf', instance: 'wd3', site: 'NRF_UK', label: 'UK' },
      { company: 'nrf', instance: 'wd3', site: 'NRF_EMEA', label: 'EMEA' },
    ],
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
  {
    name: 'Slaughter and May',
    careerUrl: 'https://www.slaughterandmay.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Ashurst',
    careerUrl: 'https://www.ashurst.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Simmons & Simmons',
    careerUrl: 'https://www.simmons-simmons.com/en/careers',
    workday: { company: 'simmonssimmons', instance: 'wd3', site: 'SimmonsCareers' },
    type: 'biglaw',
  },
  {
    name: 'Travers Smith',
    careerUrl: 'https://www.traverssmith.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Macfarlanes',
    careerUrl: 'https://www.macfarlanes.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Mishcon de Reya',
    careerUrl: 'https://www.mishcon.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Pinsent Masons',
    careerUrl: 'https://www.pinsentmasons.com/careers',
    workday: { company: 'pinsentmasons', instance: 'wd3', site: 'PinsentMasons' },
    type: 'biglaw',
  },
  {
    name: 'Eversheds Sutherland',
    careerUrl: 'https://www.eversheds-sutherland.com/careers',
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
  {
    name: 'Rajah & Tann',
    careerUrl: 'https://www.rajahtannasia.com/careers',
    type: 'biglaw',
  },
  {
    name: 'King & Wood Mallesons',
    careerUrl: 'https://www.kwm.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'MinterEllison',
    careerUrl: 'https://www.minterellison.com/careers',
    workday: { company: 'maborinterellison', instance: 'wd3', site: 'MinterEllison' },
    type: 'biglaw',
  },
  {
    name: 'Corrs Chambers Westgarth',
    careerUrl: 'https://www.corrs.com.au/careers',
    type: 'biglaw',
  },

  // ===================================================
  // CANADIAN LAW FIRMS (ATS-configured)
  // ===================================================
  {
    name: 'Norton Rose Fulbright Canada',
    careerUrl: 'https://www.nortonrosefulbright.com/en-ca/careers',
    type: 'biglaw',
  },
  {
    name: 'Osler Hoskin & Harcourt',
    careerUrl: 'https://www.osler.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Blake Cassels & Graydon',
    careerUrl: 'https://www.blakes.com/careers',
    type: 'biglaw',
  },
  {
    name: 'McCarthy Tetrault',
    careerUrl: 'https://www.mccarthy.ca/en/careers',
    workday: { company: 'mccarthytetrault', instance: 'wd3', site: 'McCarthy_Careers' },
    type: 'biglaw',
  },

  // ===================================================
  // DOCUMENT AUTOMATION & E-SIGNATURE (Global)
  // ===================================================
  {
    name: 'Conga',
    careerUrl: 'https://conga.com/careers',
    greenhouseId: 'conga',
    type: 'tech-legal',
  },
  {
    name: 'PandaDoc',
    careerUrl: 'https://www.pandadoc.com/careers/',
    greenhouseId: 'pandadoc',
    type: 'tech-legal',
  },
  {
    name: 'OneSpan',
    careerUrl: 'https://www.onespan.com/careers',
    greenhouseId: 'onespan',
    type: 'tech-legal',
  },
  {
    name: 'Nintex',
    careerUrl: 'https://www.nintex.com/careers/',
    greenhouseId: 'nintex',
    type: 'tech-legal',
  },
  {
    name: 'Docusign CLM (SpringCM)',
    careerUrl: 'https://careers.docusign.com/',
    smartrecruitersId: 'DocuSign',
    type: 'tech-legal',
  },

  // ===================================================
  // DOCUMENT AI & INTELLIGENT AUTOMATION (Global)
  // ===================================================
  {
    name: 'ABBYY',
    careerUrl: 'https://www.abbyy.com/company/careers/',
    greenhouseId: 'abbyy',
    type: 'company',
  },
  {
    name: 'Appian',
    careerUrl: 'https://appian.com/careers.html',
    greenhouseId: 'appian',
    type: 'company',
  },
  {
    name: 'Celonis',
    careerUrl: 'https://www.celonis.com/careers/',
    greenhouseId: 'celonis',
    type: 'company',
  },

  // ===================================================
  // COMPLIANCE, GRC & RISK MANAGEMENT (Global)
  // ===================================================
  {
    name: 'Exiger',
    careerUrl: 'https://www.exiger.com/careers/',
    greenhouseId: 'exiger',
    type: 'tech-legal',
  },
  {
    name: 'Hyperproof',
    careerUrl: 'https://hyperproof.io/careers/',
    greenhouseId: 'hyperproof',
    type: 'tech-legal',
  },
  {
    name: 'SAI360',
    careerUrl: 'https://www.sai360.com/careers',
    greenhouseId: 'saigroup',
    type: 'tech-legal',
  },
  {
    name: 'Diligent',
    careerUrl: 'https://www.diligent.com/company/careers',
    greenhouseId: 'diligentcorporation',
    type: 'tech-legal',
  },
  {
    name: 'Convercent (OneTrust)',
    careerUrl: 'https://www.onetrust.com/careers/',
    smartrecruitersId: 'OneTrust',
    type: 'tech-legal',
  },
  {
    name: 'Galvanize (Diligent)',
    careerUrl: 'https://www.diligent.com/company/careers',
    greenhouseId: 'diligentcorporation',
    type: 'tech-legal',
  },
  {
    name: 'Archer (RSA)',
    careerUrl: 'https://www.archerirm.com/careers',
    type: 'tech-legal',
  },

  // ===================================================
  // ONLINE LEGAL SERVICES (Global)
  // ===================================================
  {
    name: 'Rocket Lawyer',
    careerUrl: 'https://www.rocketlawyer.com/careers',
    greenhouseId: 'rocketlawyer',
    type: 'tech-legal',
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
  {
    name: 'EY Law',
    careerUrl: 'https://www.ey.com/en_us/careers',
    type: 'alsp',
  },
  {
    name: 'Deloitte Legal',
    careerUrl: 'https://apply.deloitte.com/',
    smartrecruitersId: 'Deloitte',
    type: 'alsp',
  },
  {
    name: 'PwC NewLaw',
    careerUrl: 'https://www.pwc.com/gx/en/careers.html',
    workday: { company: 'pwc', instance: 'wd3', site: 'Global_Experienced_Careers' },
    type: 'alsp',
  },
  {
    name: 'KPMG Legal',
    careerUrl: 'https://www.kpmg.com/xx/en/home/careers.html',
    type: 'alsp',
  },
  {
    name: 'Factor (Axiom)',
    careerUrl: 'https://www.axiomlaw.com/careers',
    greenhouseId: 'axiomtalentplatform',
    type: 'alsp',
  },

  // ===================================================
  // PRIVACY & DATA PROTECTION
  // ===================================================
  {
    name: 'BigID',
    careerUrl: 'https://bigid.com/careers/',
    greenhouseId: 'bigid',
    type: 'tech-legal',
  },

  // ===================================================
  // LEGAL BILLING & FINANCE
  // ===================================================
  {
    name: 'CounselLink (LexisNexis)',
    careerUrl: 'https://relx.wd3.myworkdayjobs.com/LexisNexisLegal',
    workday: { company: 'relx', instance: 'wd3', site: 'LexisNexisLegal' },
    type: 'tech-legal',
  },

  // ===================================================
  // LEGAL ANALYTICS & INTELLIGENCE
  // ===================================================
  {
    name: 'Ravel Law (LexisNexis)',
    careerUrl: 'https://relx.wd3.myworkdayjobs.com/LexisNexisLegal',
    workday: { company: 'relx', instance: 'wd3', site: 'LexisNexisLegal' },
    type: 'tech-legal',
  },

  // ===================================================
  // COURT TECH & LEGAL PROCESS
  // ===================================================
  {
    name: 'Tyler Technologies',
    careerUrl: 'https://www.tylertech.com/careers',
    type: 'company',
  },
  {
    name: 'Thomson Reuters (Court Solutions)',
    careerUrl: 'https://careers.thomsonreuters.com/',
    workday: { company: 'thomsonreuters', instance: 'wd5', site: 'External_Career_Site' },
    type: 'company',
  },

  // ===================================================
  // LEGAL WORKFLOW & AUTOMATION
  // ===================================================

  // ===================================================
  // ADDITIONAL LEGAL AI & LEGAL TECH STARTUPS
  // ===================================================
  {
    name: 'Case Status',
    careerUrl: 'https://www.casestatus.com/careers',
    greenhouseId: 'casestatus',
    type: 'startup',
  },
  {
    name: 'Harbor Global',
    careerUrl: 'https://www.harborglobal.com/careers',
    greenhouseId: 'harborglobal',
    type: 'tech-legal',
  },
  {
    name: 'Checkr',
    careerUrl: 'https://checkr.com/company/careers',
    greenhouseId: 'checkr',
    type: 'company',
  },
  {
    name: 'Kore.ai',
    careerUrl: 'https://kore.ai/careers/',
    type: 'company',
  },
  {
    name: 'Hive (Legal)',
    careerUrl: 'https://www.hive.co/careers',
    type: 'tech-legal',
  },

  // ===================================================
  // EUROPEAN BIG LAW FIRMS (UK & Continental)
  // ===================================================
  {
    name: 'CMS',
    careerUrl: 'https://www.cms.law/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Taylor Wessing',
    careerUrl: 'https://www.taylorwessing.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Osborne Clarke',
    careerUrl: 'https://www.osborneclarke.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Shoosmiths',
    careerUrl: 'https://www.shoosmiths.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Fieldfisher',
    careerUrl: 'https://www.fieldfisher.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Bird & Bird',
    careerUrl: 'https://www.twobirds.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Gowling WLG',
    careerUrl: 'https://gowlingwlg.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Womble Bond Dickinson',
    careerUrl: 'https://www.womblebonddickinson.com/us/careers',
    type: 'biglaw',
  },
  {
    name: 'DAC Beachcroft',
    careerUrl: 'https://www.dacbeachcroft.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Addleshaw Goddard',
    careerUrl: 'https://www.addleshawgoddard.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Kennedys',
    careerUrl: 'https://www.kennedyslaw.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Watson Farley & Williams',
    careerUrl: 'https://www.wfw.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Bryan Cave Leighton Paisner',
    careerUrl: 'https://www.bclplaw.com/en-US/careers/',
    type: 'biglaw',
  },
  {
    name: 'Mills & Reeve',
    careerUrl: 'https://www.mills-reeve.com/careers',
    type: 'biglaw',
  },
  {
    name: 'TLT',
    careerUrl: 'https://www.tltsolicitors.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Burges Salmon',
    careerUrl: 'https://www.burges-salmon.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Bristows',
    careerUrl: 'https://www.bristows.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Uría Menéndez',
    careerUrl: 'https://www.uria.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Garrigues',
    careerUrl: 'https://www.garrigues.com/en_GB/careers',
    type: 'biglaw',
  },
  {
    name: 'Cuatrecasas',
    careerUrl: 'https://www.cuatrecasas.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ASIA-PACIFIC LAW FIRMS (Additional)
  // ===================================================
  {
    name: 'Drew & Napier',
    careerUrl: 'https://www.drewnapier.com/Careers',
    type: 'biglaw',
  },
  {
    name: 'WongPartnership',
    careerUrl: 'https://www.wongpartnership.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Nishith Desai Associates',
    careerUrl: 'https://www.nishithdesai.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Khaitan & Co',
    careerUrl: 'https://www.khaitanco.com/careers',
    type: 'biglaw',
  },
  {
    name: 'AZB & Partners',
    careerUrl: 'https://www.azbpartners.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cyril Amarchand Mangaldas',
    careerUrl: 'https://www.cyrilshroff.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Trilegal',
    careerUrl: 'https://www.trilegal.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Anderson Mori & Tomotsune',
    careerUrl: 'https://www.amt-law.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'TMI Associates',
    careerUrl: 'https://www.tmi.gr.jp/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Nagashima Ohno & Tsunematsu',
    careerUrl: 'https://www.noandt.com/en/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // MIDDLE EAST & AFRICA LAW FIRMS
  // ===================================================
  {
    name: 'Al Tamimi & Company',
    careerUrl: 'https://www.tamimi.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Hadef & Partners',
    careerUrl: 'https://www.hadefpartners.com/Careers',
    type: 'biglaw',
  },
  {
    name: 'BSA Ahmad Bin Hezeem & Associates',
    careerUrl: 'https://www.bsabh.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Afridi & Angell',
    careerUrl: 'https://www.afridi-angell.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Bowmans',
    careerUrl: 'https://www.bowmanslaw.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'ENSafrica',
    careerUrl: 'https://www.ensafrica.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Webber Wentzel',
    careerUrl: 'https://www.webberwentzel.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Werksmans Attorneys',
    careerUrl: 'https://www.werksmans.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'AB & David',
    careerUrl: 'https://www.abdavid.com/careers',
    type: 'biglaw',
  },

  // ===================================================
  // LATIN AMERICAN LAW FIRMS
  // ===================================================
  {
    name: 'Mattos Filho',
    careerUrl: 'https://www.mattosfilho.com.br/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Pinheiro Neto',
    careerUrl: 'https://www.pinheironeto.com.br/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Machado Meyer',
    careerUrl: 'https://www.machadomeyer.com.br/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL US BIG LAW & MID-SIZE FIRMS
  // ===================================================
  {
    name: 'Katten Muchin Rosenman',
    careerUrl: 'https://katten.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Polsinelli',
    careerUrl: 'https://www.polsinelli.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Seyfarth Shaw',
    careerUrl: 'https://www.seyfarth.com/careers.html',
    workday: { company: 'seyfarth', instance: 'wd5', site: 'Seyfarth_External' },
    type: 'biglaw',
  },
  {
    name: 'Nixon Peabody',
    careerUrl: 'https://www.nixonpeabody.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Pillsbury Winthrop',
    careerUrl: 'https://www.pillsburylaw.com/en/careers.html',
    workday: { company: 'pillsburylaw', instance: 'wd5', site: 'Pillsbury_External' },
    type: 'biglaw',
  },
  {
    name: 'Faegre Drinker',
    careerUrl: 'https://www.faegredrinker.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Troutman Pepper',
    careerUrl: 'https://www.troutman.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Venable',
    careerUrl: 'https://www.venable.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Crowell & Moring',
    careerUrl: 'https://www.crowell.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Sheppard Mullin',
    careerUrl: 'https://www.sheppardmullin.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Duane Morris',
    careerUrl: 'https://www.duanemorris.com/site/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Steptoe & Johnson',
    careerUrl: 'https://www.steptoe.com/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Blank Rome',
    careerUrl: 'https://www.blankrome.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Ballard Spahr',
    careerUrl: 'https://www.ballardspahr.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cozen O\'Connor',
    careerUrl: 'https://www.cozen.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Ogletree Deakins',
    careerUrl: 'https://ogletree.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Jackson Lewis',
    careerUrl: 'https://www.jacksonlewis.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Littler Mendelson',
    careerUrl: 'https://www.littler.com/careers',
    workday: { company: 'littler', instance: 'wd5', site: 'Littler_External' },
    type: 'biglaw',
  },
  {
    name: 'Fisher Phillips',
    careerUrl: 'https://www.fisherphillips.com/en/careers.html',
    type: 'biglaw',
  },

  // ===================================================
  // MISSING AM LAW 100 LAW FIRMS (with ATS)
  // ===================================================
  {
    name: 'Paul Hastings',
    careerUrl: 'https://www.paulhastings.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Winston & Strawn',
    careerUrl: 'https://www.winston.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'K&L Gates',
    careerUrl: 'https://www.klgates.com/careers',
    workday: { company: 'klgates', instance: 'wd5', site: 'KLGates_External' },
    type: 'biglaw',
  },
  {
    name: 'Sullivan & Cromwell',
    careerUrl: 'https://www.sullcrom.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Wachtell Lipton',
    careerUrl: 'https://www.wlrk.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Covington & Burling',
    careerUrl: 'https://www.cov.com/en/careers',
    workday: { company: 'covington', instance: 'wd5', site: 'Covington_External' },
    type: 'biglaw',
  },
  {
    name: 'Baker Botts',
    careerUrl: 'https://www.bakerbotts.com/careers',
    workday: { company: 'bakerbotts', instance: 'wd5', site: 'BakerBotts_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Vinson & Elkins',
    careerUrl: 'https://www.velaw.com/careers/',
    workday: { company: 'vinsonelkins', instance: 'wd5', site: 'VE_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Haynes and Boone',
    careerUrl: 'https://www.haynesboone.com/careers',
    workday: { company: 'haynesboone', instance: 'wd5', site: 'HaynesBoone_External' },
    type: 'biglaw',
  },
  {
    name: 'Norton Rose Fulbright US',
    careerUrl: 'https://www.nortonrosefulbright.com/en-us/careers',
    workday: { company: 'nortonrosefulbright', instance: 'wd3', site: 'NRF_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Hunton Andrews Kurth',
    careerUrl: 'https://www.huntonak.com/careers',
    workday: { company: 'hunton', instance: 'wd5', site: 'Hunton_External' },
    type: 'biglaw',
  },
  {
    name: 'Squire Patton Boggs',
    careerUrl: 'https://www.squirepattonboggs.com/en/careers',
    workday: { company: 'squirepb', instance: 'wd5', site: 'SPB_External' },
    type: 'biglaw',
  },
  {
    name: 'Thompson Hine',
    careerUrl: 'https://www.thompsonhine.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cadwalader Wickersham & Taft',
    careerUrl: 'https://www.cadwalader.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Schulte Roth & Zabel',
    careerUrl: 'https://www.srz.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Fried Frank',
    careerUrl: 'https://www.friedfrank.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cahill Gordon & Reindel',
    careerUrl: 'https://www.cahill.com/careers',
    type: 'biglaw',
  },

  // ===================================================
  // MISSING GLOBAL/UK/EU LAW FIRMS
  // ===================================================
  {
    name: 'Stikeman Elliott',
    careerUrl: 'https://www.stikeman.com/en-ca/careers',
    type: 'biglaw',
  },
  {
    name: 'Bennett Jones',
    careerUrl: 'https://www.bennettjones.com/Careers',
    type: 'biglaw',
  },
  {
    name: 'Dentons Europe',
    careerUrl: 'https://www.dentons.com/en/careers',
    workday: { company: 'dentons', instance: 'wd3', site: 'Dentons_Careers' },
    type: 'biglaw',
  },
  {
    name: 'DWF Group',
    careerUrl: 'https://www.dwf.law/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Lewis Silkin',
    careerUrl: 'https://www.lewissilkin.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Weightmans',
    careerUrl: 'https://www.weightmans.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Irwin Mitchell',
    careerUrl: 'https://www.irwinmitchell.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Charles Russell Speechlys',
    careerUrl: 'https://www.charlesrussellspeechlys.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'RPC',
    careerUrl: 'https://www.rpclegal.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Houthoff',
    careerUrl: 'https://www.houthoff.com/careers',
    type: 'biglaw',
  },
  {
    name: 'NautaDutilh',
    careerUrl: 'https://www.nautadutilh.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Loyens & Loeff',
    careerUrl: 'https://www.loyensloeff.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'De Brauw Blackstone Westbroek',
    careerUrl: 'https://www.debrauw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Schoenherr',
    careerUrl: 'https://www.schoenherr.eu/careers/',
    type: 'biglaw',
  },
  {
    name: 'Bär & Karrer',
    careerUrl: 'https://www.baerkarrer.ch/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Walder Wyss',
    careerUrl: 'https://www.walderwyss.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // MISSING APAC/MIDDLE EAST/AFRICA LAW FIRMS
  // ===================================================
  {
    name: 'Gilbert + Tobin',
    careerUrl: 'https://www.gtlaw.com.au/careers',
    type: 'biglaw',
  },
  {
    name: 'Lee & Lee',
    careerUrl: 'https://www.leenlee.com.sg/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Kim & Chang',
    careerUrl: 'https://www.kimchang.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Yoon & Yang',
    careerUrl: 'https://www.yoonyang.com/eng/careers/',
    type: 'biglaw',
  },
  {
    name: 'Mori Hamada & Matsumoto',
    careerUrl: 'https://www.mhmjapan.com/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Bae Kim & Lee',
    careerUrl: 'https://www.bkl.co.kr/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Shin & Kim',
    careerUrl: 'https://www.shinkim.com/eng/careers',
    type: 'biglaw',
  },
  {
    name: 'Fangda Partners',
    careerUrl: 'https://www.fangdalaw.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Zhong Lun',
    careerUrl: 'https://www.zhonglun.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'JunHe',
    careerUrl: 'https://www.junhe.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // LEGAL AI & CONTRACT TECH (Missing Startups)
  // ===================================================
  {
    name: 'Loio',
    careerUrl: 'https://loio.com/careers',
    type: 'startup',
  },
  {
    name: 'Fastcase',
    careerUrl: 'https://www.fastcase.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'CaseMine',
    careerUrl: 'https://www.casemine.com/careers',
    type: 'startup',
  },
  {
    name: 'Della AI',
    careerUrl: 'https://www.della.ai/careers',
    type: 'startup',
  },
  {
    name: 'Tabled',
    careerUrl: 'https://www.tabled.io/careers',
    type: 'startup',
  },
  {
    name: 'Detangle AI',
    careerUrl: 'https://www.detangle.ai/careers',
    type: 'startup',
  },
  {
    name: 'CaseFleet',
    careerUrl: 'https://www.casefleet.com/careers',
    type: 'startup',
  },
  {
    name: 'Legalfly',
    careerUrl: 'https://www.legalfly.com/careers',
    type: 'startup',
  },

  // ===================================================
  // CLM/CONTRACT LIFECYCLE MANAGEMENT (Missing)
  // ===================================================
  {
    name: 'ContractWorks',
    careerUrl: 'https://www.contractworks.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Outlaw',
    careerUrl: 'https://www.outlaw.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Pactum AI',
    careerUrl: 'https://pactum.com/careers/',
    type: 'startup',
  },
  {
    name: 'Parley Pro',
    careerUrl: 'https://www.parleypro.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Zeal',
    careerUrl: 'https://www.zeal.com/careers',
    type: 'startup',
  },
  {
    name: 'Symbiont',
    careerUrl: 'https://symbiont.io/careers',
    type: 'startup',
  },
  {
    name: 'Trackado',
    careerUrl: 'https://www.trackado.com/careers',
    type: 'tech-legal',
  },

  // ===================================================
  // GRC/COMPLIANCE/REGTECH (Missing)
  // ===================================================
  {
    name: 'ComplyAdvantage',
    careerUrl: 'https://complyadvantage.com/careers/',
    greenhouseId: 'complyadvantage',
    type: 'tech-legal',
  },
  {
    name: 'Behavox',
    careerUrl: 'https://www.behavox.com/careers/',
    greenhouseId: 'behavox',
    type: 'tech-legal',
  },
  {
    name: 'MetricStream',
    careerUrl: 'https://www.metricstream.com/careers/',
    workday: { company: 'metricstream', instance: 'wd5', site: 'MetricStream_External' },
    type: 'tech-legal',
  },
  {
    name: 'LogicManager',
    careerUrl: 'https://www.logicmanager.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'ProcessUnity',
    careerUrl: 'https://www.processunity.com/company/careers/',
    type: 'tech-legal',
  },
  {
    name: 'ZenGRC (Reciprocity)',
    careerUrl: 'https://reciprocity.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Global Relay',
    careerUrl: 'https://www.globalrelay.com/careers/',
    greenhouseId: 'globalrelay',
    type: 'tech-legal',
  },
  {
    name: 'Ivalua',
    careerUrl: 'https://www.ivalua.com/careers/',
    greenhouseId: 'ivalua',
    type: 'tech-legal',
  },
  {
    name: 'Persona',
    careerUrl: 'https://withpersona.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/persona',
    type: 'tech-legal',
  },
  {
    name: 'Sardine',
    careerUrl: 'https://www.sardine.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/sardine',
    type: 'tech-legal',
  },

  // ===================================================
  // E-DISCOVERY & LITIGATION (Missing)
  // ===================================================
  {
    name: 'Consilio',
    careerUrl: 'https://www.consilio.com/careers/',
    workday: { company: 'consilio', instance: 'wd5', site: 'Consilio_Careers' },
    type: 'tech-legal',
  },
  {
    name: 'Nextpoint',
    careerUrl: 'https://www.nextpoint.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'CasePoint',
    careerUrl: 'https://www.casepoint.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Cimplifi',
    careerUrl: 'https://www.cimplifi.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'TransPerfect Legal',
    careerUrl: 'https://www.transperfect.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Recommind (OpenText)',
    careerUrl: 'https://www.opentext.com/about/careers',
    type: 'tech-legal',
  },

  // ===================================================
  // PRACTICE MANAGEMENT & BILLING (Missing)
  // ===================================================
  {
    name: 'CenterBase',
    careerUrl: 'https://www.centerbase.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Leap Legal Software',
    careerUrl: 'https://www.leap.us/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Zola Suite',
    careerUrl: 'https://www.zolasuite.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Rocket Matter',
    careerUrl: 'https://www.rocketmatter.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Bill4Time',
    careerUrl: 'https://www.bill4time.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Themis Solutions',
    careerUrl: 'https://www.clio.com/about/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Docketwise',
    careerUrl: 'https://www.docketwise.com/careers',
    type: 'startup',
  },
  {
    name: 'INSZoom',
    careerUrl: 'https://www.inszoom.com/careers/',
    type: 'tech-legal',
  },

  // ===================================================
  // LEGAL MARKETPLACE & ACCESS TO JUSTICE
  // ===================================================
  {
    name: 'Justia',
    careerUrl: 'https://www.justia.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'LawDepot',
    careerUrl: 'https://www.lawdepot.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'LegalShield',
    careerUrl: 'https://www.legalshield.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'LawTrades',
    careerUrl: 'https://www.lawtrades.com/careers',
    type: 'startup',
  },
  {
    name: 'Atrium',
    careerUrl: 'https://www.atrium.co/careers',
    type: 'startup',
  },

  // ===================================================
  // ADDITIONAL LEGAL TECH & AI COMPANIES
  // ===================================================
  {
    name: 'Lex Mundi',
    careerUrl: 'https://www.lexmundi.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Loom Analytics',
    careerUrl: 'https://www.loomanalytics.com/careers',
    type: 'startup',
  },
  {
    name: 'Blue J Legal',
    careerUrl: 'https://www.bluej.com/careers',
    type: 'startup',
  },
  {
    name: 'Gavelytics',
    careerUrl: 'https://www.gavelytics.com/careers',
    type: 'startup',
  },
  {
    name: 'Lex Predict',
    careerUrl: 'https://lexpredict.com/careers/',
    type: 'startup',
  },
  {
    name: 'Lawtab',
    careerUrl: 'https://www.lawtab.com/careers',
    type: 'startup',
  },
  {
    name: 'Casepoint AI',
    careerUrl: 'https://www.casepoint.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Diligen',
    careerUrl: 'https://www.diligen.com/careers',
    type: 'startup',
  },
  {
    name: 'Kortext',
    careerUrl: 'https://www.kortext.com/careers',
    type: 'startup',
  },

  // ===================================================
  // CORPORATE LEGAL OPERATIONS TECH
  // ===================================================
  {
    name: 'Xact Data Discovery',
    careerUrl: 'https://www.xactdatadiscovery.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Brightleaf Solutions',
    careerUrl: 'https://www.brightleaf.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Lawtoolbox',
    careerUrl: 'https://www.lawtoolbox.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Keesal Propulsion Labs',
    careerUrl: 'https://www.keesalpropulsionlabs.com/careers',
    type: 'startup',
  },
  {
    name: 'Bodhala',
    careerUrl: 'https://www.bodhala.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Knowable',
    careerUrl: 'https://www.knowable.com/careers',
    type: 'startup',
  },
  {
    name: 'ContractSafe',
    careerUrl: 'https://www.contractsafe.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'SurePoint Technologies',
    careerUrl: 'https://www.surepoint.com/careers',
    type: 'tech-legal',
  },

  // ===================================================
  // UK LEGAL TECH STARTUPS
  // ===================================================
  {
    name: 'Luminance',
    careerUrl: 'https://www.luminance.com/careers.html',
    type: 'startup',
  },
  {
    name: 'Eigen Technologies',
    careerUrl: 'https://www.eigentech.com/careers',
    type: 'startup',
  },
  {
    name: 'Apperio',
    careerUrl: 'https://www.apperio.com/careers',
    type: 'startup',
  },
  {
    name: 'Definely',
    careerUrl: 'https://www.definely.com/careers',
    type: 'startup',
  },
  {
    name: 'Avvoka',
    careerUrl: 'https://www.avvoka.com/careers',
    type: 'startup',
  },
  {
    name: 'Clausematch',
    careerUrl: 'https://www.clausematch.com/careers',
    type: 'startup',
  },
  {
    name: 'Legatics',
    careerUrl: 'https://www.legatics.com/careers',
    type: 'startup',
  },
  {
    name: 'ThoughtRiver',
    careerUrl: 'https://www.thoughtriver.com/careers',
    type: 'startup',
  },
  {
    name: 'Lexoo',
    careerUrl: 'https://www.lexoo.com/careers',
    type: 'startup',
  },

  // ===================================================
  // EUROPEAN LEGAL TECH STARTUPS
  // ===================================================
  {
    name: 'Legartis',
    careerUrl: 'https://www.legartis.ai/careers',
    type: 'startup',
  },
  {
    name: 'Bryter',
    careerUrl: 'https://bryter.com/careers/',
    greenhouseId: 'braboryter',
    type: 'startup',
  },
  {
    name: 'Legal OS',
    careerUrl: 'https://www.legal-os.io/careers',
    type: 'startup',
  },

  // ===================================================
  // FRENCH LAW FIRMS
  // ===================================================
  {
    name: 'Bredin Prat',
    careerUrl: 'https://www.bredinprat.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Gide Loyrette Nouel',
    careerUrl: 'https://www.gide.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Darrois Villey Maillot Brochier',
    careerUrl: 'https://www.darroisvilley.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Lacourte Raquin Tatar',
    careerUrl: 'https://www.lacourte.fr/en/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // GERMAN LAW FIRMS
  // ===================================================
  {
    name: 'Hengeler Mueller',
    careerUrl: 'https://www.hengeler.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Gleiss Lutz',
    careerUrl: 'https://www.gleisslutz.com/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Noerr',
    careerUrl: 'https://www.noerr.com/en/career',
    type: 'biglaw',
  },
  {
    name: 'Luther Rechtsanwaltsgesellschaft',
    careerUrl: 'https://www.luther-lawfirm.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Milbank (Germany)',
    careerUrl: 'https://www.milbank.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // SWISS LAW FIRMS
  // ===================================================
  {
    name: 'Homburger',
    careerUrl: 'https://www.homburger.ch/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Lenz & Staehelin',
    careerUrl: 'https://www.lenzstaehelin.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Niederer Kraft Frey',
    careerUrl: 'https://www.nkf.ch/en/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // NORDIC LAW FIRMS
  // ===================================================
  {
    name: 'Mannheimer Swartling',
    careerUrl: 'https://www.mannheimerswartling.se/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Vinge',
    careerUrl: 'https://www.vinge.se/en/career/',
    type: 'biglaw',
  },
  {
    name: 'Roschier',
    careerUrl: 'https://www.roschier.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Krogerus',
    careerUrl: 'https://www.krogerus.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Hannes Snellman',
    careerUrl: 'https://www.hannessnellman.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Wiersholm',
    careerUrl: 'https://www.wiersholm.no/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Thommessen',
    careerUrl: 'https://www.thommessen.no/en/careers',
    type: 'biglaw',
  },
  {
    name: 'BAHR',
    careerUrl: 'https://www.bahr.no/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Plesner',
    careerUrl: 'https://www.plesner.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Gorrissen Federspiel',
    careerUrl: 'https://www.gorrissenfederspiel.com/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL EU LAW FIRMS (IT, AT, BE, PL)
  // ===================================================
  {
    name: 'Bonelli Erede',
    careerUrl: 'https://www.belex.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Gianni & Origoni',
    careerUrl: 'https://www.gop.it/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'BonelliErede Pappalardo',
    careerUrl: 'https://www.belex.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Chiomenti',
    careerUrl: 'https://www.chiomenti.net/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Dentons Europe (Warsaw)',
    careerUrl: 'https://www.dentons.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Sołtysiński Kawecki & Szlęzak',
    careerUrl: 'https://www.skslegal.pl/en/career/',
    type: 'biglaw',
  },
  {
    name: 'Wardyński & Partners',
    careerUrl: 'https://www.wardynski.com.pl/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Linklaters Belgium',
    careerUrl: 'https://www.linklaters.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Stibbe',
    careerUrl: 'https://www.stibbe.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Wolf Theiss',
    careerUrl: 'https://www.wolftheiss.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Cerha Hempel',
    careerUrl: 'https://www.cerhahempel.com/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL UK LAW FIRMS
  // ===================================================
  {
    name: 'Hogan Lovells (London)',
    careerUrl: 'https://www.hoganlovells.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Lathams (London)',
    careerUrl: 'https://www.lw.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Withers',
    careerUrl: 'https://www.withersworldwide.com/en-gb/careers',
    type: 'biglaw',
  },
  {
    name: 'Farrer & Co',
    careerUrl: 'https://www.farrer.co.uk/careers/',
    type: 'biglaw',
  },
  {
    name: 'Forsters',
    careerUrl: 'https://www.forsters.co.uk/careers',
    type: 'biglaw',
  },
  {
    name: 'Penningtons Manches Cooper',
    careerUrl: 'https://www.penningtonslaw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Boodle Hatfield',
    careerUrl: 'https://www.boodlehatfield.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Fladgate',
    careerUrl: 'https://www.fladgate.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Howard Kennedy',
    careerUrl: 'https://www.howardkennedy.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Stephenson Harwood (London)',
    careerUrl: 'https://www.shlegal.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Kingsley Napley',
    careerUrl: 'https://www.kingsleynapley.co.uk/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL APAC LAW FIRMS
  // ===================================================
  {
    name: 'Herbert Smith Freehills (Australia)',
    careerUrl: 'https://www.herbertsmithfreehills.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Ashurst (Australia)',
    careerUrl: 'https://www.ashurst.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Norton Rose Fulbright Australia',
    careerUrl: 'https://www.nortonrosefulbright.com/en-au/careers',
    type: 'biglaw',
  },
  {
    name: 'Hall & Wilcox',
    careerUrl: 'https://hallandwilcox.com.au/careers/',
    type: 'biglaw',
  },
  {
    name: 'Holding Redlich',
    careerUrl: 'https://www.holdingredlich.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Johnson Winter Slattery',
    careerUrl: 'https://www.jws.com.au/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL EUROPEAN LEGAL TECH & REGTECH
  // ===================================================
  {
    name: 'Regnology',
    careerUrl: 'https://www.regnology.net/en/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Compliance Solutions Strategies',
    careerUrl: 'https://www.cssregtech.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Akoma Ntoso (LEX)',
    careerUrl: 'https://www.akomantoso.org/careers',
    type: 'tech-legal',
  },
  {
    name: 'Legisway (Wolters Kluwer)',
    careerUrl: 'https://www.legisway.com/en/careers',
    type: 'tech-legal',
  },
  {
    name: 'Zendoc',
    careerUrl: 'https://www.zendoc.io/careers',
    type: 'startup',
  },
  {
    name: 'Leeway',
    careerUrl: 'https://www.leeway.tech/careers',
    type: 'startup',
  },
  {
    name: 'Tomorro',
    careerUrl: 'https://www.tomorro.com/careers',
    type: 'startup',
  },
  {
    name: 'Hyperlex',
    careerUrl: 'https://hyperlex.ai/careers',
    type: 'startup',
  },
  {
    name: 'Seraphin.legal',
    careerUrl: 'https://www.seraphin.legal/careers',
    type: 'startup',
  },
  {
    name: 'Reynen Court',
    careerUrl: 'https://www.reynencourt.com/careers',
    type: 'startup',
  },
];
