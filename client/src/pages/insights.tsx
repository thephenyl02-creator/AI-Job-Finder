import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Briefcase,
  Building2,
  MapPin,
  TrendingUp,
  BarChart3,
  Layers,
  Target,
  ArrowRight,
  Laptop,
  Award,
  Send,
  MessageSquare,
  BookOpen,
  Loader2,
} from "lucide-react";

interface MarketAnalytics {
  overview: {
    totalJobs: number;
    totalCompanies: number;
    totalCategories: number;
    remoteJobs: number;
    hybridOrOnsite: number;
    remotePercentage: number;
    avgSalaryMin: number | null;
    avgSalaryMax: number | null;
    totalViews: number;
    totalApplyClicks: number;
  };
  categoryBreakdown: { name: string; count: number; percentage: number }[];
  seniorityBreakdown: { level: string; count: number; percentage: number }[];
  topSkills: { skill: string; count: number }[];
  topCompanies: { company: string; jobCount: number }[];
  topSubcategories: { name: string; count: number }[];
  experienceRanges: {
    entry: number;
    mid: number;
    senior: number;
    expert: number;
  };
}

interface InsightMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

const SENIORITY_ORDER = ["Intern", "Fellowship", "Entry", "Mid", "Senior", "Lead", "Director", "VP"];

const BAR_COLORS: Record<string, string> = {
  "Legal AI & Machine Learning": "bg-blue-500 dark:bg-blue-400",
  "Legal Product & Innovation": "bg-violet-500 dark:bg-violet-400",
  "Legal Operations": "bg-emerald-500 dark:bg-emerald-400",
  "Contract Technology": "bg-amber-500 dark:bg-amber-400",
  "Compliance & RegTech": "bg-rose-500 dark:bg-rose-400",
  "Litigation & eDiscovery": "bg-cyan-500 dark:bg-cyan-400",
  "Legal Consulting & Strategy": "bg-orange-500 dark:bg-orange-400",
  "Legal Education & Training": "bg-pink-500 dark:bg-pink-400",
  "Courts & Public Legal Systems": "bg-teal-500 dark:bg-teal-400",
  "Legal Research & Academia": "bg-indigo-500 dark:bg-indigo-400",
  "Emerging LegalTech Roles": "bg-fuchsia-500 dark:bg-fuchsia-400",
  "Legal Knowledge Engineering": "bg-lime-500 dark:bg-lime-400",
  "Legal Publishing & Content": "bg-sky-500 dark:bg-sky-400",
};

const SUGGESTED_QUESTIONS = [
  "Which legal tech categories have the most open roles right now?",
  "What are the top-paying areas in legal tech?",
  "What skills are most in demand for compliance roles?",
  "How many remote positions are available?",
  "What does the entry-level market look like for law students?",
  "Which companies are hiring the most?",
];

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  testId,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string | number;
  subtitle?: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-serif font-semibold text-foreground tracking-tight" data-testid={`${testId}-value`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="rounded-md bg-muted/60 p-2 shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HorizontalBar({
  label,
  value,
  maxValue,
  percentage,
  colorClass,
  testId,
}: {
  label: string;
  value: number;
  maxValue: number;
  percentage?: number;
  colorClass?: string;
  testId?: string;
}) {
  const widthPct = Math.max(4, (value / maxValue) * 100);
  return (
    <div className="group" data-testid={testId}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-foreground truncate pr-2">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {value}
          </span>
          {percentage !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {percentage}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass || "bg-primary/70"}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function RenderMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((paragraph, pi) => (
        <p key={pi} className={pi < paragraphs.length - 1 ? "mb-3" : ""}>
          {paragraph.split(/(\*\*.*?\*\*)/g).map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            const lines = part.split("\n");
            return lines.map((line, li) => (
              <span key={`${i}-${li}`}>
                {li > 0 && <br />}
                {line}
              </span>
            ));
          })}
        </p>
      ))}
    </>
  );
}

function InsightsChat() {
  const [messages, setMessages] = useState<InsightMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const queryMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/insights/query", { question });
      return res.json() as Promise<{ answer: string; citations: string[] }>;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I wasn't able to analyze that question. Please try rephrasing it." },
      ]);
    },
  });

  const handleSubmit = (question?: string) => {
    const q = (question || input).trim();
    if (!q || queryMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    queryMutation.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="mb-10" data-testid="section-insights-chat">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2" data-testid="text-chat-title">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Ask about the market
        </CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="text-chat-description">
          Ask questions about the legal tech job market. Answers are backed by real data from our job listings.
        </p>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3 font-normal"
                  onClick={() => handleSubmit(q)}
                  data-testid={`button-suggested-question-${i}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto pr-1" data-testid="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-md px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60"
                  }`}
                  data-testid={`chat-message-${i}`}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      <div className="text-sm leading-relaxed mb-3">
                        <RenderMarkdown text={msg.content} />
                      </div>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="border-t border-border/40 pt-2 mt-2">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Sources
                          </p>
                          <div className="space-y-1">
                            {msg.citations.map((cite, ci) => (
                              <p key={ci} className="text-xs text-muted-foreground leading-snug" data-testid={`citation-${i}-${ci}`}>
                                {cite}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {queryMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-muted/60 rounded-md px-4 py-3 flex items-center gap-2" data-testid="chat-loading">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Analyzing market data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the legal tech job market..."
            className="resize-none min-h-[42px] max-h-[120px] text-sm"
            rows={1}
            disabled={queryMutation.isPending}
            data-testid="input-insights-question"
          />
          <Button
            size="icon"
            onClick={() => handleSubmit()}
            disabled={!input.trim() || queryMutation.isPending}
            data-testid="button-send-question"
          >
            {queryMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function Insights() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();

  const { data, isLoading } = useQuery<MarketAnalytics>({
    queryKey: ["/api/analytics/market"],
    enabled: isAuthenticated && isPro,
    staleTime: 5 * 60 * 1000,
  });

  if (authLoading || subLoading || isLoading) {
    return <SkeletonDashboard />;
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <UpgradePrompt
          feature="Market Insights"
          description="Access comprehensive analytics on the legal tech job market including salary trends, in-demand skills, company breakdowns, and seniority distribution. Ask questions and get data-backed answers from our job listings."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-muted-foreground">Unable to load market data.</p>
        </main>
      </div>
    );
  }

  const { overview, categoryBreakdown, seniorityBreakdown, topSkills, topCompanies, topSubcategories, experienceRanges } = data;
  const maxCategoryCount = categoryBreakdown[0]?.count || 1;
  const maxSkillCount = topSkills[0]?.count || 1;

  const sortedSeniority = [...seniorityBreakdown].sort(
    (a, b) => SENIORITY_ORDER.indexOf(a.level) - SENIORITY_ORDER.indexOf(b.level)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight mb-2" data-testid="text-insights-title">
            Market Insights
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Real-time statistics from our legal technology job database. Ask questions or explore the data below.
          </p>
        </div>

        <InsightsChat />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={Briefcase}
            label="Active Positions"
            value={overview.totalJobs}
            subtitle="Across all categories"
            testId="stat-total-jobs"
          />
          <StatCard
            icon={Building2}
            label="Companies Hiring"
            value={overview.totalCompanies}
            subtitle="Legal tech employers"
            testId="stat-total-companies"
          />
          <StatCard
            icon={Layers}
            label="Job Categories"
            value={overview.totalCategories}
            subtitle="Specialization areas"
            testId="stat-total-categories"
          />
          <StatCard
            icon={Laptop}
            label="Remote Positions"
            value={`${overview.remotePercentage}%`}
            subtitle={`${overview.remoteJobs} of ${overview.totalJobs} jobs`}
            testId="stat-remote-percentage"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Jobs by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" data-testid="section-category-breakdown">
              {categoryBreakdown.map((cat) => (
                <HorizontalBar
                  key={cat.name}
                  label={cat.name}
                  value={cat.count}
                  maxValue={maxCategoryCount}
                  percentage={cat.percentage}
                  colorClass={BAR_COLORS[cat.name] || "bg-primary/70"}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Seniority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="section-seniority-breakdown">
              <div className="space-y-4 mb-6">
                {sortedSeniority.map((s) => (
                  <HorizontalBar
                    key={s.level}
                    label={s.level}
                    value={s.count}
                    maxValue={seniorityBreakdown[0]?.count || 1}
                    percentage={s.percentage}
                  />
                ))}
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  By Experience Required
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-exp-entry">
                      {experienceRanges.entry}
                    </p>
                    <p className="text-xs text-muted-foreground">0-2 years</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-exp-mid">
                      {experienceRanges.mid}
                    </p>
                    <p className="text-xs text-muted-foreground">3-5 years</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-exp-senior">
                      {experienceRanges.senior}
                    </p>
                    <p className="text-xs text-muted-foreground">6-9 years</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-exp-expert">
                      {experienceRanges.expert}
                    </p>
                    <p className="text-xs text-muted-foreground">10+ years</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Most In-Demand Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" data-testid="section-top-skills">
              {topSkills.map((s, i) => (
                <div key={s.skill} className="flex items-center gap-3" data-testid={`row-skill-${i}`}>
                  <span className="text-xs font-medium text-muted-foreground w-5 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate pr-2" data-testid={`text-skill-name-${i}`}>
                        {s.skill}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums" data-testid={`text-skill-count-${i}`}>
                        {s.count} {s.count === 1 ? "job" : "jobs"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-700"
                        style={{ width: `${Math.max(4, (s.count / maxSkillCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Top Employers
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="section-top-companies">
              <div className="space-y-3">
                {topCompanies.map((c, i) => (
                  <div
                    key={c.company}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
                    data-testid={`row-company-${i}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-medium text-muted-foreground w-5 text-right tabular-nums shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground truncate" data-testid={`text-company-name-${i}`}>{c.company}</span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 tabular-nums" data-testid={`text-company-count-${i}`}>
                      {c.jobCount} {c.jobCount === 1 ? "position" : "positions"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Top Specializations
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="section-top-subcategories">
              <div className="flex flex-wrap gap-2">
                {topSubcategories.map((sub, i) => (
                  <Badge
                    key={sub.name}
                    variant="outline"
                    className="text-xs py-1 px-2.5"
                    data-testid={`badge-subcategory-${i}`}
                  >
                    {sub.name}
                    <span className="ml-1.5 text-muted-foreground tabular-nums">{sub.count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Work Arrangement
              </CardTitle>
            </CardHeader>
            <CardContent data-testid="section-work-arrangement">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">Remote</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground tabular-nums" data-testid="text-remote-count">{overview.remoteJobs}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{overview.remotePercentage}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">On-site / Hybrid</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground tabular-nums" data-testid="text-onsite-count">{overview.hybridOrOnsite}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{100 - overview.remotePercentage}%</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-muted/60 overflow-hidden flex">
                    <div
                      className="h-full bg-primary/70 transition-all duration-700"
                      style={{ width: `${overview.remotePercentage}%` }}
                    />
                    <div
                      className="h-full bg-muted-foreground/20 transition-all duration-700"
                      style={{ width: `${100 - overview.remotePercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">Remote</span>
                    <span className="text-[10px] text-muted-foreground">On-site / Hybrid</span>
                  </div>
                </div>

                {(overview.totalViews > 0 || overview.totalApplyClicks > 0) && (
                  <div className="border-t border-border/60 pt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Platform Activity
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-total-views">
                          {overview.totalViews.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Job Views</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-3">
                        <p className="text-lg font-semibold text-foreground tabular-nums" data-testid="text-total-clicks">
                          {overview.totalApplyClicks.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Apply Clicks</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-4 pb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Ready to find your next opportunity?
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/">
              <Button data-testid="button-start-searching">
                Start Searching
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button variant="outline" data-testid="button-browse-jobs">
                Browse All Jobs
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
