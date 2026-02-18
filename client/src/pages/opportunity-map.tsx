import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Globe, MapPin, ArrowRight, Wifi, Briefcase, ExternalLink } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryData {
  countryCode: string;
  countryName: string;
  jobCount: number;
  topCategories: string[];
}

interface CategoryCount {
  name: string;
  count: number;
}

interface CompanyCount {
  name: string;
  count: number;
}

interface JobDensityData {
  totalJobs: number;
  countriesCount: number;
  remoteShare: number;
  byCountry: CountryData[];
  topCategories: CategoryCount[];
  topCompanies: CompanyCount[];
}

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  "Fiji": "FJ",
  "Tanzania": "TZ",
  "W. Sahara": "EH",
  "Canada": "CA",
  "United States of America": "US",
  "Kazakhstan": "KZ",
  "Uzbekistan": "UZ",
  "Papua New Guinea": "PG",
  "Indonesia": "ID",
  "Argentina": "AR",
  "Chile": "CL",
  "Dem. Rep. Congo": "CD",
  "Somalia": "SO",
  "Kenya": "KE",
  "Sudan": "SD",
  "Chad": "TD",
  "Haiti": "HT",
  "Dominican Rep.": "DO",
  "Russia": "RU",
  "Bahamas": "BS",
  "Falkland Is.": "FK",
  "Norway": "NO",
  "Greenland": "GL",
  "Fr. S. Antarctic Lands": "TF",
  "Timor-Leste": "TL",
  "South Africa": "ZA",
  "Lesotho": "LS",
  "Mexico": "MX",
  "Uruguay": "UY",
  "Brazil": "BR",
  "Bolivia": "BO",
  "Peru": "PE",
  "Colombia": "CO",
  "Panama": "PA",
  "Costa Rica": "CR",
  "Nicaragua": "NI",
  "Honduras": "HN",
  "El Salvador": "SV",
  "Guatemala": "GT",
  "Belize": "BZ",
  "Venezuela": "VE",
  "Guyana": "GY",
  "Suriname": "SR",
  "France": "FR",
  "Ecuador": "EC",
  "Puerto Rico": "PR",
  "Jamaica": "JM",
  "Cuba": "CU",
  "Zimbabwe": "ZW",
  "Botswana": "BW",
  "Namibia": "NA",
  "Senegal": "SN",
  "Mali": "ML",
  "Mauritania": "MR",
  "Benin": "BJ",
  "Niger": "NE",
  "Nigeria": "NG",
  "Cameroon": "CM",
  "Togo": "TG",
  "Ghana": "GH",
  "Côte d'Ivoire": "CI",
  "Guinea": "GN",
  "Guinea-Bissau": "GW",
  "Liberia": "LR",
  "Sierra Leone": "SL",
  "Burkina Faso": "BF",
  "Central African Rep.": "CF",
  "Congo": "CG",
  "Gabon": "GA",
  "Eq. Guinea": "GQ",
  "Zambia": "ZM",
  "Malawi": "MW",
  "Mozambique": "MZ",
  "eSwatini": "SZ",
  "Angola": "AO",
  "Burundi": "BI",
  "Israel": "IL",
  "Lebanon": "LB",
  "Madagascar": "MG",
  "Palestine": "PS",
  "Gambia": "GM",
  "Tunisia": "TN",
  "Algeria": "DZ",
  "Jordan": "JO",
  "United Arab Emirates": "AE",
  "Qatar": "QA",
  "Kuwait": "KW",
  "Iraq": "IQ",
  "Oman": "OM",
  "Vanuatu": "VU",
  "Cambodia": "KH",
  "Thailand": "TH",
  "Laos": "LA",
  "Myanmar": "MM",
  "Vietnam": "VN",
  "North Korea": "KP",
  "South Korea": "KR",
  "Mongolia": "MN",
  "India": "IN",
  "Bangladesh": "BD",
  "Bhutan": "BT",
  "Nepal": "NP",
  "Pakistan": "PK",
  "Afghanistan": "AF",
  "Tajikistan": "TJ",
  "Kyrgyzstan": "KG",
  "Turkmenistan": "TM",
  "Iran": "IR",
  "Syria": "SY",
  "Armenia": "AM",
  "Sweden": "SE",
  "Belarus": "BY",
  "Ukraine": "UA",
  "Poland": "PL",
  "Austria": "AT",
  "Hungary": "HU",
  "Moldova": "MD",
  "Romania": "RO",
  "Lithuania": "LT",
  "Latvia": "LV",
  "Estonia": "EE",
  "Germany": "DE",
  "Bulgaria": "BG",
  "Greece": "GR",
  "Turkey": "TR",
  "Albania": "AL",
  "Croatia": "HR",
  "Switzerland": "CH",
  "Luxembourg": "LU",
  "Belgium": "BE",
  "Netherlands": "NL",
  "Portugal": "PT",
  "Spain": "ES",
  "Ireland": "IE",
  "New Caledonia": "NC",
  "Solomon Is.": "SB",
  "New Zealand": "NZ",
  "Australia": "AU",
  "Sri Lanka": "LK",
  "China": "CN",
  "Taiwan": "TW",
  "Italy": "IT",
  "Denmark": "DK",
  "United Kingdom": "GB",
  "Iceland": "IS",
  "Azerbaijan": "AZ",
  "Georgia": "GE",
  "Philippines": "PH",
  "Malaysia": "MY",
  "Brunei": "BN",
  "Slovenia": "SI",
  "Finland": "FI",
  "Slovakia": "SK",
  "Czechia": "CZ",
  "Eritrea": "ER",
  "Japan": "JP",
  "Paraguay": "PY",
  "Yemen": "YE",
  "Saudi Arabia": "SA",
  "Antarctica": "AQ",
  "N. Cyprus": "CY",
  "Cyprus": "CY",
  "Morocco": "MA",
  "Egypt": "EG",
  "Libya": "LY",
  "Ethiopia": "ET",
  "Djibouti": "DJ",
  "Somaliland": "SO",
  "Uganda": "UG",
  "Rwanda": "RW",
  "Bosnia and Herz.": "BA",
  "Macedonia": "MK",
  "Serbia": "RS",
  "Montenegro": "ME",
  "Kosovo": "XK",
  "Trinidad and Tobago": "TT",
  "S. Sudan": "SS",
};

function getCountryCode(geo: any): string {
  const iso2 = geo.properties?.ISO_A2;
  if (iso2 && iso2 !== "-99") return iso2;
  const iso2eh = geo.properties?.ISO_A2_EH;
  if (iso2eh && iso2eh !== "-99") return iso2eh;
  const name = geo.properties?.NAME || geo.properties?.name || "";
  if (name && COUNTRY_NAME_TO_ISO2[name]) return COUNTRY_NAME_TO_ISO2[name];
  return "";
}

function getCountryName(geo: any): string {
  return geo.properties?.NAME || geo.properties?.ADMIN || geo.properties?.name || "";
}

function isAntarctica(geo: any): boolean {
  const name = (geo.properties?.NAME || "").toLowerCase();
  const code = getCountryCode(geo);
  return name === "antarctica" || code === "AQ";
}

function interpolateColor(t: number, isDark: boolean): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (isDark) {
    const h = 217;
    const s = 30 + clamped * 62;
    const l = 22 + clamped * 38;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  const h = 217;
  const s = 40 + clamped * 52;
  const l = 88 - clamped * 55;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function OpportunityMap() {
  usePageTitle("Opportunity Map");
  const [, navigate] = useLocation();
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipContentRef = useRef<{ name: string; count: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const { data, isLoading } = useQuery<JobDensityData>({
    queryKey: ["/api/job-density"],
  });

  const countryMap = useMemo(() => {
    if (!data?.byCountry) return new Map<string, CountryData>();
    const m = new Map<string, CountryData>();
    data.byCountry.forEach((c) => m.set(c.countryCode, c));
    return m;
  }, [data]);

  const maxCount = useMemo(() => {
    if (!data?.byCountry?.length) return 1;
    return Math.max(...data.byCountry.map((c) => c.jobCount));
  }, [data]);

  const sortedCountries = useMemo(() => {
    if (!data?.byCountry) return [];
    return [...data.byCountry]
      .filter((c) => c.countryCode !== "WW" && c.countryCode !== "UN" && c.countryName !== "Unknown")
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, 8);
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const el = tooltipRef.current;
    if (el) {
      el.style.left = `${Math.min(e.clientX + 12, window.innerWidth - 200)}px`;
      el.style.top = `${e.clientY - 8}px`;
    }
  }, [isMobile]);

  const hoveredCountry = hoveredCode ? countryMap.get(hoveredCode) ?? null : null;
  const panelCountry = isMobile ? selectedCountry : hoveredCountry;
  const emptyFill = isDark ? "hsl(220, 10%, 15%)" : "hsl(220, 14%, 96%)";
  const strokeColor = isDark ? "hsl(220, 10%, 20%)" : "hsl(220, 14%, 90%)";
  const activeStroke = isDark ? "hsl(217, 40%, 45%)" : "hsl(217, 50%, 60%)";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="flex items-center gap-6 mb-6">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-28" />
              ))}
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:flex-1">
                <Skeleton className="w-full h-[340px] sm:h-[400px] lg:h-[500px] rounded-md" />
              </div>
              <div className="lg:w-[320px] space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 lg:py-8">

          <div className="mb-5 lg:mb-8">
            <h1
              className="text-xl lg:text-2xl font-serif font-medium text-foreground tracking-tight"
              data-testid="text-map-title"
            >
              Where legal tech is hiring
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              {isMobile ? "Tap a highlighted country to explore" : "Hover to explore, click to see open roles"}
            </p>
          </div>

          {data && (
            <div className="flex items-center gap-6 sm:gap-10 mb-5 lg:mb-6" data-testid="stats-summary">
              <div>
                <p className="text-2xl lg:text-3xl font-semibold text-foreground tabular-nums" data-testid="text-stat-jobs">{data.totalJobs}</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">Active roles</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div>
                <p className="text-2xl lg:text-3xl font-semibold text-foreground tabular-nums" data-testid="text-stat-countries">{data.countriesCount}</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">Countries</p>
              </div>
              <div className="w-px h-8 bg-border/50" />
              <div>
                <p className="text-2xl lg:text-3xl font-semibold text-foreground tabular-nums" data-testid="text-stat-remote">{data.remoteShare}%</p>
                <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5">Remote-friendly</p>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6">

            <div
              className="lg:flex-1 relative"
              data-testid="map-container"
              onMouseMove={handleMouseMove}
            >
              <div className="rounded-md border border-border/50 overflow-hidden bg-muted/10 dark:bg-muted/5">
                <ComposableMap
                  projection="geoNaturalEarth1"
                  projectionConfig={{
                    scale: isMobile ? 140 : 155,
                    center: [10, 10],
                  }}
                  className="w-full"
                  style={{ width: "100%", height: "auto" }}
                  height={isMobile ? 340 : 500}
                  width={800}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies
                        .filter((geo) => !isAntarctica(geo))
                        .map((geo) => {
                          const code = getCountryCode(geo);
                          const country = countryMap.get(code);
                          const hasJobs = !!country;
                          const t = hasJobs ? Math.pow(country.jobCount / maxCount, 0.5) : 0;
                          const fillColor = hasJobs ? interpolateColor(t, isDark) : emptyFill;

                          const hoverFill = hasJobs
                            ? isDark
                              ? "hsl(217, 70%, 55%)"
                              : "hsl(217, 65%, 45%)"
                            : isDark
                              ? "hsl(220, 10%, 18%)"
                              : "hsl(220, 14%, 92%)";

                          const isPanelHovered = hoveredCode === code && hasJobs;
                          const activeFill = isPanelHovered ? hoverFill : fillColor;
                          const activeStrokeColor = isPanelHovered ? activeStroke : strokeColor;
                          const activeStrokeWidth = isPanelHovered ? 1.2 : 0.4;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={activeFill}
                              stroke={activeStrokeColor}
                              strokeWidth={activeStrokeWidth}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  outline: "none",
                                  fill: hoverFill,
                                  stroke: hasJobs ? activeStroke : strokeColor,
                                  strokeWidth: hasJobs ? 1.2 : 0.4,
                                  cursor: hasJobs ? "pointer" : "default",
                                },
                                pressed: { outline: "none" },
                              }}
                              onMouseEnter={() => {
                                if (isMobile) return;
                                setHoveredCode(code);
                                const name = getCountryName(geo);
                                tooltipContentRef.current = country
                                  ? { name: country.countryName, count: country.jobCount }
                                  : name ? { name, count: 0 } : null;
                                const el = tooltipRef.current;
                                if (el && tooltipContentRef.current) {
                                  el.style.opacity = "1";
                                  el.textContent = tooltipContentRef.current.count > 0
                                    ? `${tooltipContentRef.current.name} — ${tooltipContentRef.current.count} roles`
                                    : tooltipContentRef.current.name;
                                }
                              }}
                              onMouseLeave={() => {
                                if (isMobile) return;
                                setHoveredCode(null);
                                tooltipContentRef.current = null;
                                const el = tooltipRef.current;
                                if (el) el.style.opacity = "0";
                              }}
                              onClick={() => {
                                if (!country) return;
                                if (isMobile) {
                                  if (selectedCountry?.countryCode === code) {
                                    navigate(`/jobs?country=${code}`);
                                  } else {
                                    setSelectedCountry(country);
                                  }
                                } else {
                                  navigate(`/jobs?country=${code}`);
                                }
                              }}
                            />
                          );
                        })
                    }
                  </Geographies>
                </ComposableMap>
              </div>

              <div className="flex items-center justify-between gap-3 mt-2 px-1">
                <span className="text-[10px] text-muted-foreground">Fewer roles</span>
                <div
                  className="flex-1 h-1.5 rounded-full max-w-[140px]"
                  style={{
                    background: isDark
                      ? "linear-gradient(to right, hsl(217, 30%, 22%), hsl(217, 92%, 60%))"
                      : "linear-gradient(to right, hsl(217, 40%, 88%), hsl(217, 92%, 33%))",
                  }}
                  data-testid="legend-gradient"
                />
                <span className="text-[10px] text-muted-foreground">More roles</span>
              </div>

              {!isMobile && (
                <div
                  ref={tooltipRef}
                  className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-md text-xs font-medium bg-popover text-popover-foreground border border-border shadow-sm whitespace-nowrap"
                  style={{ opacity: 0, transition: "opacity 0.1s ease" }}
                />
              )}
            </div>

            <div className="lg:w-[320px] shrink-0" data-testid="panel-stats">
              {panelCountry ? (
                <Card className="overflow-visible">
                  <CardContent className="p-4 lg:p-5">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <h2
                            className="text-base lg:text-lg font-serif font-medium text-foreground"
                            data-testid="text-panel-title"
                          >
                            {panelCountry.countryName}
                          </h2>
                        </div>
                        <p className="text-2xl lg:text-3xl font-semibold text-foreground tabular-nums" data-testid="text-panel-count">
                          {panelCountry.jobCount}
                          <span className="text-sm font-normal text-muted-foreground ml-1.5">
                            active roles
                          </span>
                        </p>
                      </div>

                      {panelCountry.topCategories?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                            Top Categories
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {panelCountry.topCategories.slice(0, 5).map((cat) => (
                              <Badge
                                key={cat}
                                variant="outline"
                                className="text-[10px] no-default-active-elevate"
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => navigate(`/jobs?country=${panelCountry.countryCode}`)}
                        data-testid="link-view-jobs"
                      >
                        View {panelCountry.jobCount} roles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      {isMobile && (
                        <p className="text-[10px] text-muted-foreground text-center -mt-2">
                          Or tap the country again on the map
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                      Top Regions
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isMobile ? "Tap to explore" : "Click to view roles"}
                    </p>
                  </div>

                  <div className="space-y-1.5" data-testid="panel-country-list">
                    {sortedCountries.map((c) => {
                      const pct = maxCount > 0 ? (c.jobCount / maxCount) * 100 : 0;
                      return (
                        <button
                          key={c.countryCode}
                          className="w-full flex items-center gap-3 rounded-md border border-border/50 px-3 py-2.5 text-left hover-elevate cursor-pointer group"
                          onClick={() => {
                            if (isMobile) {
                              setSelectedCountry(c);
                            } else {
                              navigate(`/jobs?country=${c.countryCode}`);
                            }
                          }}
                          onMouseEnter={() => {
                            if (!isMobile) setHoveredCode(c.countryCode);
                          }}
                          onMouseLeave={() => {
                            if (!isMobile) setHoveredCode(null);
                          }}
                          data-testid={`panel-country-${c.countryCode}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground truncate">{c.countryName}</span>
                              <span className="text-xs text-muted-foreground tabular-nums shrink-0">{c.jobCount}</span>
                            </div>
                            <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(4, pct)}%`,
                                  backgroundColor: isDark ? "hsl(217, 70%, 55%)" : "hsl(217, 65%, 50%)",
                                }}
                              />
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 invisible lg:visible" />
                        </button>
                      );
                    })}
                  </div>

                  {data?.byCountry?.some((c) => c.countryCode === "WW") && (
                    <button
                      className="w-full flex items-center gap-3 rounded-md border border-dashed border-border/50 px-3 py-2.5 text-left hover-elevate cursor-pointer"
                      onClick={() => navigate("/jobs?country=WW")}
                      data-testid="panel-country-WW"
                    >
                      <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Worldwide Remote</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {data.byCountry.find((c) => c.countryCode === "WW")?.jobCount || 0}
                        </span>
                      </div>
                    </button>
                  )}

                  {data?.topCategories && data.topCategories.length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                          Top Categories
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.topCategories.slice(0, 5).map((cat) => (
                          <Badge
                            key={cat.name}
                            variant="outline"
                            className="text-[10px] no-default-active-elevate"
                          >
                            {cat.name}
                            <span className="ml-1 text-muted-foreground">{cat.count}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
