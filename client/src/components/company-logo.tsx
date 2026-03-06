import { useState, useCallback, useEffect } from "react";

const COMPANY_DOMAINS: Record<string, string> = {
  "9fin": "9fin.com",
  "AB & David": "abdavid.com",
  "ABBYY": "abbyy.com",
  "ACLU": "aclu.org",
  "Addleshaw Goddard": "addleshawgoddard.com",
  "Aderant": "aderant.com",
  "Afridi & Angell": "afridi-angell.com",
  "Agiloft": "agiloft.com",
  "Akin Gump": "akingump.com",
  "Akoma Ntoso (LEX)": "akomantoso.org",
  "Al Tamimi & Company": "tamimi.com",
  "Allen & Overy (A&O Shearman)": "aoshearman.com",
  "Allens": "allens.com.au",
  "Alston & Bird": "alston.com",
  "Anderson Mori & Tomotsune": "amt-law.com",
  "Anthropic": "anthropic.com",
  "Apperio": "apperio.com",
  "Appian": "appian.com",
  "Archer (RSA)": "archerirm.com",
  "Arnold & Porter": "arnoldporter.com",
  "Ashurst": "ashurst.com",
  "Ashurst (Australia)": "ashurst.com",
  "Athennian": "athennian.com",
  "Atrium": "atrium.co",
  "Avvoka": "avvoka.com",
  "Axiom": "axiomlaw.com",
  "AZB & Partners": "azbpartners.com",
  "Bae Kim & Lee": "bkl.co.kr",
  "BAHR": "bahr.no",
  "Baker Botts": "bakerbotts.com",
  "Baker McKenzie": "bakermckenzie.com",
  "Ballard Spahr": "ballardspahr.com",
  "Bär & Karrer": "baerkarrer.ch",
  "Behavox": "behavox.com",
  "Bennett Jones": "bennettjones.com",
  "BigID": "bigid.com",
  "Bill4Time": "bill4time.com",
  "Bird & Bird": "twobirds.com",
  "Blake Cassels & Graydon": "blakes.com",
  "Blank Rome": "blankrome.com",
  "Blue J Legal": "bluej.com",
  "Bodhala": "bodhala.com",
  "Bonelli Erede": "belex.com",
  "BonelliErede Pappalardo": "belex.com",
  "Boodle Hatfield": "boodlehatfield.com",
  "Bowmans": "bowmanslaw.com",
  "Bredin Prat": "bredinprat.com",
  "Brightflag": "brightflag.com",
  "Brightleaf Solutions": "brightleaf.com",
  "Bristows": "bristows.com",
  "Bryan Cave Leighton Paisner": "bclplaw.com",
  "Bryter": "bryter.com",
  "BSA Ahmad Bin Hezeem & Associates": "bsabh.com",
  "Burges Salmon": "burges-salmon.com",
  "Cadwalader Wickersham & Taft": "cadwalader.com",
  "Cahill Gordon & Reindel": "cahill.com",
  "CS Disco": "csdisco.com",
  "CPA Global (Clarivate)": "clarivate.com",
  "CaseFleet": "casefleet.com",
  "CaseMine": "casemine.com",
  "CasePoint": "casepoint.com",
  "Casepoint AI": "casepoint.com",
  "Case Status": "casestatus.com",
  "Celonis": "celonis.com",
  "CenterBase": "centerbase.com",
  "Cerha Hempel": "cerhahempel.com",
  "Charles Russell Speechlys": "charlesrussellspeechlys.com",
  "Checkbox": "checkbox.ai",
  "Checkr": "checkr.com",
  "Chiomenti": "chiomenti.net",
  "Cimplifi": "cimplifi.com",
  "Clarivate (IP)": "clarivate.com",
  "Clausematch": "clausematch.com",
  "Clayton Utz": "claytonutz.com",
  "Cleary Gottlieb": "clearygottlieb.com",
  "Clifford Chance": "cliffordchance.com",
  "Clio": "clio.com",
  "Clyde & Co": "clydeco.com",
  "CMS": "cms.law",
  "Commvault": "commvault.com",
  "Compliance Solutions Strategies": "cssregtech.com",
  "ComplyAdvantage": "complyadvantage.com",
  "Conga": "conga.com",
  "Consilio": "consilio.com",
  "ContractPodAi": "contractpodai.com",
  "ContractSafe": "contractsafe.com",
  "ContractWorks": "contractworks.com",
  "Convercent (OneTrust)": "onetrust.com",
  "Cooley": "cooley.com",
  "Corrs Chambers Westgarth": "corrs.com.au",
  "CounselLink (LexisNexis)": "lexisnexis.com",
  "Covington & Burling": "cov.com",
  "Cravath Swaine & Moore": "cravath.com",
  "Crowell & Moring": "crowell.com",
  "Cuatrecasas": "cuatrecasas.com",
  "Cyril Amarchand Mangaldas": "cyrilshroff.com",
  "DAC Beachcroft": "dacbeachcroft.com",
  "Davis Polk & Wardwell": "davispolk.com",
  "Debevoise & Plimpton": "debevoise.com",
  "Dechert": "dechert.com",
  "Deloitte Legal": "deloitte.com",
  "Dennemeyer": "dennemeyer.com",
  "Dentons": "dentons.com",
  "DiliTrust": "dilitrust.com",
  "Diligent": "diligent.com",
  "Diligent Corporation": "diligent.com",
  "DISCO": "csdisco.com",
  "DLA Piper": "dlapiper.com",
  "DocuSign": "docusign.com",
  "Docusign CLM (SpringCM)": "docusign.com",
  "Drait": "drait.com",
  "Drata": "drata.com",
  "Drew & Napier": "drewnapier.com",
  "Droit Financial": "droitfintech.com",
  "EY Law": "ey.com",
  "ENSafrica": "ensafrica.com",
  "Epiq Global": "epiqglobal.com",
  "Eudia": "eudia.co",
  "Eve Legal": "eve.legal",
  "Everlaw": "everlaw.com",
  "Eversheds Sutherland": "eversheds-sutherland.com",
  "Exiger": "exiger.com",
  "EY": "ey.com",
  "Factor": "factor.law",
  "Factor (Axiom)": "axiomlaw.com",
  "Fenwick & West": "fenwick.com",
  "Fieldfisher": "fieldfisher.com",
  "Filevine": "filevine.com",
  "Foley & Lardner": "foley.com",
  "Freshfields": "freshfields.com",
  "Galvanize (Diligent)": "diligent.com",
  "Garrigues": "garrigues.com",
  "Gibson Dunn": "gibsondunn.com",
  "Gilbert + Tobin": "gtlaw.com.au",
  "Gleiss Lutz": "gleisslutz.com",
  "Global Relay": "globalrelay.com",
  "Goodwin Procter": "goodwinlaw.com",
  "Gorrissen Federspiel": "gorrissenfederspiel.com",
  "Gowling WLG": "gowlingwlg.com",
  "Greenberg Traurig": "gtlaw.com",
  "Haast": "haast.com",
  "Hadef & Partners": "hadefpartners.com",
  "Hall & Wilcox": "hallandwilcox.com.au",
  "Hannes Snellman": "hannessnellman.com",
  "Harbor Global": "harborglobal.com",
  "Harvey AI": "harvey.ai",
  "Haynes and Boone": "haynesboone.com",
  "Hebbia": "hebbia.ai",
  "Hengeler Mueller": "hengeler.com",
  "Herbert Smith Freehills": "herbertsmithfreehills.com",
  "Herbert Smith Freehills (Australia)": "herbertsmithfreehills.com",
  "Hive (Legal)": "hive.co",
  "Hogan Lovells": "hoganlovells.com",
  "Hogan Lovells (London)": "hoganlovells.com",
  "Holding Redlich": "holdingredlich.com",
  "Holland & Knight": "hklaw.com",
  "Homburger": "homburger.ch",
  "Houthoff": "houthoff.com",
  "Howard Kennedy": "howardkennedy.com",
  "Hunton Andrews Kurth": "huntonak.com",
  "Husch Blackwell": "huschblackwell.com",
  "Hyperlex": "hyperlex.ai",
  "Hyperproof": "hyperproof.io",
  "INSZoom": "inszoom.com",
  "Icertis": "icertis.com",
  "Integreon": "integreon.com",
  "Ironclad": "ironcladapp.com",
  "Irwin Mitchell": "irwinmitchell.com",
  "Ivalua": "ivalua.com",
  "Jackson Lewis": "jacksonlewis.com",
  "Johnson Winter Slattery": "jws.com.au",
  "Jones Day": "jonesday.com",
  "JunHe": "junhe.com",
  "Juro": "juro.com",
  "Justia": "justia.com",
  "K&L Gates": "klgates.com",
  "KPMG Legal": "kpmg.com",
  "Katten Muchin Rosenman": "katten.com",
  "Keesal Propulsion Labs": "keesalpropulsionlabs.com",
  "Kennedys": "kennedyslaw.com",
  "Khaitan & Co": "khaitanco.com",
  "Kim & Chang": "kimchang.com",
  "King & Spalding": "kslaw.com",
  "King & Wood Mallesons": "kwm.com",
  "Kingsley Napley": "kingsleynapley.co.uk",
  "Kira Systems": "kirasystems.com",
  "Kirkland & Ellis": "kirkland.com",
  "Knowable": "knowable.com",
  "Kodex": "kodex.com",
  "Kore.ai": "kore.ai",
  "Kortext": "kortext.com",
  "Krogerus": "krogerus.com",
  "Lacourte Raquin Tatar": "lacourte.fr",
  "Lathams (London)": "lw.com",
  "Latham & Watkins": "lw.com",
  "LawDepot": "lawdepot.com",
  "LawTrades": "lawtrades.com",
  "Lawhive": "lawhive.co.uk",
  "Lawtab": "lawtab.com",
  "Lawtoolbox": "lawtoolbox.com",
  "Leap Legal Software": "leap.us",
  "Lee & Lee": "leenlee.com.sg",
  "Leeway": "leeway.tech",
  "Legal OS": "legal-os.io",
  "LegalShield": "legalshield.com",
  "Legalfly": "legalfly.com",
  "Legartis": "legartis.ai",
  "Legatics": "legatics.com",
  "Legisway (Wolters Kluwer)": "wolterskluwer.com",
  "Legora": "legora.com",
  "Lenz & Staehelin": "lenzstaehelin.com",
  "Lewis Silkin": "lewissilkin.com",
  "Lex Machina": "lexmachina.com",
  "Lex Mundi": "lexmundi.com",
  "Lex Predict": "lexpredict.com",
  "LexisNexis": "lexisnexis.com",
  "Lexoo": "lexoo.com",
  "Lighthouse": "lighthouseglobal.com",
  "LinkSquares": "linksquares.com",
  "Linklaters": "linklaters.com",
  "Linklaters Belgium": "linklaters.com",
  "Litera": "litera.com",
  "Litify": "litify.com",
  "Littler Mendelson": "littler.com",
  "LogicGate": "logicgate.com",
  "LogicManager": "logicmanager.com",
  "Loio": "loio.com",
  "Loom Analytics": "loomanalytics.com",
  "Loyens & Loeff": "loyensloeff.com",
  "Luminance": "luminance.com",
  "Luther Rechtsanwaltsgesellschaft": "luther-lawfirm.com",
  "Macfarlanes": "macfarlanes.com",
  "Machado Meyer": "machadomeyer.com.br",
  "Mannheimer Swartling": "mannheimerswartling.se",
  "MarqVision": "marqvision.com",
  "Mattos Filho": "mattosfilho.com.br",
  "Mayer Brown": "mayerbrown.com",
  "McCarthy Tetrault": "mccarthy.ca",
  "McDermott Will & Emery": "mwe.com",
  "MetricStream": "metricstream.com",
  "Milbank": "milbank.com",
  "Milbank (Germany)": "milbank.com",
  "Mills & Reeve": "mills-reeve.com",
  "MinterEllison": "minterellison.com",
  "Mishcon de Reya": "mishcon.com",
  "Mitratech": "mitratech.com",
  "Morgan Lewis": "morganlewis.com",
  "Mori Hamada & Matsumoto": "mhmjapan.com",
  "Morrison & Foerster": "mofo.com",
  "NICE Actimize": "niceactimize.com",
  "Nagashima Ohno & Tsunematsu": "noandt.com",
  "NautaDutilh": "nautadutilh.com",
  "Neota Logic": "neotalogic.com",
  "NetDocuments": "netdocuments.com",
  "Nextpoint": "nextpoint.com",
  "Niederer Kraft Frey": "nkf.ch",
  "Nintex": "nintex.com",
  "Nishimura & Asahi": "nishimura.com",
  "Nishith Desai Associates": "nishithdesai.com",
  "Nixon Peabody": "nixonpeabody.com",
  "Noerr": "noerr.com",
  "Norm AI": "norm.ai",
  "Norton Rose Fulbright": "nortonrosefulbright.com",
  "Norton Rose Fulbright Australia": "nortonrosefulbright.com",
  "Norton Rose Fulbright Canada": "nortonrosefulbright.com",
  "OneSpan": "onespan.com",
  "OneTrust": "onetrust.com",
  "Onit": "onit.com",
  "Ontra": "ontra.ai",
  "Orbital Witness": "orbitalwitness.com",
  "Osborne Clarke": "osborneclarke.com",
  "Osler Hoskin & Harcourt": "osler.com",
  "PandaDoc": "pandadoc.com",
  "Palantir": "palantir.com",
  "PatSnap": "patsnap.com",
  "Paul Weiss": "paulweiss.com",
  "Perkins Coie": "perkinscoie.com",
  "Pinsent Masons": "pinsentmasons.com",
  "Plexus": "plexus.com",
  "Precisely": "precisely.com",
  "Proskauer Rose": "proskauer.com",
  "PwC NewLaw": "pwc.com",
  "QuisLex": "quislex.com",
  "Quinn Emanuel": "quinnemanuel.com",
  "Rajah & Tann": "rajahtannasia.com",
  "Ravel Law (LexisNexis)": "lexisnexis.com",
  "Relativity": "relativity.com",
  "Robin AI": "robinai.com",
  "Rocket Lawyer": "rocketlawyer.com",
  "Ropes & Gray": "ropesgray.com",
  "SAI360": "sai360.com",
  "SeedLegals": "seedlegals.com",
  "Shearman & Sterling": "shearman.com",
  "Shoosmiths": "shoosmiths.com",
  "Sidley Austin": "sidley.com",
  "Simmons & Simmons": "simmons-simmons.com",
  "Skadden": "skadden.com",
  "Slaughter and May": "slaughterandmay.com",
  "Spellbook": "spellbook.legal",
  "Stephenson Harwood": "shlegal.com",
  "Symbiont": "symbiont.io",
  "Tabled": "tabled.io",
  "Taylor Wessing": "taylorwessing.com",
  "Themis Solutions": "clio.com",
  "Thommessen": "thommessen.no",
  "Thompson Hine": "thompsonhine.com",
  "Thomson Reuters": "thomsonreuters.com",
  "Thomson Reuters (Court Solutions)": "thomsonreuters.com",
  "ThoughtRiver": "thoughtriver.com",
  "TLT": "tltsolicitors.com",
  "TMI Associates": "tmi.gr.jp",
  "Tomorro": "tomorro.com",
  "Trackado": "trackado.com",
  "TransPerfect Legal": "transperfect.com",
  "Travers Smith": "traverssmith.com",
  "Trilegal": "trilegal.com",
  "Troutman Pepper": "troutman.com",
  "Tyler Technologies": "tylertech.com",
  "Vector Legal": "vectorlegal.com",
  "Uría Menéndez": "uria.com",
  "Vanta": "vanta.com",
  "Venable": "venable.com",
  "Vinge": "vinge.se",
  "Vinson & Elkins": "velaw.com",
  "Wachtell Lipton": "wlrk.com",
  "Walder Wyss": "walderwyss.com",
  "Wardyński & Partners": "wardynski.com.pl",
  "Watson Farley & Williams": "wfw.com",
  "Webber Wentzel": "webberwentzel.com",
  "Weightmans": "weightmans.com",
  "Weil Gotshal & Manges": "weil.com",
  "Werksmans Attorneys": "werksmans.com",
  "White & Case": "whitecase.com",
  "Wiersholm": "wiersholm.no",
  "Willkie Farr & Gallagher": "willkie.com",
  "WilmerHale": "wilmerhale.com",
  "Winston & Strawn": "winston.com",
  "Withers": "withersworldwide.com",
  "Wolf Theiss": "wolftheiss.com",
  "Wolters Kluwer": "wolterskluwer.com",
  "Womble Bond Dickinson": "womblebonddickinson.com",
  "WongPartnership": "wongpartnership.com",
  "Workiva": "workiva.com",
  "Xact Data Discovery": "xactdatadiscovery.com",
  "Yoon & Yang": "yoonyang.com",
  "Zeal": "zeal.com",
  "Zendoc": "zendoc.io",
  "ZenGRC (Reciprocity)": "reciprocity.com",
  "Zhong Lun": "zhonglun.com",
  "Zola Suite": "zolasuite.com",
  "Alvarez & Marsal": "alvarezandmarsal.com",
  "Ankura": "ankura.com",
  "Ares Operations": "aresmgmt.com",
  "Cedar": "cedar.com",
  "Chadwick Martin Bailey": "chadwickmartinbailey.com",
  "Chamelio": "chamelio.ai",
  "Davis Polk & Wardwell": "davispolk.com",
  "Dunnhumby": "dunnhumby.com",
  "Elevate": "elevateservices.com",
  "Ellucian": "ellucian.com",
  "Evisort": "evisort.com",
  "Figma": "figma.com",
  "Firstbase.io": "firstbase.io",
  "Fried Frank": "friedfrank.com",
  "GC AI": "gcai.com",
  "Gavel": "gavel.io",
  "Grammarly": "grammarly.com",
  "Grant Thornton": "grantthornton.com",
  "Greenberg Gross": "greenberggross.com",
  "Hadrian": "hadrian.co",
  "Haynes and Boone": "haynesboone.com",
  "Hecker Fink": "heckerfink.com",
  "Hinge-Health": "hingehealth.com",
  "IBM": "ibm.com",
  "Ivo": "ivo.ai",
  "KLA": "kla.com",
  "Keller Postman": "kellerpostman.com",
  "Khan Academy": "khanacademy.org",
  "Koch": "kochind.com",
  "Larbey Evans": "larbeyevans.com",
  "Legal Services NYC": "legalservicesnyc.org",
  "LegalKart": "legalkart.com",
  "Legalist": "legalist.com",
  "McGuireWoods": "mcguirewoods.com",
  "Monday.com": "monday.com",
  "Newcode.ai": "newcode.ai",
  "Ogletree Deakins": "ogletree.com",
  "OpenAI": "openai.com",
  "Perk": "perk.com",
  "Persona": "withpersona.com",
  "Ramp": "ramp.com",
  "Raymond James": "raymondjames.com",
  "Regeneron": "regeneron.com",
  "Rogo": "rogo.ai",
  "Salesforce": "salesforce.com",
  "Sardine": "sardine.ai",
  "Schoenherr": "schoenherr.eu",
  "Simpson Thacher": "stblaw.com",
  "Solve Intelligence": "solveintelligence.com",
  "SpotDraft": "spotdraft.com",
  "T. Rowe Price": "troweprice.com",
  "Toyota Tsusho": "toyota-tsusho.co.jp",
  "Trellis Law": "trellislaw.com",
  "Troutman Pepper Locke": "troutman.com",
  "Vercel": "vercel.com",
  "Wachtell Lipton": "wlrk.com",
  "August": "august.com",
  "BCLP": "bclplaw.com",
  "EvenUp": "evenuplaw.com",
  "Greenberg Gross LLP": "greenberggross.com",
  "Hecker Fink LLP": "heckerfink.com",
};

const SUFFIX_PATTERNS = [
  /,?\s+LLP$/i,
  /,?\s+LLC$/i,
  /,?\s+Inc\.?$/i,
  /,?\s+P\.?C\.?$/i,
  /,?\s+P\.?A\.?$/i,
  /,?\s+PLLC$/i,
  /,?\s+and Affiliates$/i,
  /\s+\(US\)$/i,
];

function resolveDomain(logo: string | null | undefined, company: string): string {
  const mapped = COMPANY_DOMAINS[company];
  if (mapped) return mapped;

  for (const pattern of SUFFIX_PATTERNS) {
    const stripped = company.replace(pattern, '').trim();
    if (stripped !== company) {
      const mappedStripped = COMPANY_DOMAINS[stripped];
      if (mappedStripped) return mappedStripped;
    }
  }

  if (logo && logo.includes('logo.clearbit.com')) {
    const match = logo.match(/clearbit\.com\/(.+)/);
    if (match) return match[1];
  }

  if (logo && logo.includes('google.com/s2/favicons')) {
    const match = logo.match(/domain=([^&]+)/);
    if (match) return match[1];
  }

  return company.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com';
}

function getLogoUrl(logo: string | null | undefined, company: string): string {
  if (logo && logo.trim() && !logo.includes('logo.clearbit.com') && !logo.includes('google.com/s2/favicons')) {
    return logo;
  }
  const domain = resolveDomain(logo, company);
  return `/api/company-logo?domain=${encodeURIComponent(domain)}`;
}

const COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-indigo-600",
  "bg-slate-600",
  "bg-teal-600",
  "bg-fuchsia-600",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface CompanyLogoProps {
  company: string;
  logo?: string | null;
  size?: 'xs' | 'sm' | 'md';
  shape?: 'circle' | 'rounded';
  className?: string;
}

export function CompanyLogo({ company, logo, size = 'md', shape = 'rounded', className = '' }: CompanyLogoProps) {
  const url = getLogoUrl(logo, company);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
  }, [url]);

  const handleLoad = useCallback(() => setStatus('loaded'), []);
  const handleError = useCallback(() => setStatus('error'), []);
  const initials = company.substring(0, 2).toUpperCase();
  const color = hashColor(company);

  const sizeClasses = size === 'xs'
    ? 'w-5 h-5'
    : size === 'sm'
      ? 'w-9 h-9 sm:w-10 sm:h-10'
      : 'h-10 w-10 sm:h-12 sm:w-12';

  const shapeClass = size === 'xs'
    ? 'rounded'
    : shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const textSize = size === 'xs' ? 'text-[7px]' : size === 'sm' ? 'text-[10px] sm:text-xs' : 'text-sm';

  const ringClass = size === 'xs' ? '' : 'ring-1 ring-border/10';

  const imgPadding = size === 'xs' ? 'p-0.5' : 'p-1.5';

  return (
    <div
      className={`${sizeClasses} ${shapeClass} ${ringClass} relative overflow-hidden shrink-0 ${className}`}
      data-testid={`logo-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    >
      <div className={`absolute inset-0 ${color} flex items-center justify-center transition-opacity duration-200 ${status === 'loaded' ? 'opacity-0' : 'opacity-100'}`}>
        <span className={`${textSize} font-bold text-white leading-none`}>{initials}</span>
      </div>

      {status !== 'error' && (
        <img
          src={url}
          alt={company}
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-contain ${imgPadding} bg-white transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
