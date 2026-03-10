import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/components/logo";
import { CompanyLogo } from "@/components/company-logo";
import {
  ArrowRight, Search, Globe, Clock, Lock, Building2, FileText,
  Check, Compass, Briefcase, Send, User, BarChart3, TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/footer";

interface Stats {
  totalJobs: number;
  totalCompanies: number;
  totalCategories: number;
  categoryCounts: Record<string, number>;
  totalUsers?: number;
}

interface MarketPulse {
  newJobsThisWeek: number;
  topHiringCompanies: { name: string; count: number }[];
  trendingSkill: { name: string; count: number } | null;
  totalJobs: number;
  workModeSplit?: { remote: number; hybrid: number; onsite: number };
}

interface JobDensity {
  totalJobs: number;
  countriesCount: number;
  remoteShare: number;
  byCountry: { countryCode: string; countryName: string; jobCount: number; topCategories: string[] }[];
  topCompanies?: { name: string; count: number; logo: string | null }[];
}

const CAREER_PATH_LABELS: Record<string, string> = {
  "Legal Operations": "Legal Operations",
  "Compliance & Privacy": "Compliance & Privacy",
  "Legal Product Management": "Legal Product",
  "Legal Consulting & Advisory": "Legal Consulting",
  "Legal Sales & Client Solutions": "Legal Sales",
  "Legal Engineering": "Legal Engineering",
  "In-House Counsel": "In-House Counsel",
  "Legal AI & Analytics": "Legal AI & Analytics",
  "Contract Management": "Contract Management",
  "Litigation & eDiscovery": "Litigation & eDiscovery",
  "Knowledge Management": "Knowledge Management",
  "Intellectual Property & Innovation": "IP & Innovation",
};

function useFadeInOnScroll() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("visible");
          observer.unobserve(node);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);
  return ref;
}

function LiveTicker({ stats, marketPulse, density }: {
  stats?: Stats;
  marketPulse?: MarketPulse;
  density?: JobDensity;
}) {
  const messages = useMemo(() => {
    const msgs: string[] = [];
    if (marketPulse?.newJobsThisWeek) msgs.push(`${marketPulse.newJobsThisWeek} new roles added this week`);
    if (marketPulse?.topHiringCompanies?.[0]) msgs.push(`Top hiring: ${marketPulse.topHiringCompanies[0].name} with ${marketPulse.topHiringCompanies[0].count} open roles`);
    if (density?.remoteShare) msgs.push(`${density.remoteShare}% of roles are remote`);
    if (stats?.totalCompanies && density?.countriesCount) msgs.push(`Tracking ${stats.totalCompanies} companies across ${density.countriesCount} countries`);
    if (marketPulse?.trendingSkill) msgs.push(`${marketPulse.trendingSkill.name} is trending`);
    return msgs.length > 0 ? msgs : ["Live market intelligence loading..."];
  }, [stats, marketPulse, density]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [animClass, setAnimClass] = useState("animate-ticker-in");

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setAnimClass("animate-ticker-out");
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % messages.length);
        setAnimClass("animate-ticker-in");
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground h-5 overflow-hidden" data-testid="live-ticker">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span key={activeIndex} className={animClass} role="status" aria-live="polite">
        {messages[activeIndex]}
      </span>
    </div>
  );
}

function DonutChart({ workModeSplit, isVisible }: { workModeSplit: { remote: number; hybrid: number; onsite: number }; isVisible: boolean }) {
  const total = workModeSplit.remote + workModeSplit.hybrid + workModeSplit.onsite;
  const r = 16;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { label: "Remote", value: workModeSplit.remote, color: "#3b82f6" },
    { label: "Hybrid", value: workModeSplit.hybrid, color: "#f59e0b" },
    { label: "Onsite", value: workModeSplit.onsite, color: "#94a3b8" },
  ];

  let accumulated = 0;
  const segmentData = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0.33;
    const dashLen = pct * circumference;
    const offset = accumulated;
    accumulated += dashLen;
    return { ...seg, pct, dashLen, offset, rotation: (offset / circumference) * 360 - 90 };
  });

  return (
    <div className="flex items-center gap-2.5">
      <svg width="42" height="42" viewBox="0 0 40 40" className="shrink-0">
        <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" opacity="0.2" />
        {segmentData.map((seg, i) => (
          <circle
            key={seg.label}
            cx="20" cy="20" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="5"
            strokeDasharray={`${seg.dashLen} ${circumference - seg.dashLen}`}
            strokeLinecap="butt"
            className={isVisible ? "animate-draw-segment" : ""}
            style={{
              "--seg-total": `${circumference}`,
              "--seg-target": `${circumference - seg.dashLen}`,
              transform: `rotate(${seg.rotation}deg)`,
              transformOrigin: "center",
              animationDelay: `${0.7 + i * 0.2}s`,
              opacity: isVisible ? 1 : 0,
            } as React.CSSProperties}
          />
        ))}
      </svg>
      <div className="space-y-0.5">
        {segmentData.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[8px] text-muted-foreground">{seg.label}</span>
            <span className="text-[8px] font-medium text-foreground">{Math.round(seg.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingComposition({ marketPulse, stats }: { marketPulse?: MarketPulse; stats?: Stats }) {
  const [visiblePanels, setVisiblePanels] = useState<number[]>([]);
  const [scoreValue, setScoreValue] = useState(0);
  const [scanDone, setScanDone] = useState(false);
  const [tailorScore, setTailorScore] = useState(68);
  const [fitValues, setFitValues] = useState([0, 0, 0]);
  const [showMatchText, setShowMatchText] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  const [showTrending, setShowTrending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const unmountedRef = useRef(false);

  const addTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => { if (!unmountedRef.current) fn(); }, ms);
    timeoutRefs.current.push(id);
  };

  const countUp = (setter: React.Dispatch<React.SetStateAction<number[]>>, targets: number[], startDelay: number, duration: number) => {
    targets.forEach((target, idx) => {
      addTimeout(() => {
        const startTime = performance.now();
        const tick = (now: number) => {
          if (unmountedRef.current) return;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setter((prev) => {
            const copy = [...prev];
            copy[idx] = Math.round(target * eased);
            return copy;
          });
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, startDelay + idx * 150);
    });
  };

  useEffect(() => {
    unmountedRef.current = false;
    if (hasPlayed.current) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed.current) {
          hasPlayed.current = true;
          observer.unobserve(node);
          startSequence();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => {
      unmountedRef.current = true;
      observer.disconnect();
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  const startSequence = () => {
    const delays = [300, 1500, 3000, 3800, 5000, 5800];
    delays.forEach((delay, i) => {
      addTimeout(() => {
        setVisiblePanels((prev) => [...prev, i]);

        if (i === 0) {
          addTimeout(() => setScanDone(true), 1300);
        }

        if (i === 1) {
          const target = 72;
          const duration = 1200;
          const startTime = performance.now();
          const animate = (now: number) => {
            if (unmountedRef.current) return;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setScoreValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          addTimeout(() => setShowMatchText(true), 1300);
          addTimeout(() => setShowGaps(true), 2400);
        }

        if (i === 2) {
          addTimeout(() => setShowTrending(true), 1600);
        }

        if (i === 3) {
          countUp(setFitValues, [92, 85, 78], 200, 800);
        }

        if (i === 4) {
          addTimeout(() => setTailorScore(91), 500);
        }
      }, delay);
    });
  };

  const isVisible = (panel: number) => visiblePanels.includes(panel);

  const circumference = 2 * Math.PI * 42;
  const scoreOffset = circumference - (scoreValue / 100) * circumference;

  const skillTags = ["Contract Law", "M&A", "Due Diligence", "Legal Research", "Negotiation"];
  const careerPaths = [
    { name: "Legal Ops", score: 87, color: "bg-emerald-500" },
    { name: "Contract Mgmt", score: 74, color: "bg-emerald-500" },
    { name: "Legal Product", score: 61, color: "bg-amber-500" },
  ];
  const jobMatches = [
    { title: "Legal Ops Manager", company: "Clio", fit: 92, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    { title: "Product Counsel", company: "Harvey AI", fit: 85, color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
    { title: "Contract Analyst", company: "Agiloft", fit: 78, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  ];
  const skillGaps = ["Data Analytics ↑", "Python ↑", "SQL ↑"];

  const workModeSplit = marketPulse?.workModeSplit
    ? { remote: Math.round(marketPulse.workModeSplit.remote), hybrid: Math.round(marketPulse.workModeSplit.hybrid), onsite: Math.round(marketPulse.workModeSplit.onsite) }
    : { remote: 15, hybrid: 21, onsite: 64 };
  const trendingSkillName = marketPulse?.trendingSkill?.name || "Stakeholder Mgmt";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[340px] sm:h-[420px]"
      data-testid="floating-composition"
    >
      {isVisible(0) && (
        <div
          className="absolute left-[1%] sm:left-[2%] bottom-[5%] sm:bottom-[8%] w-[155px] sm:w-[175px] animate-float-in"
          style={{ zIndex: 2 }}
        >
          <div className="animate-gentle-float" style={{ animationDelay: "0s" }}>
          <div className="rounded-xl border border-border/50 bg-card p-2.5 sm:p-3 shadow-md relative overflow-hidden">
            {!scanDone && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/60 animate-scan-line" />
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-medium text-foreground truncate">Sarah_Resume.pdf</p>
                <div className="flex items-center gap-1">
                  <p className="text-[8px] sm:text-[9px] text-muted-foreground">2 pages</p>
                  {scanDone && (
                    <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 animate-pop-in">
                      <Check className="h-2.5 w-2.5" /> Done
                    </span>
                  )}
                  {!scanDone && (
                    <span className="text-[8px] text-muted-foreground animate-pulse">Parsing...</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-0.5 sm:gap-1">
              {skillTags.map((tag, i) => (
                <span
                  key={tag}
                  className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/15 animate-pop-in opacity-0"
                  style={{ animationDelay: `${1.4 + i * 0.12}s`, animationFillMode: "both" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {isVisible(1) && (
        <div
          className="absolute left-[16%] sm:left-[18%] top-[6%] sm:top-[8%] w-[185px] sm:w-[225px] animate-float-in"
          style={{ zIndex: 5 }}
        >
          <div className="animate-gentle-float" style={{ animationDelay: "1.5s" }}>
          <div className="rounded-xl border border-primary/15 bg-card p-3 sm:p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-2.5">
              <svg className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] -rotate-90 shrink-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={scoreOffset}
                  style={{ transition: "stroke-dashoffset 0.1s linear" }}
                />
              </svg>
              <div>
                <span className="text-2xl sm:text-3xl font-bold text-foreground">{scoreValue}</span>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-wider">Readiness</p>
              </div>
            </div>

            {showMatchText && (
              <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-2.5 animate-fade-in-up">
                Strong match for legal tech
              </p>
            )}

            <div className="space-y-1.5">
              {careerPaths.map((path, i) => (
                <div key={path.name} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground w-[55px] sm:w-[70px] truncate">{path.name}</span>
                  <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${path.color} animate-fill-bar`}
                      style={{
                        "--target-width": `${path.score}%`,
                        animationDelay: `${1.5 + i * 0.2}s`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-medium text-foreground w-6 text-right">{path.score}%</span>
                </div>
              ))}
            </div>

            {showGaps && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {skillGaps.map((gap, i) => (
                  <span
                    key={gap}
                    className="text-[8px] px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15 font-medium animate-pop-in"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    {gap}
                  </span>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {isVisible(2) && (
        <div
          className="absolute left-[0%] sm:left-[0%] top-[1%] sm:top-[2%] w-[140px] sm:w-[155px] animate-fade-in-up"
          style={{ zIndex: 3 }}
        >
          <div className="animate-gentle-float" style={{ animationDelay: "2.5s" }}>
          <div className="rounded-xl border border-border/50 bg-card p-2.5 shadow-md">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-semibold text-foreground">Market Pulse</span>
            </div>
            <DonutChart workModeSplit={workModeSplit} isVisible={isVisible(2)} />
            {showTrending && (
              <div className="mt-2 flex items-center gap-1 animate-fade-in-up">
                <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                <span className="text-[8px] text-muted-foreground truncate">
                  Trending: <span className="text-foreground font-medium">{trendingSkillName.length > 18 ? trendingSkillName.slice(0, 18) + "…" : trendingSkillName}</span>
                </span>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {isVisible(3) && (
        <div
          className="absolute right-[1%] sm:right-[2%] top-[26%] sm:top-[28%] w-[170px] sm:w-[200px] animate-slide-from-right"
          style={{ zIndex: 4 }}
        >
          <div className="animate-gentle-float" style={{ animationDelay: "0.5s" }}>
          <div className="rounded-xl border border-border/50 bg-card p-2 sm:p-2.5 shadow-lg space-y-1 sm:space-y-1.5">
            {jobMatches.map((job, i) => (
              <div
                key={job.title}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg border border-border/30 bg-background animate-slide-from-right"
                style={{ animationDelay: `${0.2 + i * 0.15}s` }}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] sm:text-[9px] font-medium text-foreground truncate">{job.title}</p>
                  <p className="text-[7px] sm:text-[8px] text-muted-foreground">{job.company}</p>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${job.color}`}>
                  {fitValues[i]}%
                </span>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {isVisible(4) && (
        <div
          className="absolute right-[3%] sm:right-[5%] bottom-[2%] sm:bottom-[3%] animate-fade-in-up"
          style={{ zIndex: 6 }}
        >
          <div className="animate-gentle-float" style={{ animationDelay: "3s" }}>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-md flex items-center gap-2">
            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[9px] sm:text-[10px] font-medium text-foreground">Resume tailored</p>
              <p className="text-[8px]">
                <span className="text-muted-foreground">Fit: </span>
                <span
                  className="font-medium transition-colors duration-300"
                  style={{ color: tailorScore >= 91 ? "hsl(142, 76%, 36%)" : "hsl(38, 92%, 50%)" }}
                >
                  {tailorScore}%
                </span>
              </p>
            </div>
          </div>
          </div>
        </div>
      )}

      {isVisible(5) && (
        <div className="absolute right-[22%] sm:right-[25%] top-[0%] animate-pop-in" style={{ zIndex: 7 }}>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-sm flex items-center gap-1.5 animate-pulse-soft" style={{ animationDelay: "0.3s" }}>
            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Ready to apply</span>
          </div>
        </div>
      )}
    </div>
  );
}

function JourneySteps() {
  const fadeRef = useFadeInOnScroll();
  const steps = [
    { icon: User, label: "Profile" },
    { icon: Compass, label: "Path" },
    { icon: Briefcase, label: "Jobs" },
    { icon: FileText, label: "Tailor" },
    { icon: Send, label: "Apply" },
  ];

  return (
    <div ref={fadeRef} className="scroll-fade-in flex items-center justify-center gap-1 sm:gap-2 mb-5">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1 sm:gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border/50 bg-card flex items-center justify-center shadow-sm">
              <step.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-4 sm:w-8 h-px bg-border/60 mb-4" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  usePageTitle();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "landing_page_view" }) }).catch(() => {});
    }
  }, []);

  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/stats"] });
  const { data: latestDiag } = useQuery<any>({ queryKey: ["/api/diagnostic/latest"], enabled: isAuthenticated });
  const hasDiagnostic = !!latestDiag?.report;
  const { data: density } = useQuery<JobDensity>({ queryKey: ["/api/job-density"] });
  const { data: marketPulse } = useQuery<MarketPulse>({ queryKey: ["/api/market-pulse"] });

  const careerPathsWithCounts = stats?.categoryCounts
    ? Object.entries(stats.categoryCounts)
        .filter(([, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
    : [];

  const topCompanies = density?.topCompanies?.filter(c => c.count > 0) || [];
  const marqueeRow1 = topCompanies.slice(0, Math.ceil(topCompanies.length / 2));
  const marqueeRow2 = topCompanies.slice(Math.ceil(topCompanies.length / 2));

  const marqueeFadeRef = useFadeInOnScroll();
  const careerFadeRef = useFadeInOnScroll();
  const ctaFadeRef = useFadeInOnScroll();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer" data-testid="logo-landing">
              <LogoMark className="h-5 w-5 text-foreground" />
              <span className="text-sm font-semibold text-foreground tracking-tight">Legal Tech Careers</span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/jobs">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-jobs">Jobs</Button>
            </Link>
            <Link href="/market-intelligence">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-trends">Trends</Button>
            </Link>
            <Link href="/opportunity-map">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-map">Map</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:inline-flex" data-testid="link-header-pricing">Pricing</Button>
            </Link>
            <ThemeToggle />
            <Link href="/auth">
              <Button size="sm" data-testid="button-header-login">Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-14 flex-1">

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-20 pb-10 sm:pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 max-w-md lg:max-w-lg text-center lg:text-left">
              <p className="text-sm font-semibold text-primary tracking-[0.2em] uppercase mb-5 lg:border-l-2 lg:border-primary lg:pl-3 lg:-ml-3" data-testid="text-hero-label">
                Career intelligence for legal professionals
              </p>

              <h1 className="text-2xl sm:text-[2.75rem] font-serif font-medium text-foreground leading-[1.3] sm:leading-[1.4]" data-testid="text-hero-title">
                Where do you fit in legal tech?
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground mt-5 sm:mt-8 leading-relaxed" data-testid="text-hero-subtitle">
                Upload your resume. In 60 seconds, see your readiness score, matching career paths, and a plan to get there.
              </p>

              <div className="mt-5 sm:mt-8 flex items-center gap-4 flex-wrap justify-center lg:justify-start">
                <Button size="lg" asChild data-testid="button-hero-diagnostic">
                  <a href="/diagnostic" onClick={() => {
                    if (!hasDiagnostic) {
                      try { navigator.sendBeacon("/api/track", new Blob([JSON.stringify({ eventType: "landing_cta_click" })], { type: "application/json" })); } catch {}
                    }
                  }}>
                    {hasDiagnostic ? "View your results" : "Check Your Fit"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <a href="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-hero-browse">
                  or browse {stats?.totalJobs ? `${stats.totalJobs}+` : ""} roles →
                </a>
              </div>

              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center lg:justify-start" data-testid="text-hero-trust">
                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private by default</span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Results in ~90 seconds</span>
                <span className="text-border">·</span>
                <span>No account needed</span>
              </div>

              <p className="mt-3">
                <a href="/quiz" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5" data-testid="link-hero-quiz">
                  <Search className="h-3.5 w-3.5" />
                  Not sure yet? Take a 30-second career quiz →
                </a>
              </p>

              <div className="mt-5">
                <LiveTicker stats={stats} marketPulse={marketPulse} density={density} />
              </div>
            </div>

            <div className="w-full max-w-sm lg:max-w-[480px] lg:w-[480px] shrink-0">
              <FloatingComposition marketPulse={marketPulse} stats={stats} />
            </div>
          </div>
        </section>

        {topCompanies.length > 4 && (
          <section className="border-t border-border/30" data-testid="section-top-companies">
            <div ref={marqueeFadeRef} className="scroll-fade-in py-12 sm:py-16">
              <div className="text-center mb-8">
                <h2 className="text-lg sm:text-2xl font-serif font-medium text-foreground">
                  Who's hiring in legal tech
                </h2>
              </div>

              <div className="space-y-4">
                <div className="relative overflow-hidden marquee-hover-pause">
                  <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                  <div className="marquee-track marquee-left" data-testid="marquee-row-1">
                    {[...marqueeRow1, ...marqueeRow1].map((company, i) => (
                      <div
                        key={`r1-${i}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-xl border border-border/30 bg-card shadow-sm shrink-0"
                        data-testid={i < marqueeRow1.length ? `company-logo-${i}` : undefined}
                      >
                        <CompanyLogo company={company.name} logo={company.logo} size="sm" shape="circle" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{company.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {company.count} {company.count === 1 ? 'role' : 'roles'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative overflow-hidden marquee-hover-pause">
                  <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                  <div className="marquee-track marquee-right" data-testid="marquee-row-2">
                    {[...marqueeRow2, ...marqueeRow2].map((company, i) => (
                      <div
                        key={`r2-${i}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded-xl border border-border/30 bg-card shadow-sm shrink-0"
                        data-testid={i < marqueeRow2.length ? `company-logo-${marqueeRow1.length + i}` : undefined}
                      >
                        <CompanyLogo company={company.name} logo={company.logo} size="sm" shape="circle" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{company.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {company.count} {company.count === 1 ? 'role' : 'roles'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {careerPathsWithCounts.length > 0 && (
                <div ref={careerFadeRef} className="scroll-fade-in max-w-5xl mx-auto px-4 sm:px-6 mt-10">
                  <div className="dot-grid-bg rounded-xl border border-border/30 p-6 sm:p-8">
                    <p className="text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase mb-4 text-center">
                      Career paths we track
                    </p>
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap" data-testid="career-paths-list">
                      {careerPathsWithCounts.map(([path, count], index) => (
                        <a key={path} href="/diagnostic" className={index >= 8 ? "hidden sm:block" : ""} data-testid={`career-path-${path.toLowerCase().replace(/\s+/g, "-")}`}>
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-card shadow-sm text-xs hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <span className="font-medium text-foreground">{CAREER_PATH_LABELS[path] || path}</span>
                            <span className="text-muted-foreground text-[10px]">{count}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center mt-8 flex items-center justify-center gap-4">
                <a href="/jobs" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 transition-colors" data-testid="link-marquee-explore">
                  Explore all roles <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <span className="text-border">·</span>
                <a href="/opportunity-map" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 transition-colors" data-testid="link-marquee-map">
                  <Globe className="h-3.5 w-3.5" /> Explore the map
                </a>
              </div>
            </div>
          </section>
        )}

        <section ref={ctaFadeRef} className="scroll-fade-in border-t border-border/30 dot-grid-bg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="text-center space-y-5" data-testid="final-cta-section">
              <h2 className="text-xl sm:text-3xl font-serif font-medium text-foreground">
                Ready to start your journey?
              </h2>
              <JourneySteps />
              <Button size="lg" asChild data-testid="button-final-cta">
                <a href="/diagnostic">
                  Check Your Fit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                It takes 60 seconds. No account needed.
              </p>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
