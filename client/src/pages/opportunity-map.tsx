import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCallback, useState, useMemo, useEffect } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Globe, MapPin, Building2, Briefcase, ArrowRight, Wifi } from "lucide-react";
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

function getCountryCode(geo: any): string {
  const iso2 = geo.properties?.ISO_A2;
  if (iso2 && iso2 !== "-99") return iso2;
  const iso2eh = geo.properties?.ISO_A2_EH;
  if (iso2eh && iso2eh !== "-99") return iso2eh;
  return "";
}

function interpolateColor(t: number, isDark: boolean): string {
  if (isDark) {
    const h = 222;
    const s = 14 + t * (47 - 14);
    const l = 18 + t * (55 - 18);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  const h = 220 + t * (222 - 220);
  const s = 14 + t * (47 - 14);
  const l = 95 - t * (95 - 35);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function OpportunityMap() {
  usePageTitle("Opportunity Map");
  const [, navigate] = useLocation();
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState<{ name: string; count: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, [isMobile]);

  const handleGeoHover = useCallback(
    (geo: any) => {
      if (isMobile) return;
      const code = getCountryCode(geo);
      const country = countryMap.get(code);
      if (country) {
        setHoveredCountry(country);
        setTooltipContent({ name: country.countryName, count: country.jobCount });
      } else {
        setHoveredCountry(null);
        setTooltipContent({ name: geo.properties?.NAME || "Unknown", count: 0 });
      }
    },
    [countryMap, isMobile]
  );

  const handleGeoLeave = useCallback(() => {
    if (isMobile) return;
    setHoveredCountry(null);
    setTooltipContent(null);
  }, [isMobile]);

  const handleGeoClick = useCallback(
    (geo: any) => {
      const code = getCountryCode(geo);
      const country = countryMap.get(code);
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
    },
    [countryMap, navigate, isMobile, selectedCountry]
  );

  const panelCountry = isMobile ? selectedCountry : hoveredCountry;
  const baseColor = isDark ? "hsl(220, 14%, 18%)" : "hsl(220, 14%, 95%)";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="mb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
              <div className="lg:w-[65%]">
                <Skeleton className="w-full h-[300px] sm:h-[340px] lg:h-[500px] rounded-md" />
              </div>
              <div className="lg:w-[35%] space-y-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-32 mt-6" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-4 lg:mb-6">
            <h1
              className="text-lg lg:text-2xl font-serif font-medium text-foreground tracking-tight"
              data-testid="text-map-title"
            >
              Opportunity Map
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 lg:mt-1">
              {isMobile ? "Tap a country to see roles" : "Where legal tech is hiring"}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            <div
              className="lg:w-[65%] relative"
              data-testid="map-container"
              onMouseMove={handleMouseMove}
            >
              <div className="rounded-md border border-border/50 bg-muted/20 dark:bg-muted/10 overflow-hidden">
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    scale: isMobile ? 110 : 130,
                    center: [10, 30],
                  }}
                  className="w-full h-[300px] sm:h-[340px] lg:h-[500px]"
                  style={{ width: "100%", height: "auto" }}
                >
                  <ZoomableGroup>
                    <Geographies geography={GEO_URL}>
                      {({ geographies }) =>
                        geographies.map((geo) => {
                          const code = getCountryCode(geo);
                          const country = countryMap.get(code);
                          const hasJobs = !!country;
                          const t = hasJobs ? country.jobCount / maxCount : 0;
                          const fillColor = hasJobs ? interpolateColor(t, isDark) : baseColor;

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fillColor}
                              stroke={isDark ? "hsl(224, 15%, 22%)" : "hsl(220, 14%, 88%)"}
                              strokeWidth={0.5}
                              style={{
                                default: { outline: "none" },
                                hover: {
                                  outline: "none",
                                  fill: hasJobs
                                    ? isDark
                                      ? `hsl(222, 50%, ${55 + 8}%)`
                                      : `hsl(222, 50%, ${Math.max(30, 95 - t * 60 - 5)}%)`
                                    : isDark
                                    ? "hsl(220, 14%, 22%)"
                                    : "hsl(220, 14%, 90%)",
                                  cursor: hasJobs ? "pointer" : "default",
                                },
                                pressed: { outline: "none" },
                              }}
                              onMouseEnter={() => handleGeoHover(geo)}
                              onMouseLeave={handleGeoLeave}
                              onClick={() => handleGeoClick(geo)}
                            />
                          );
                        })
                      }
                    </Geographies>
                  </ZoomableGroup>
                </ComposableMap>
              </div>

              {!isMobile && tooltipContent && (
                <div
                  className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-md text-xs font-medium bg-popover text-popover-foreground border border-border/50"
                  style={{
                    left: tooltipPos.x + 12,
                    top: tooltipPos.y - 8,
                  }}
                >
                  {tooltipContent.name}
                  {tooltipContent.count > 0 && (
                    <span className="text-muted-foreground"> — {tooltipContent.count} roles</span>
                  )}
                </div>
              )}
            </div>

            <div className="lg:w-[35%]" data-testid="panel-stats">
              <Card className="overflow-visible">
                <CardContent className="p-4 lg:p-6">
                  {panelCountry ? (
                    <div className="space-y-3 lg:space-y-5">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 lg:mb-1">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h2
                            className="text-base lg:text-lg font-serif font-medium text-foreground"
                            data-testid="text-panel-title"
                          >
                            {panelCountry.countryName}
                          </h2>
                        </div>
                        <p className="text-xs lg:text-sm text-muted-foreground" data-testid="text-total-jobs">
                          {panelCountry.jobCount} active roles
                        </p>
                      </div>

                      {panelCountry.topCategories?.length > 0 && (
                        <div>
                          <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground tracking-wide uppercase mb-1.5 lg:mb-2">
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

                      <div className="space-y-1.5">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/jobs?country=${panelCountry.countryCode}`)}
                          data-testid="link-view-jobs"
                        >
                          View all roles
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                        {isMobile && (
                          <p className="text-[10px] text-muted-foreground text-center">
                            Or tap the country again on the map
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 lg:space-y-5">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 lg:mb-1">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h2
                            className="text-base lg:text-lg font-serif font-medium text-foreground"
                            data-testid="text-panel-title"
                          >
                            Global Legal Tech Market
                          </h2>
                        </div>
                        {data && (
                          <>
                            <p className="text-xs lg:text-sm text-muted-foreground mt-1.5 lg:mt-2" data-testid="text-total-jobs">
                              <span className="text-foreground font-semibold">{data.totalJobs}</span> active roles across{" "}
                              <span className="text-foreground font-semibold">{data.countriesCount}</span> countries
                            </p>
                            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 lg:mt-1" data-testid="text-remote-share">
                              <Wifi className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                              {data.remoteShare}% remote-friendly
                            </p>
                          </>
                        )}
                      </div>

                      {data?.topCategories && data.topCategories.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5 lg:mb-2">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                              Top Categories
                            </p>
                          </div>
                          <div className="space-y-1 lg:space-y-1.5">
                            {data.topCategories.slice(0, isMobile ? 3 : 5).map((cat) => (
                              <div
                                key={cat.name}
                                className="flex items-center justify-between gap-2 text-xs lg:text-sm"
                              >
                                <span className="text-foreground truncate">{cat.name}</span>
                                <span className="text-muted-foreground text-xs tabular-nums shrink-0">
                                  {cat.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {data?.topCompanies && data.topCompanies.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5 lg:mb-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                              Top Companies
                            </p>
                          </div>
                          <div className="space-y-1 lg:space-y-1.5">
                            {data.topCompanies.slice(0, isMobile ? 3 : 5).map((company) => (
                              <div
                                key={company.name}
                                className="flex items-center justify-between gap-2 text-xs lg:text-sm"
                              >
                                <span className="text-foreground truncate">{company.name}</span>
                                <span className="text-muted-foreground text-xs tabular-nums shrink-0">
                                  {company.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {data?.byCountry && (
                        <div className="pt-2 border-t border-border/30">
                          <Badge
                            variant="secondary"
                            className="text-[10px] no-default-active-elevate"
                          >
                            <Wifi className="h-3 w-3 mr-1" />
                            Worldwide Remote
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
