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
    careerUrl: 'https://www.evenuplaw.com/careers/',
    greenhouseId: 'evenuplaw',
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
    greenhouseId: 'darabordarrow',
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
    greenhouseId: 'legalontechnologies',
    type: 'startup',
  },
  {
    name: 'Neota Logic',
    careerUrl: 'https://www.neotalogic.com/careers/',
    workableId: 'neota',
    leverPostingsUrl: 'https://jobs.lever.co/neotalogic',
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
  {
    name: 'CoCounsel (formerly Casetext)',
    careerUrl: 'https://boards.greenhouse.io/casetext',
    greenhouseId: 'casetext',
    type: 'startup',
  },
  {
    name: 'Luminance',
    careerUrl: 'https://www.luminance.com/careers.html',
    leverPostingsUrl: 'https://jobs.lever.co/luminance',
    type: 'startup',
  },
  {
    name: 'Legatics',
    careerUrl: 'https://www.legatics.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/legatics',
    type: 'startup',
  },
  {
    name: 'Avvoka',
    careerUrl: 'https://www.avvoka.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/avvoka',
    type: 'startup',
  },
  {
    name: 'Definely',
    careerUrl: 'https://www.definely.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/definely',
    type: 'startup',
  },
  {
    name: 'Bryter',
    careerUrl: 'https://bryter.com/careers/',
    greenhouseId: 'brikibryter',
    type: 'startup',
  },
  {
    name: 'ThoughtRiver',
    careerUrl: 'https://www.thoughtriver.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/thoughtriver',
    type: 'startup',
  },
  {
    name: 'Checkbox',
    careerUrl: 'https://www.checkbox.ai/careers',
    greenhouseId: 'checkboxai',
    type: 'startup',
  },
  {
    name: 'Josef',
    careerUrl: 'https://joseflegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/josef',
    type: 'startup',
  },
  {
    name: 'Genie AI',
    careerUrl: 'https://www.genieai.co/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/genieai',
    type: 'startup',
  },
  {
    name: 'Responsiv',
    careerUrl: 'https://www.responsiv.ai/careers',
    leverPostingsUrl: 'https://jobs.lever.co/responsiv',
    type: 'startup',
  },
  {
    name: 'Alexi',
    careerUrl: 'https://www.alexi.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/alexi',
    type: 'startup',
  },
  {
    name: 'Clearbrief',
    careerUrl: 'https://clearbrief.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/clearbrief',
    type: 'startup',
  },
  {
    name: 'Judicata',
    careerUrl: 'https://www.judicata.com/careers',
    greenhouseId: 'judicata',
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
  {
    name: 'Zegal',
    careerUrl: 'https://www.zegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/zegal',
    type: 'startup',
  },
  {
    name: 'Henchman',
    careerUrl: 'https://www.henchman.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/henchman',
    type: 'startup',
  },
  {
    name: 'Leya',
    careerUrl: 'https://www.leya.law/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/leya',
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
    greenhouseId: 'smokeball',
    type: 'tech-legal',
  },
  {
    name: 'MyCase',
    careerUrl: 'https://www.mycase.com/careers/',
    greenhouseId: 'mycase',
    type: 'tech-legal',
  },
  {
    name: 'CosmoLex',
    careerUrl: 'https://www.cosmolex.com/careers',
    greenhouseId: 'cosmolex',
    type: 'tech-legal',
  },
  {
    name: 'PracticePanther',
    careerUrl: 'https://www.practicepanther.com/careers/',
    greenhouseId: 'practicepanther',
    type: 'tech-legal',
  },
  {
    name: 'Actionstep',
    careerUrl: 'https://www.actionstep.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/actionstep',
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
    name: 'Concord',
    careerUrl: 'https://www.concordnow.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/concordnow',
    type: 'tech-legal',
  },
  {
    name: 'Precisely',
    careerUrl: 'https://www.precisely.com/careers',
    type: 'company',
  },
  {
    name: 'Malbek',
    careerUrl: 'https://www.malbek.io/careers',
    leverPostingsUrl: 'https://jobs.lever.co/malbek',
    type: 'tech-legal',
  },

  // --- Legal Spend & Operations ---
  {
    name: 'Brightflag',
    careerUrl: 'https://www.brightflag.com/careers/',
    greenhouseId: 'brightflag',
    leverPostingsUrl: 'https://jobs.lever.co/brightflag',
    type: 'tech-legal',
  },
  {
    name: 'Mitratech',
    careerUrl: 'https://mitratech.com/careers',
    greenhouseId: 'milosmitratechinc',
    leverPostingsUrl: 'https://jobs.lever.co/mitratech',
    type: 'company',
  },
  {
    name: 'SimpleLegal',
    careerUrl: 'https://www.simplelegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/simplelegal',
    type: 'tech-legal',
  },
  {
    name: 'BusyLamp (Onit)',
    careerUrl: 'https://www.busylamp.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/busylamp',
    type: 'tech-legal',
  },

  // --- Document Management & Collaboration ---
  {
    name: 'NetDocuments',
    careerUrl: 'https://www.netdocuments.com/careers',
    greenhouseId: 'netdocuments',
    leverPostingsUrl: 'https://jobs.lever.co/netdocuments',
    type: 'company',
  },
  {
    name: 'Litera',
    careerUrl: 'https://www.litera.com/careers',
    workday: { company: 'litera', instance: 'wd12', site: 'Litera_Careers' },
    type: 'company',
  },
  {
    name: 'iManage',
    careerUrl: 'https://imanage.com/careers/',
    greenhouseId: 'imanage',
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
    leverPostingsUrl: 'https://jobs.lever.co/everlaw',
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
    name: 'Reveal',
    careerUrl: 'https://www.revealdata.com/careers',
    greenhouseId: 'reveal47',
    type: 'tech-legal',
  },
  {
    name: 'Nuix',
    careerUrl: 'https://www.nuix.com/careers',
    greenhouseId: 'nuix',
    type: 'tech-legal',
  },
  {
    name: 'Logikcull',
    careerUrl: 'https://www.logikcull.com/careers',
    greenhouseId: 'logikcull',
    type: 'tech-legal',
  },
  {
    name: 'Exterro',
    careerUrl: 'https://www.exterro.com/careers',
    greenhouseId: 'exterro',
    type: 'tech-legal',
  },
  {
    name: 'Zapproved',
    careerUrl: 'https://www.zapproved.com/careers/',
    greenhouseId: 'zapproved',
    type: 'tech-legal',
  },
  {
    name: 'Hanzo',
    careerUrl: 'https://www.hanzo.co/careers',
    greenhouseId: 'hanzo',
    type: 'tech-legal',
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
  {
    name: 'vLex',
    careerUrl: 'https://vlex.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/vlex',
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
    name: 'AuditBoard',
    careerUrl: 'https://www.auditboard.com/careers/',
    greenhouseId: 'auditboard',
    type: 'tech-legal',
  },
  {
    name: 'Workiva',
    careerUrl: 'https://www.workiva.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'NAVEX Global',
    careerUrl: 'https://www.navex.com/en-us/company/careers/',
    greenhouseId: 'navabornavexglobal',
    type: 'tech-legal',
  },
  {
    name: 'NICE Actimize',
    careerUrl: 'https://www.niceactimize.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Riskonnect',
    careerUrl: 'https://riskonnect.com/careers/',
    greenhouseId: 'riskonnect',
    type: 'tech-legal',
  },
  {
    name: 'Resolver',
    careerUrl: 'https://www.resolver.com/careers/',
    greenhouseId: 'resolver',
    type: 'tech-legal',
  },
  {
    name: 'Compliance.ai',
    careerUrl: 'https://www.compliance.ai/careers',
    leverPostingsUrl: 'https://jobs.lever.co/complianceai',
    type: 'tech-legal',
  },
  {
    name: 'Clausematch',
    careerUrl: 'https://www.clausematch.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/clausematch',
    type: 'tech-legal',
  },
  {
    name: 'Themis',
    careerUrl: 'https://www.themis.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/themis',
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
    name: 'Anaqua',
    careerUrl: 'https://www.anaqua.com/careers/',
    greenhouseId: 'anaqua',
    type: 'tech-legal',
  },
  {
    name: 'MaxVal Group',
    careerUrl: 'https://www.maxval.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/maxval',
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
  {
    name: 'AbacusNext',
    careerUrl: 'https://www.abacusnext.com/careers',
    greenhouseId: 'abacusnext',
    type: 'tech-legal',
  },
  {
    name: 'Neos',
    careerUrl: 'https://www.assemblysoftware.com/careers',
    greenhouseId: 'assemblysoftware',
    type: 'tech-legal',
  },
  {
    name: 'Tabs3 Software',
    careerUrl: 'https://www.tabs3.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/tabs3',
    type: 'tech-legal',
  },

  // --- Canadian Legal Tech ---
  {
    name: 'Athennian',
    careerUrl: 'https://www.athennian.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/athennian',
    type: 'startup',
  },
  {
    name: 'Knotch',
    careerUrl: 'https://www.knotch.com/careers',
    greenhouseId: 'knotch',
    type: 'startup',
  },
  {
    name: 'Dye & Durham',
    careerUrl: 'https://www.dyedurham.com/careers/',
    greenhouseId: 'dyedurham',
    type: 'tech-legal',
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
    name: 'Simpson Thacher & Bartlett',
    careerUrl: 'https://www.simpsonthacher.com/careers',
    icims: 'simpsonthacher',
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
    type: 'biglaw',
  },
  {
    name: 'Dentons',
    careerUrl: 'https://www.dentons.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Reed Smith',
    careerUrl: 'https://www.reedsmith.com/en/careers',
    icims: 'reedsmith',
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
    workday: { company: 'sidley', instance: 'wd5', site: 'External_Careers' },
    type: 'biglaw',
  },
  {
    name: 'Mayer Brown',
    careerUrl: 'https://www.mayerbrown.com/en/careers',
    workday: { company: 'mayerbrown', instance: 'wd5', site: 'Mayer_Brown_Careers' },
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
    name: 'Orrick',
    careerUrl: 'https://www.orrick.com/en/Careers',
    greenhouseId: 'oraborrick',
    type: 'biglaw',
  },
  {
    name: 'Ropes & Gray',
    careerUrl: 'https://www.ropesgray.com/en/careers',
    workday: { company: 'ropesgray', instance: 'wd5', site: 'RopesGray_Careers' },
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
    name: 'Notarize',
    careerUrl: 'https://www.notarize.com/careers',
    greenhouseId: 'notarize',
    type: 'tech-legal',
  },
  {
    name: 'Docusign CLM (SpringCM)',
    careerUrl: 'https://careers.docusign.com/',
    smartrecruitersId: 'DocuSign',
    type: 'tech-legal',
  },
  {
    name: 'Formstack',
    careerUrl: 'https://www.formstack.com/careers',
    greenhouseId: 'formstack',
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
  {
    name: 'Hyperscience',
    careerUrl: 'https://www.hyperscience.com/careers/',
    greenhouseId: 'hyperscience',
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
    name: 'Corporater',
    careerUrl: 'https://corporater.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/corporater',
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
  {
    name: 'LegalZoom',
    careerUrl: 'https://www.legalzoom.com/careers',
    greenhouseId: 'legalzoom',
    type: 'tech-legal',
  },
  {
    name: 'Avvo',
    careerUrl: 'https://www.avvo.com/careers',
    greenhouseId: 'avvo',
    type: 'tech-legal',
  },

  // ===================================================
  // ALTERNATIVE LEGAL SERVICE PROVIDERS (ALSPs)
  // ===================================================
  {
    name: 'Axiom',
    careerUrl: 'https://www.axiomlaw.com/careers',
    greenhouseId: 'axiomtalentplatform',
    leverPostingsUrl: 'https://jobs.lever.co/axiomlaw',
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
    leverPostingsUrl: 'https://jobs.lever.co/quislex',
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
  {
    name: 'Elevate Services',
    careerUrl: 'https://elevateservices.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/elevateservices',
    type: 'alsp',
  },
  {
    name: 'Morae Global',
    careerUrl: 'https://moraeglobal.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/moraeglobal',
    type: 'alsp',
  },
  {
    name: 'UnitedLex',
    careerUrl: 'https://www.unitedlex.com/careers',
    greenhouseId: 'unitedlex',
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
  {
    name: 'Securiti',
    careerUrl: 'https://securiti.ai/careers/',
    greenhouseId: 'securitiai',
    type: 'tech-legal',
  },
  {
    name: 'WireWheel',
    careerUrl: 'https://wirewheel.io/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/wirewheel',
    type: 'tech-legal',
  },
  {
    name: 'TrustArc',
    careerUrl: 'https://trustarc.com/careers/',
    greenhouseId: 'trustarc',
    type: 'tech-legal',
  },
  {
    name: 'DataGrail',
    careerUrl: 'https://www.datagrail.io/careers/',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/datagrail',
    type: 'tech-legal',
  },
  {
    name: 'Transcend',
    careerUrl: 'https://transcend.io/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/transcend',
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
  {
    name: 'BillBlast',
    careerUrl: 'https://www.billblast.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/billblast',
    type: 'tech-legal',
  },
  {
    name: 'CARET Legal',
    careerUrl: 'https://www.caretlegal.com/careers',
    greenhouseId: 'caretlegal',
    type: 'tech-legal',
  },
  {
    name: 'TimeSolv',
    careerUrl: 'https://www.timesolv.com/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/timesolv',
    type: 'tech-legal',
  },

  // ===================================================
  // LEGAL ANALYTICS & INTELLIGENCE
  // ===================================================
  {
    name: 'Premonition',
    careerUrl: 'https://premonition.ai/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/premonition',
    type: 'tech-legal',
  },
  {
    name: 'Trellis',
    careerUrl: 'https://trellis.law/careers',
    leverPostingsUrl: 'https://jobs.lever.co/trellislaw',
    type: 'tech-legal',
  },
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
    name: 'Granicus',
    careerUrl: 'https://granicus.com/careers/',
    greenhouseId: 'granicus',
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
  {
    name: 'Tonkean',
    careerUrl: 'https://tonkean.com/careers',
    greenhouseId: 'tonkean',
    type: 'tech-legal',
  },
  {
    name: 'Streamline AI',
    careerUrl: 'https://www.streamlineai.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/streamlineai',
    type: 'tech-legal',
  },
  {
    name: 'Sirion',
    careerUrl: 'https://www.sirionlabs.com/careers',
    greenhouseId: 'sirion',
    type: 'tech-legal',
  },
  {
    name: 'SirionLabs',
    careerUrl: 'https://www.sirionlabs.com/careers',
    greenhouseId: 'sirion',
    type: 'tech-legal',
  },
  {
    name: 'SpotDraft',
    careerUrl: 'https://www.spotdraft.com/careers',
    greenhouseId: 'spotdraft',
    type: 'tech-legal',
  },
  {
    name: 'Lexion',
    careerUrl: 'https://lexion.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/lexion',
    type: 'tech-legal',
  },
  {
    name: 'Evisort',
    careerUrl: 'https://www.evisort.com/careers',
    greenhouseId: 'evisort',
    type: 'tech-legal',
  },
  {
    name: 'Jus Mundi',
    careerUrl: 'https://jusmundi.com/en/careers',
    leverPostingsUrl: 'https://jobs.lever.co/jusmundi',
    type: 'tech-legal',
  },

  // ===================================================
  // ADDITIONAL LEGAL AI & LEGAL TECH STARTUPS
  // ===================================================
  {
    name: 'Supio',
    careerUrl: 'https://www.supio.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/supio',
    type: 'startup',
  },
  {
    name: 'Paxton AI',
    careerUrl: 'https://www.paxton.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/paxton',
    type: 'startup',
  },
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
    name: 'IntelAgree',
    careerUrl: 'https://intelagree.com/careers/',
    greenhouseId: 'intelagree',
    type: 'tech-legal',
  },
  {
    name: 'Xakia Technologies',
    careerUrl: 'https://www.xakiatech.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/xakia',
    type: 'tech-legal',
  },
  {
    name: 'ThoughtTrace',
    careerUrl: 'https://www.thoughttrace.com/careers',
    greenhouseId: 'thoughttrace',
    type: 'tech-legal',
  },
  {
    name: 'Legistify',
    careerUrl: 'https://www.legistify.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/legistify',
    type: 'startup',
  },
  {
    name: 'Lawyaw',
    careerUrl: 'https://lawyaw.com/careers',
    greenhouseId: 'lawyaw',
    type: 'startup',
  },
  {
    name: 'Lawgeex',
    careerUrl: 'https://www.lawgeex.com/careers/',
    greenhouseId: 'lawgeex',
    type: 'startup',
  },
  {
    name: 'Documate',
    careerUrl: 'https://www.documate.org/careers',
    leverPostingsUrl: 'https://jobs.lever.co/documate',
    type: 'startup',
  },
  {
    name: 'Lawyered',
    careerUrl: 'https://www.lawyered.in/careers',
    leverPostingsUrl: 'https://jobs.lever.co/lawyered',
    type: 'startup',
  },
  {
    name: 'ClearAccessIP',
    careerUrl: 'https://www.clearaccessip.com/careers',
    greenhouseId: 'clearaccessip',
    type: 'tech-legal',
  },
  {
    name: 'Legalfit',
    careerUrl: 'https://www.legalfit.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/legalfit',
    type: 'startup',
  },
  {
    name: 'Apperio',
    careerUrl: 'https://www.apperio.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/apperio',
    type: 'tech-legal',
  },
  {
    name: 'Tessian',
    careerUrl: 'https://www.tessian.com/careers/',
    greenhouseId: 'tessian',
    type: 'tech-legal',
  },
  {
    name: 'Onna',
    careerUrl: 'https://onna.com/careers/',
    greenhouseId: 'onna',
    type: 'tech-legal',
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
    workday: { company: 'katten', instance: 'wd5', site: 'Katten_External' },
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
    name: 'Husch Blackwell',
    careerUrl: 'https://www.huschblackwell.com/careers',
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
    workday: { company: 'paulhastings', instance: 'wd5', site: 'PaulHastings_Careers' },
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
    name: 'Osler Hoskin (Greenhouse)',
    careerUrl: 'https://www.osler.com/en/careers',
    greenhouseId: 'osler',
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
    name: 'Klarity',
    careerUrl: 'https://www.klarity.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/klarity',
    type: 'startup',
  },
  {
    name: 'Summize',
    careerUrl: 'https://www.summize.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/summize',
    type: 'startup',
  },
  {
    name: 'Rally Legal',
    careerUrl: 'https://www.rallylegal.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/rally',
    type: 'startup',
  },
  {
    name: 'Ligl',
    careerUrl: 'https://www.ligl.io/careers',
    leverPostingsUrl: 'https://jobs.lever.co/ligl',
    type: 'startup',
  },
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
    name: 'Eigen Technologies',
    careerUrl: 'https://www.eigen.co/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/eigen',
    type: 'startup',
  },
  {
    name: 'Henchman AI',
    careerUrl: 'https://www.henchman.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/henchman',
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
    name: 'Smith.ai',
    careerUrl: 'https://smith.ai/careers',
    greenhouseId: 'smithai',
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
    name: 'Precisely CLM',
    careerUrl: 'https://www.precisely.com/careers',
    greenhouseId: 'precisely',
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
    name: 'Chainalysis',
    careerUrl: 'https://www.chainalysis.com/careers/',
    greenhouseId: 'chainalysis',
    type: 'tech-legal',
  },
  {
    name: 'Hummingbird',
    careerUrl: 'https://hummingbird.co/careers',
    greenhouseId: 'hummingbird',
    type: 'tech-legal',
  },
  {
    name: 'Unit21',
    careerUrl: 'https://www.unit21.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/unit21',
    type: 'tech-legal',
  },
  {
    name: 'Alloy',
    careerUrl: 'https://www.alloy.com/careers',
    greenhouseId: 'allaboroy',
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
    name: 'Prevalent',
    careerUrl: 'https://www.prevalent.net/careers/',
    greenhouseId: 'prevalent',
    type: 'tech-legal',
  },
  {
    name: 'ZenGRC (Reciprocity)',
    careerUrl: 'https://reciprocity.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Smarsh',
    careerUrl: 'https://www.smarsh.com/careers',
    greenhouseId: 'smarsh',
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
    name: 'KLDiscovery',
    careerUrl: 'https://www.kldiscovery.com/careers',
    greenhouseId: 'kldiscovery',
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
    name: 'LawVu',
    careerUrl: 'https://www.lawvu.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/lawvu',
    type: 'tech-legal',
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
    name: 'Agiloft CLM',
    careerUrl: 'https://www.agiloft.com/company/careers/',
    leverPostingsUrl: 'https://jobs.lever.co/agiloft',
    type: 'tech-legal',
  },
  {
    name: 'SurePoint Technologies',
    careerUrl: 'https://www.surepoint.com/careers',
    type: 'tech-legal',
  },
];
