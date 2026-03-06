import { useState, useCallback, useEffect } from "react";

const COMPANY_DOMAINS: Record<string, string> = {
  "ABBYY": "abbyy.com",
  "ACLU": "aclu.org",
  "Aderant": "aderant.com",
  "Agiloft": "agiloft.com",
  "Alston & Bird": "alston.com",
  "Anthropic": "anthropic.com",
  "Appian": "appian.com",
  "Axiom": "axiomlaw.com",
  "Brightflag": "brightflag.com",
  "Celonis": "celonis.com",
  "Checkbox": "checkbox.ai",
  "Clio": "clio.com",
  "Conga": "conga.com",
  "Cooley": "cooley.com",
  "DISCO": "csdisco.com",
  "DLA Piper": "dlapiper.com",
  "Dennemeyer": "dennemeyer.com",
  "Epiq Global": "epiqglobal.com",
  "Eve Legal": "eve.legal",
  "Everlaw": "everlaw.com",
  "Exiger": "exiger.com",
  "Factor": "factor.law",
  "Filevine": "filevine.com",
  "Gibson Dunn": "gibsondunn.com",
  "Goodwin Procter": "goodwinlaw.com",
  "Greenberg Traurig": "gtlaw.com",
  "Harvey AI": "harvey.ai",
  "Hebbia": "hebbia.ai",
  "Holland & Knight": "hklaw.com",
  "Hyperproof": "hyperproof.io",
  "Kodex": "kodex.com",
  "Lawhive": "lawhive.co.uk",
  "Legora": "legora.com",
  "LexisNexis": "lexisnexis.com",
  "Litify": "litify.com",
  "LogicGate": "logicgate.com",
  "MarqVision": "marqvision.com",
  "McDermott Will & Emery": "mwe.com",
  "Mitratech": "mitratech.com",
  "NetDocuments": "netdocuments.com",
  "OneSpan": "onespan.com",
  "OneTrust": "onetrust.com",
  "Onit": "onit.com",
  "Palantir": "palantir.com",
  "PandaDoc": "pandadoc.com",
  "Rocket Lawyer": "rocketlawyer.com",
  "SAI360": "sai360.com",
  "Skadden": "skadden.com",
  "Spellbook": "spellbook.legal",
  "Thomson Reuters": "thomsonreuters.com",
  "Wolters Kluwer": "wolterskluwer.com",
};

function resolveDomain(logo: string | null | undefined, company: string): string {
  const mapped = COMPANY_DOMAINS[company];
  if (mapped) return mapped;

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
  size?: 'sm' | 'md';
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

  const sizeClasses = size === 'sm'
    ? 'w-9 h-9 sm:w-10 sm:h-10'
    : 'h-10 w-10 sm:h-12 sm:w-12';

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  const textSize = size === 'sm' ? 'text-[10px] sm:text-xs' : 'text-sm';

  return (
    <div
      className={`${sizeClasses} ${shapeClass} relative overflow-hidden shrink-0 ring-1 ring-border/10 ${className}`}
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
          className={`absolute inset-0 w-full h-full object-contain p-1.5 bg-white transition-opacity duration-200 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
