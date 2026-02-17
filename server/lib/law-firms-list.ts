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
    type: 'startup',
  },
  {
    name: 'Spellbook',
    careerUrl: 'https://www.spellbook.legal/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/spellbook.legal',
    type: 'startup',
  },
  {
    name: 'Luminance',
    careerUrl: 'https://www.luminance.com/careers/',
    type: 'startup',
  },
  {
    name: 'Darrow',
    careerUrl: 'https://www.darrow.ai/careers',
    type: 'startup',
  },
  {
    name: 'Legora',
    careerUrl: 'https://www.legora.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/legora',
    type: 'startup',
  },
  {
    name: 'Atrium (Legal AI)',
    careerUrl: 'https://www.atrium.ai/careers',
    type: 'startup',
  },
  {
    name: 'Responsiv',
    careerUrl: 'https://responsiv.ai/careers',
    type: 'startup',
  },
  {
    name: 'Hebbia',
    careerUrl: 'https://www.hebbia.ai/careers',
    greenhouseId: 'hebbia',
    type: 'startup',
  },
  {
    name: 'Lawhive',
    careerUrl: 'https://www.lawhive.co.uk/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/lawhive',
    type: 'startup',
  },
  {
    name: 'Juro',
    careerUrl: 'https://juro.com/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/juro',
    type: 'startup',
  },
  {
    name: 'Definely',
    careerUrl: 'https://www.definely.com/careers',
    type: 'startup',
  },
  {
    name: 'SeedLegals',
    careerUrl: 'https://seedlegals.com/careers/',
    type: 'startup',
  },
  {
    name: 'Legatics',
    careerUrl: 'https://legatics.com/careers',
    type: 'startup',
  },
  {
    name: 'Eve Legal',
    careerUrl: 'https://evelegal.com/careers',
    leverPostingsUrl: 'https://jobs.lever.co/Eve',
    type: 'startup',
  },
  {
    name: 'Paxton AI',
    careerUrl: 'https://www.paxton.ai/careers',
    type: 'startup',
  },
  {
    name: 'DoNotPay',
    careerUrl: 'https://donotpay.com/careers',
    type: 'startup',
  },
  {
    name: 'SpotDraft',
    careerUrl: 'https://www.spotdraft.com/careers',
    type: 'startup',
  },
  {
    name: 'LegalOn Technologies',
    careerUrl: 'https://www.legalon.ai/careers',
    type: 'startup',
  },
  {
    name: 'Della AI',
    careerUrl: 'https://della.ai/careers',
    type: 'startup',
  },
  {
    name: 'Henchman',
    careerUrl: 'https://www.henchman.io/careers',
    type: 'startup',
  },
  {
    name: 'Lawyaw',
    careerUrl: 'https://lawyaw.com/careers',
    type: 'startup',
  },
  {
    name: 'Gavel',
    careerUrl: 'https://www.gavel.io/careers',
    type: 'startup',
  },
  {
    name: 'Josef Legal',
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
    type: 'startup',
  },
  {
    name: 'Reynen Court',
    careerUrl: 'https://www.reynencourt.com/careers',
    type: 'startup',
  },
  {
    name: 'Knowable',
    careerUrl: 'https://www.knowablehq.com/careers',
    type: 'startup',
  },
  {
    name: 'Pirical',
    careerUrl: 'https://www.pirical.com/careers',
    type: 'startup',
  },
  {
    name: 'LawVu',
    careerUrl: 'https://www.lawvu.com/careers',
    type: 'startup',
  },
  {
    name: 'Nexl',
    careerUrl: 'https://www.nexl.io/careers',
    type: 'startup',
  },
  {
    name: 'Lawcadia',
    careerUrl: 'https://www.lawcadia.com/careers',
    type: 'startup',
  },
  {
    name: 'LegalVision',
    careerUrl: 'https://legalvision.com.au/careers/',
    type: 'startup',
  },
  {
    name: 'Councilbox',
    careerUrl: 'https://www.councilbox.com/careers',
    type: 'startup',
  },
  {
    name: 'Bigle Legal',
    careerUrl: 'https://www.biglelegal.com/careers',
    type: 'startup',
  },
  {
    name: 'Lawyal Tech',
    careerUrl: 'https://www.lawyaltech.com/careers',
    type: 'startup',
  },
  {
    name: 'MikeLegal',
    careerUrl: 'https://www.mikelegal.com/careers',
    type: 'startup',
  },
  {
    name: 'LegalKart',
    careerUrl: 'https://www.legalkart.com/careers',
    type: 'startup',
  },
  {
    name: 'Phaselaw',
    careerUrl: 'https://www.phaselaw.com/careers',
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
    type: 'tech-legal',
  },
  {
    name: 'PracticePanther',
    careerUrl: 'https://www.practicepanther.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'MyCase',
    careerUrl: 'https://www.mycase.com/company/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Lawmatics',
    careerUrl: 'https://www.lawmatics.com/careers/',
    type: 'tech-legal',
  },

  // --- Contract Lifecycle Management ---
  {
    name: 'Ironclad',
    careerUrl: 'https://ironcladapp.com/careers/',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/ironclad',
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
    name: 'Icertis',
    careerUrl: 'https://www.icertis.com/company/careers/',
    type: 'tech-legal',
  },
  {
    name: 'ConcordNow',
    careerUrl: 'https://www.concordnow.com/careers',
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
    name: 'SimpleLegal',
    careerUrl: 'https://www.simplelegal.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Mitratech',
    careerUrl: 'https://mitratech.com/company/careers/',
    greenhouseId: 'mitratech',
    type: 'tech-legal',
  },

  // --- Document Management & Collaboration ---
  {
    name: 'NetDocuments',
    careerUrl: 'https://www.netdocuments.com/company/careers',
    greenhouseId: 'netdocuments',
    type: 'tech-legal',
  },
  {
    name: 'Litera',
    careerUrl: 'https://www.litera.com/company/careers/',
    workday: { company: 'litera', instance: 'wd12', site: 'Litera_Careers' },
    type: 'tech-legal',
  },

  // --- eDiscovery & Litigation ---
  {
    name: 'DISCO',
    careerUrl: 'https://www.csdisco.com/careers',
    greenhouseId: 'disco',
    type: 'tech-legal',
  },
  {
    name: 'Everlaw',
    careerUrl: 'https://www.everlaw.com/careers/',
    greenhouseId: 'everlaw',
    type: 'tech-legal',
  },
  {
    name: 'Relativity',
    careerUrl: 'https://www.relativity.com/careers/',
    workday: { company: 'kcura', instance: 'wd1', site: 'External_Career_Site' },
    type: 'tech-legal',
  },
  {
    name: 'Nuix',
    careerUrl: 'https://www.nuix.com/company/careers',
    type: 'tech-legal',
  },
  {
    name: 'Exterro',
    careerUrl: 'https://www.exterro.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Logikcull',
    careerUrl: 'https://www.logikcull.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Reveal Data',
    careerUrl: 'https://www.revealdata.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Onna',
    careerUrl: 'https://onna.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Hanzo',
    careerUrl: 'https://www.hanzo.co/careers',
    type: 'tech-legal',
  },
  {
    name: 'Epiq Global',
    careerUrl: 'https://www.epiqglobal.com/en-us/careers',
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
    name: 'vLex',
    careerUrl: 'https://vlex.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Fastcase',
    careerUrl: 'https://www.fastcase.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Lex Machina',
    careerUrl: 'https://lexmachina.com/careers/',
    greenhouseId: 'lex',
    type: 'tech-legal',
  },
  {
    name: 'Docket Alarm',
    careerUrl: 'https://www.docketalarm.com/careers',
    type: 'tech-legal',
  },

  // --- AI & NLP for Legal (Contract Analysis) ---
  {
    name: 'Kira Systems',
    careerUrl: 'https://kirasystems.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Eigen Technologies',
    careerUrl: 'https://eigentech.com/careers/',
    type: 'tech-legal',
  },

  // --- IP & Patent Tech ---
  {
    name: 'Anaqua',
    careerUrl: 'https://www.anaqua.com/company/careers/',
    type: 'tech-legal',
  },
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
    name: 'CPA Global',
    careerUrl: 'https://www.cpaglobal.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Dennemeyer',
    careerUrl: 'https://www.dennemeyer.com/careers/',
    type: 'tech-legal',
  },

  // --- Enterprise Tech with Major Legal Products ---
  {
    name: 'OpenText',
    careerUrl: 'https://www.opentext.com/about/careers',
    type: 'company',
  },
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

  // ===================================================
  // AM LAW 200 / BIG LAW FIRMS - US
  // ===================================================
  {
    name: 'Kirkland & Ellis',
    careerUrl: 'https://staffjobsus.kirkland.com/',
    type: 'biglaw',
  },
  {
    name: 'Latham & Watkins',
    careerUrl: 'https://www.lw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'DLA Piper',
    careerUrl: 'https://www.dlapiper.com/en/us/careers/',
    workday: { company: 'dlapiper', instance: 'wd1', site: 'dlapiper' },
    type: 'biglaw',
  },
  {
    name: 'Baker McKenzie',
    careerUrl: 'https://www.bakermckenzie.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'White & Case',
    careerUrl: 'https://www.whitecase.com/careers',
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
    workday: { company: 'skadden', instance: 'wd5', site: 'Skadden_Careers' },
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
    name: 'Gibson Dunn',
    careerUrl: 'https://www.gibsondunn.com/careers/',
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
    name: 'Milbank',
    careerUrl: 'https://www.milbank.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Willkie Farr',
    careerUrl: 'https://www.willkie.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Morrison Foerster',
    careerUrl: 'https://www.mofo.com/careers',
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
    name: 'Ropes & Gray',
    careerUrl: 'https://www.ropesgray.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Quinn Emanuel',
    careerUrl: 'https://www.quinnemanuel.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Orrick',
    careerUrl: 'https://www.orrick.com/en/Careers',
    type: 'biglaw',
  },
  {
    name: 'WilmerHale',
    careerUrl: 'https://www.wilmerhale.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Arnold & Porter',
    careerUrl: 'https://www.arnoldporter.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Covington & Burling',
    careerUrl: 'https://www.cov.com/en/careers',
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
    type: 'biglaw',
  },
  {
    name: 'Wilson Sonsini',
    careerUrl: 'https://www.wsgr.com/en/careers/',
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
    type: 'biglaw',
  },
  {
    name: 'McDermott Will & Emery',
    careerUrl: 'https://www.mwe.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Greenberg Traurig',
    careerUrl: 'https://www.gtlaw.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // UK / MAGIC CIRCLE & MAJOR UK FIRMS
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
    type: 'biglaw',
  },
  {
    name: 'Slaughter and May',
    careerUrl: 'https://www.slaughterandmay.com/careers/',
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
    name: 'Ashurst',
    careerUrl: 'https://www.ashurst.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Pinsent Masons',
    careerUrl: 'https://www.pinsentmasons.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Clyde & Co',
    careerUrl: 'https://www.clydeco.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Eversheds Sutherland',
    careerUrl: 'https://www.eversheds-sutherland.com/careers',
    type: 'biglaw',
  },
  {
    name: 'CMS',
    careerUrl: 'https://cms.law/en/gbr/careers',
    type: 'biglaw',
  },
  {
    name: 'Osborne Clarke',
    careerUrl: 'https://www.osborneclarke.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Simmons & Simmons',
    careerUrl: 'https://www.simmons-simmons.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Mishcon de Reya',
    careerUrl: 'https://www.mishcon.com/careers',
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
    name: 'Bird & Bird',
    careerUrl: 'https://www.twobirds.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Taylor Wessing',
    careerUrl: 'https://www.taylorwessing.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Shoosmiths',
    careerUrl: 'https://www.shoosmiths.co.uk/careers',
    type: 'biglaw',
  },

  // ===================================================
  // EUROPEAN LAW FIRMS & LEGAL TECH
  // ===================================================
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
  {
    name: 'Bredin Prat',
    careerUrl: 'https://www.bredinprat.com/careers',
    type: 'biglaw',
  },
  {
    name: 'De Brauw Blackstone Westbroek',
    careerUrl: 'https://www.debrauw.com/careers',
    type: 'biglaw',
  },
  {
    name: 'NautaDutilh',
    careerUrl: 'https://www.nautadutilh.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Hengeler Mueller',
    careerUrl: 'https://www.hengeler.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Loyens & Loeff',
    careerUrl: 'https://www.loyensloeff.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Uría Menéndez',
    careerUrl: 'https://www.uria.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Gide Loyrette Nouel',
    careerUrl: 'https://www.gide.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'BonelliErede',
    careerUrl: 'https://www.belex.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Chiomenti',
    careerUrl: 'https://www.chiomenti.net/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Gleiss Lutz',
    careerUrl: 'https://www.gleisslutz.com/en/career.html',
    type: 'biglaw',
  },
  {
    name: 'Noerr',
    careerUrl: 'https://www.noerr.com/en/career',
    type: 'biglaw',
  },
  {
    name: 'Roschier',
    careerUrl: 'https://www.roschier.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Mannheimer Swartling',
    careerUrl: 'https://www.mannheimerswartling.se/en/career/',
    type: 'biglaw',
  },
  {
    name: 'Schoenherr',
    careerUrl: 'https://www.schoenherr.eu/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // ASIA-PACIFIC LAW FIRMS
  // ===================================================
  {
    name: 'King & Wood Mallesons',
    careerUrl: 'https://www.kwm.com/global/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Allens',
    careerUrl: 'https://www.allens.com.au/careers/',
    type: 'biglaw',
  },
  {
    name: 'Clayton Utz',
    careerUrl: 'https://www.claytonutz.com/careers',
    type: 'biglaw',
  },
  {
    name: 'MinterEllison',
    careerUrl: 'https://www.minterellison.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Corrs Chambers Westgarth',
    careerUrl: 'https://www.corrs.com.au/careers',
    type: 'biglaw',
  },
  {
    name: 'Gilbert + Tobin',
    careerUrl: 'https://www.gtlaw.com.au/careers',
    type: 'biglaw',
  },
  {
    name: 'Rajah & Tann',
    careerUrl: 'https://www.rajahtannasia.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Drew & Napier',
    careerUrl: 'https://www.drewnapier.com/Careers',
    type: 'biglaw',
  },
  {
    name: 'Nishimura & Asahi',
    careerUrl: 'https://www.nishimura.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Anderson Mori & Tomotsune',
    careerUrl: 'https://www.amt-law.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Kim & Chang',
    careerUrl: 'https://www.kimchang.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Yulchon',
    careerUrl: 'https://www.yulchon.com/ENG/careers/',
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
    name: 'Shardul Amarchand Mangaldas',
    careerUrl: 'https://www.amsshardul.com/career/',
    type: 'biglaw',
  },
  {
    name: 'Khaitan & Co',
    careerUrl: 'https://www.khaitanco.com/careers',
    type: 'biglaw',
  },

  // ===================================================
  // CANADIAN LAW FIRMS
  // ===================================================
  {
    name: 'Blake, Cassels & Graydon',
    careerUrl: 'https://www.blakes.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Osler, Hoskin & Harcourt',
    careerUrl: 'https://www.osler.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'McCarthy Tétrault',
    careerUrl: 'https://www.mccarthy.ca/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Torys',
    careerUrl: 'https://www.torys.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Stikeman Elliott',
    careerUrl: 'https://www.stikeman.com/en-ca/careers',
    type: 'biglaw',
  },
  {
    name: 'Davies Ward Phillips & Vineberg',
    careerUrl: 'https://www.dwpv.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Gowling WLG',
    careerUrl: 'https://gowlingwlg.com/en/careers/',
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
    careerUrl: 'https://www.webberwentzel.com/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // LATIN AMERICA LAW FIRMS
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
    name: 'Galicia Abogados',
    careerUrl: 'https://www.galicia.com.mx/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ALTERNATIVE LEGAL SERVICE PROVIDERS (ALSPs)
  // ===================================================
  {
    name: 'Axiom',
    careerUrl: 'https://www.axiomlaw.com/careers',
    greenhouseId: 'axiom',
    type: 'alsp',
  },
  {
    name: 'UnitedLex',
    careerUrl: 'https://www.unitedlex.com/careers',
    type: 'alsp',
  },
  {
    name: 'Elevate',
    careerUrl: 'https://elevateservices.com/careers/',
    type: 'alsp',
  },
  {
    name: 'Factor',
    careerUrl: 'https://www.factor.law/careers',
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
    type: 'alsp',
  },
  {
    name: 'Mindcrest',
    careerUrl: 'https://www.mindcrest.com/careers/',
    type: 'alsp',
  },
  {
    name: 'Consilio',
    careerUrl: 'https://www.consilio.com/careers/',
    type: 'alsp',
  },
  {
    name: 'LawFlex',
    careerUrl: 'https://www.lawflex.com/careers',
    type: 'alsp',
  },
  {
    name: 'Vario (Pinsent Masons)',
    careerUrl: 'https://www.pinsentmasons.com/vario',
    type: 'alsp',
  },
  {
    name: 'Adaptive',
    careerUrl: 'https://www.yourflexiblelawyers.com/careers',
    type: 'alsp',
  },

  // ===================================================
  // ADDITIONAL US LEGAL TECH COMPANIES
  // ===================================================
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
    type: 'tech-legal',
  },
  {
    name: 'Opus 2',
    careerUrl: 'https://www.opus2.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Lawtrades',
    careerUrl: 'https://www.lawtrades.com/careers',
    type: 'startup',
  },
  {
    name: 'LawGeex',
    careerUrl: 'https://www.lawgeex.com/careers/',
    type: 'startup',
  },
  {
    name: 'Clearbrief',
    careerUrl: 'https://clearbrief.com/careers',
    type: 'startup',
  },
  {
    name: 'Rally',
    careerUrl: 'https://www.rallynow.com/careers',
    type: 'startup',
  },
  {
    name: 'Precisely',
    careerUrl: 'https://www.precisely.com/careers',
    greenhouseId: 'precisely',
    type: 'tech-legal',
  },
  {
    name: 'AbacusNext',
    careerUrl: 'https://www.abacusnext.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Assembly Neos',
    careerUrl: 'https://www.assemblysoftware.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'CosmoLex',
    careerUrl: 'https://www.cosmolex.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Casepoint',
    careerUrl: 'https://www.casepoint.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Nextpoint',
    careerUrl: 'https://www.nextpoint.com/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Zapproved',
    careerUrl: 'https://www.zapproved.com/company/careers/',
    type: 'tech-legal',
  },
  {
    name: 'Lighthouse (eDiscovery)',
    careerUrl: 'https://www.lighthouseglobal.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'FTI Technology',
    careerUrl: 'https://www.ftitechnology.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'TransPerfect Legal',
    careerUrl: 'https://www.transperfect.com/careers',
    type: 'tech-legal',
  },
  {
    name: 'Norm.ai',
    careerUrl: 'https://www.norm.ai/careers',
    ashbyUrl: 'https://api.ashbyhq.com/posting-api/job-board/norm',
    type: 'startup',
  },
  {
    name: 'Legility',
    careerUrl: 'https://www.legility.com/careers/',
    type: 'alsp',
  },

  // ===================================================
  // ADDITIONAL US BIGLAW FIRMS
  // ===================================================
  {
    name: 'Proskauer Rose',
    careerUrl: 'https://www.proskauer.com/careers',
    type: 'biglaw',
  },
  {
    name: 'King & Spalding',
    careerUrl: 'https://www.kslaw.com/pages/careers',
    type: 'biglaw',
  },
  {
    name: 'Akin Gump',
    careerUrl: 'https://www.akingump.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Dechert',
    careerUrl: 'https://www.dechert.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Mayer Brown',
    careerUrl: 'https://www.mayerbrown.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Winston & Strawn',
    careerUrl: 'https://www.winston.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Pillsbury Winthrop',
    careerUrl: 'https://www.pillsburylaw.com/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Holland & Knight',
    careerUrl: 'https://www.hklaw.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Seyfarth Shaw',
    careerUrl: 'https://www.seyfarth.com/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Katten Muchin',
    careerUrl: 'https://katten.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Vinson & Elkins',
    careerUrl: 'https://www.velaw.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Wachtell Lipton',
    careerUrl: 'https://www.wlrk.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Fried Frank',
    careerUrl: 'https://www.friedfrank.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cadwalader',
    careerUrl: 'https://www.cadwalader.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Cahill Gordon',
    careerUrl: 'https://www.cahill.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Sheppard Mullin',
    careerUrl: 'https://www.sheppardmullin.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Foley & Lardner',
    careerUrl: 'https://www.foley.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Baker Botts',
    careerUrl: 'https://www.bakerbotts.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Alston & Bird',
    careerUrl: 'https://www.alston.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Crowell & Moring',
    careerUrl: 'https://www.crowell.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Squire Patton Boggs',
    careerUrl: 'https://www.squirepattonboggs.com/en/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL EUROPEAN LEGAL TECH
  // ===================================================
  {
    name: 'ThoughtRiver',
    careerUrl: 'https://www.thoughtriver.com/careers',
    type: 'startup',
  },
  {
    name: 'Iris (Germany)',
    careerUrl: 'https://www.iris.de/karriere',
    type: 'company',
  },
  {
    name: 'Deloitte Legal',
    careerUrl: 'https://www2.deloitte.com/global/en/careers.html',
    type: 'company',
  },
  {
    name: 'PwC Legal',
    careerUrl: 'https://www.pwc.com/gx/en/careers.html',
    type: 'company',
  },
  {
    name: 'Avvoka',
    careerUrl: 'https://www.avvoka.com/careers',
    type: 'startup',
  },
  {
    name: 'Legito',
    careerUrl: 'https://www.legito.com/careers',
    type: 'startup',
  },
  {
    name: 'ContractHero',
    careerUrl: 'https://www.contracthero.com/careers',
    type: 'startup',
  },
  {
    name: 'Clausematch',
    careerUrl: 'https://www.clausematch.com/careers',
    type: 'startup',
  },
  {
    name: 'Orbital Witness',
    careerUrl: 'https://www.orbitalwitness.com/careers',
    type: 'startup',
  },
  {
    name: 'Robin AI',
    careerUrl: 'https://www.robinai.com/careers',
    greenhouseId: 'robinai',
    type: 'startup',
  },
  {
    name: 'Leya',
    careerUrl: 'https://www.leya.law/careers',
    type: 'startup',
  },

  // ===================================================
  // ADDITIONAL EUROPEAN LAW FIRMS
  // ===================================================
  {
    name: 'Gleiss Lutz',
    careerUrl: 'https://www.gleisslutz.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Lenz & Staehelin',
    careerUrl: 'https://www.lenzstaehelin.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Bär & Karrer',
    careerUrl: 'https://www.baerkarrer.ch/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Homburger',
    careerUrl: 'https://www.homburger.ch/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Stibbe',
    careerUrl: 'https://www.stibbe.com/careers',
    type: 'biglaw',
  },
  {
    name: 'BonelliErede',
    careerUrl: 'https://www.belex.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Gianni & Origoni',
    careerUrl: 'https://www.gop.it/en/careers',
    type: 'biglaw',
  },
  {
    name: 'BCLP (Bryan Cave Leighton Paisner)',
    careerUrl: 'https://www.bclplaw.com/en-US/careers.html',
    type: 'biglaw',
  },
  {
    name: 'Addleshaw Goddard',
    careerUrl: 'https://www.addleshawgoddard.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'DAC Beachcroft',
    careerUrl: 'https://www.dacbeachcroft.com/en/gb/careers/',
    type: 'biglaw',
  },
  {
    name: 'Burges Salmon',
    careerUrl: 'https://www.burges-salmon.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Withers',
    careerUrl: 'https://www.withersworldwide.com/en-gb/careers',
    type: 'biglaw',
  },
  {
    name: 'Charles Russell Speechlys',
    careerUrl: 'https://www.charlesrussellspeechlys.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'Fieldfisher',
    careerUrl: 'https://www.fieldfisher.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Watson Farley & Williams',
    careerUrl: 'https://www.wfw.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'Stephenson Harwood',
    careerUrl: 'https://www.shlegal.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Gide Loyrette Nouel',
    careerUrl: 'https://www.gide.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'August Debouzy',
    careerUrl: 'https://www.august-debouzy.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Elvinger Hoss Prussen',
    careerUrl: 'https://www.elvingerhoss.lu/careers',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL ASIA-PACIFIC LEGAL TECH
  // ===================================================
  {
    name: 'Zegal',
    careerUrl: 'https://zegal.com/careers/',
    type: 'startup',
  },
  {
    name: 'LawAdvisor',
    careerUrl: 'https://www.lawadvisor.com/careers',
    type: 'startup',
  },
  {
    name: 'Legaltech.sg',
    careerUrl: 'https://legaltech.sg/careers',
    type: 'startup',
  },
  {
    name: 'Xakia Technologies',
    careerUrl: 'https://www.xakiatech.com/careers',
    type: 'startup',
  },

  // ===================================================
  // ADDITIONAL ASIA-PACIFIC LAW FIRMS
  // ===================================================
  {
    name: 'Mori Hamada & Matsumoto',
    careerUrl: 'https://www.mhmjapan.com/en/careers.html',
    type: 'biglaw',
  },
  {
    name: 'TMI Associates',
    careerUrl: 'https://www.tmi.gr.jp/english/careers/',
    type: 'biglaw',
  },
  {
    name: 'Nagashima Ohno & Tsunematsu',
    careerUrl: 'https://www.noandt.com/en/careers/',
    type: 'biglaw',
  },
  {
    name: 'WongPartnership',
    careerUrl: 'https://www.wongpartnership.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Allen & Gledhill',
    careerUrl: 'https://www.allenandgledhill.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Lee & Ko',
    careerUrl: 'https://www.leeko.com/eng/careers',
    type: 'biglaw',
  },
  {
    name: 'Shin & Kim',
    careerUrl: 'https://www.shinkim.com/eng/careers',
    type: 'biglaw',
  },
  {
    name: 'Bae Kim & Lee',
    careerUrl: 'https://www.bkl.co.kr/eng/careers',
    type: 'biglaw',
  },
  {
    name: 'Trilegal',
    careerUrl: 'https://trilegal.com/careers/',
    type: 'biglaw',
  },
  {
    name: 'J Sagar Associates',
    careerUrl: 'https://www.jsalaw.com/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL CANADIAN LEGAL TECH
  // ===================================================
  {
    name: 'Diligen',
    careerUrl: 'https://www.diligen.com/careers',
    type: 'startup',
  },
  {
    name: 'ROSS Intelligence',
    careerUrl: 'https://www.rossintelligence.com/careers',
    type: 'startup',
  },
  {
    name: 'Blue J Legal',
    careerUrl: 'https://www.bluej.com/careers',
    greenhouseId: 'bluej',
    type: 'startup',
  },
  {
    name: 'Beagle AI',
    careerUrl: 'https://www.beagle.ai/careers',
    type: 'startup',
  },
  {
    name: 'Athennian',
    careerUrl: 'https://www.athennian.com/careers',
    type: 'startup',
  },

  // ===================================================
  // ADDITIONAL CANADIAN LAW FIRMS
  // ===================================================
  {
    name: 'Fasken',
    careerUrl: 'https://www.fasken.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'Bennett Jones',
    careerUrl: 'https://www.bennettjones.com/careers',
    type: 'biglaw',
  },
  {
    name: 'Norton Rose Fulbright Canada',
    careerUrl: 'https://www.nortonrosefulbright.com/en-ca/careers',
    type: 'biglaw',
  },
  {
    name: 'Borden Ladner Gervais',
    careerUrl: 'https://www.blg.com/en/careers',
    type: 'biglaw',
  },
  {
    name: 'McMillan LLP',
    careerUrl: 'https://mcmillan.ca/careers/',
    type: 'biglaw',
  },

  // ===================================================
  // ADDITIONAL MIDDLE EAST & AFRICA
  // ===================================================
  {
    name: 'LegalEase Solutions',
    careerUrl: 'https://www.legaleasesolutions.com/careers',
    type: 'startup',
  },

  // ===================================================
  // ADDITIONAL LATIN AMERICA
  // ===================================================
  {
    name: 'LegalSight',
    careerUrl: 'https://www.legalsight.com.br/careers',
    type: 'startup',
  },
];
