import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useParams } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job, Resume, StructuredDescription } from "@shared/schema";
import type { ResumeExtractedData } from "@shared/models/auth";
import { decodeHtmlEntities, fixMissingSentenceSpaces, cleanStructuredText, parseStructuredDescription } from "@/lib/structured-description";
import { StructuredDescriptionView } from "@/components/structured-description-view";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Loader2,
  MessageCircle,
  Send,
  FileText,
  Bookmark,
  Award,
  GraduationCap,
  Clock,
  Target,
  Users,
  Gift,
  Star,
  Zap,
  Scale,
  Handshake,
  Hash,
  TrendingUp,
  Sparkles,
  Globe,
  CalendarDays,
  CheckCircle2,
  Upload,
  Crown,
  Lock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const BULLET_PATTERN = /^(?:[-•*]\s|(?:\d+)[.)]\s)/;

function isBulletLine(line: string): boolean {
  return BULLET_PATTERN.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^(?:[-•*]\s+|(?:\d+)[.)]\s+)/, '');
}

function isLikelyHeading(text: string): boolean {
  const t = text.trim();
  if (t.length > 80 || t.length < 2) return false;
  if (t.endsWith(':')) return true;
  if (t === t.toUpperCase() && t.length > 3 && /[A-Z]/.test(t)) return true;
  return false;
}

type Block = { type: 'paragraph' | 'heading' | 'bullet'; content: string };

function splitFlatParagraph(text: string): Block[] {
  if (text.length < 400) return [{ type: 'paragraph', content: text }];
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentences.length <= 3) return [{ type: 'paragraph', content: text }];
  const paragraphs: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && buf.length > 150) {
      paragraphs.push(buf);
      buf = s;
    } else {
      buf = buf ? buf + ' ' + s : s;
    }
  }
  if (buf) paragraphs.push(buf);
  return paragraphs.map(p => ({ type: 'paragraph' as const, content: p }));
}

function parseTextIntoBlocks(text: string): Block[] {
  const newlineCount = (text.match(/\n/g) || []).length;
  if (newlineCount < 3 && text.length > 400) {
    return splitFlatParagraph(text);
  }

  const lines = text.split('\n');
  const blocks: Block[] = [];
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) blocks.push({ type: 'paragraph', content: trimmed });
    currentParagraph = '';
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) { flushParagraph(); continue; }
    if (isBulletLine(trimmedLine)) {
      flushParagraph();
      blocks.push({ type: 'bullet', content: stripBulletPrefix(trimmedLine) });
      continue;
    }
    if (isLikelyHeading(trimmedLine) && !currentParagraph.trim()) {
      flushParagraph();
      blocks.push({ type: 'heading', content: trimmedLine });
      continue;
    }
    if (currentParagraph) {
      currentParagraph += ' ' + trimmedLine;
    } else {
      currentParagraph = trimmedLine;
    }
  }
  flushParagraph();
  return blocks;
}

function fixDashPrefixParagraphs(text: string): string {
  const lines = text.split('\n');
  const dashLines = lines.filter(l => /^- /.test(l.trim()));
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (dashLines.length < 3 || dashLines.length < nonEmpty.length * 0.5) return text;
  return lines.map(line => {
    const trimmed = line.trim();
    if (/^- /.test(trimmed)) {
      const content = trimmed.slice(2).trim();
      if (content.length > 80) return content;
    }
    return trimmed;
  }).join('\n');
}

function stripCompanyBoilerplate(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length < 3) return text;
  const roleSignals = [
    /\b(?:about (?:the |this )?role|the (?:role|opportunity|challenge|position)|in this role|what you(?:'ll| will)|your (?:role|responsibilities|impact)|we(?:'re| are) (?:looking|seeking|hiring))\b/i,
    /(?:^|\.\s+)As (?:a|an|the) /,
    /\b(?:responsibilities|qualifications|requirements|key duties)\b/i,
    /(?:^|\.\s+)(?:You will|You'll|In this role)/,
  ];
  let roleIdx = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (roleSignals.some(s => s.test(paragraphs[i].trim()))) { roleIdx = i; break; }
  }
  if (roleIdx <= 1) return text;
  const introText = paragraphs.slice(0, roleIdx).join('\n\n');
  if (introText.length > text.length * 0.6) return text;
  const remaining = paragraphs.slice(roleIdx).join('\n\n').trim();
  if (remaining.length < 200) return text;
  return remaining.replace(/^(?:About (?:the |this )?role|The (?:Role|Opportunity|Challenge|Position|Team))\s*:?\s*\n*/i, '');
}

function cleanDescription(text: string): string {
  let cleaned = decodeHtmlEntities(text);
  if (/<[a-z][^>]*>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
    cleaned = cleaned.replace(/<(?:p|div|h[1-6]|ul|ol|table|tbody|thead|section|article)(?:\s[^>]*)?>/gi, '\n');
    cleaned = cleaned.replace(/<li(?:\s[^>]*)?>/gi, '- ');
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    cleaned = cleaned.replace(/&[a-z]+;/gi, ' ');
  }
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^[ \t]+/gm, '');
  cleaned = fixDashPrefixParagraphs(cleaned);
  cleaned = fixMissingSentenceSpaces(cleaned);
  cleaned = stripCompanyBoilerplate(cleaned);
  return cleaned.trim();
}

function linkifyEmails(content: string) {
  const emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const parts = content.split(emailRegex);
  if (parts.length === 1) return content;
  return parts.map((part, idx) => {
    if (emailRegex.test(part)) {
      emailRegex.lastIndex = 0;
      return (
        <a
          key={idx}
          href={`mailto:${part}`}
          className="text-primary hover:underline inline-flex items-center gap-0.5"
          data-testid={`link-inline-email-${part.replace(/[@.]/g, '-')}`}
        >
          {part}
        </a>
      );
    }
    emailRegex.lastIndex = 0;
    return part;
  });
}

type HighlightCategory = 'experience' | 'certification' | 'education' | 'tool' | 'legal' | 'compensation' | 'softskill';

const HIGHLIGHT_CATEGORIES: Record<HighlightCategory, { label: string; color: string; icon: typeof Clock }> = {
  experience: { label: 'Experience', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300', icon: Clock },
  certification: { label: 'Certifications', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300', icon: Award },
  education: { label: 'Education', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: GraduationCap },
  tool: { label: 'Tools & Tech', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300', icon: Hash },
  legal: { label: 'Legal Domains', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300', icon: Scale },
  compensation: { label: 'Compensation', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300', icon: DollarSign },
  softskill: { label: 'Soft Skills', color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300', icon: Handshake },
};


const HIGHLIGHT_PATTERNS: { pattern: RegExp; type: HighlightCategory }[] = [
  { pattern: /\b(\d+)\+?\s*(?:[-–]?\s*\d+\s*)?(?:years?|yrs?)\b(?:\s+(?:of\s+)?(?:experience|exp))?/gi, type: 'experience' },
  { pattern: /\b(?:JD|J\.D\.|Juris Doctor|Bar (?:Admission|License|Certified)|Licensed Attorney|Bar Exam|Esq\.|LL\.?M\.?|LL\.?B\.?|Certified|CIPP|CIPM|CIPT|PMP|CISSP|AWS Certified|Scrum Master|Six Sigma|CLE)\b/gi, type: 'certification' },
  { pattern: /\b(?:Bachelor'?s?|Master'?s?|MBA|Ph\.?D\.?|Doctorate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?)\b(?:\s+(?:degree|in))?\b/gi, type: 'education' },
  { pattern: /\b(?:Python|JavaScript|TypeScript|SQL|Java|C\+\+|React|Angular|Vue|Node\.?js|AWS|Azure|GCP|Docker|Kubernetes|Salesforce|Tableau|Power BI|Excel|Jira|Confluence|Slack|Notion|Figma|Sketch|REST(?:ful)?|GraphQL|API|Git|CI\/CD|Agile|NLP|Machine Learning|AI|Blockchain|Relativity|Everlaw|Reveal|Concordance|Clearwell|Brainspace|DISCO|NetDocuments|iManage|Clio|Aderant|Elite|ProLaw|Legal Tracker|Luminance|Kira|Eigen|Diligent|Thomson Reuters|LexisNexis|Westlaw)\b/gi, type: 'tool' },
  { pattern: /\b(?:e-?discovery|ediscovery|litigation|compliance|regulatory|GDPR|CCPA|privacy|intellectual property|patent|trademark|copyright|M&A|mergers?\s*(?:&|and)\s*acquisitions?|due diligence|corporate governance|contract (?:management|review|drafting|lifecycle)|CLM|antitrust|securities|SOX|HIPAA|AML|KYC|data protection|cyber\s*security|information governance|records management|legal hold|privilege review|document review)\b/gi, type: 'legal' },
  { pattern: /\$\s*\d[\d,]*(?:\.\d{2})?(?:\s*[-–]\s*\$?\s*\d[\d,]*(?:\.\d{2})?)?\s*(?:per\s+(?:hour|year|annum|month)|\/(?:hr|yr|mo)|annually|(?:K|k)\b)?/g, type: 'compensation' },
  { pattern: /\b(?:equity|stock options?|RSU|bonus|401\(?k\)?|health (?:insurance|benefits)|dental|vision|PTO|paid time off|unlimited (?:PTO|vacation)|parental leave|remote work|work[- ]from[- ]home|flexible (?:hours|schedule|work))\b/gi, type: 'compensation' },
  { pattern: /\b(?:leadership|communication|collaboration|teamwork|problem[- ]solving|critical thinking|analytical|strategic (?:thinking|planning)|stakeholder management|cross[- ]functional|mentoring|coaching|negotiation|presentation|interpersonal|relationship[- ]building|project management|time management|organizational|adaptability|creative thinking|decision[- ]making|conflict resolution)\b/gi, type: 'softskill' },
];

function highlightKeywords(content: string | (string | JSX.Element)[], activeCategories: Set<HighlightCategory>): (string | JSX.Element)[] {
  if (typeof content !== 'string') {
    if (Array.isArray(content)) return content;
    return [content];
  }
  const text = content;
  const matches: { start: number; end: number; type: HighlightCategory }[] = [];
  for (const { pattern, type } of HIGHLIGHT_PATTERNS) {
    if (!activeCategories.has(type)) continue;
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      const overlap = matches.some(
        (ex) => m!.index < ex.end && m!.index + m![0].length > ex.start
      );
      if (!overlap) {
        matches.push({ start: m.index, end: m.index + m[0].length, type });
      }
    }
  }
  if (matches.length === 0) return [text];
  matches.sort((a, b) => a.start - b.start);
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  matches.forEach((match, idx) => {
    if (match.start > last) parts.push(text.slice(last, match.start));
    const highlighted = text.slice(match.start, match.end);
    const colorClass = HIGHLIGHT_CATEGORIES[match.type].color;
    parts.push(
      <mark key={`hl-${idx}`} className={`${colorClass} px-1 py-0.5 rounded text-[0.92em] font-medium no-underline`} data-hl-type={match.type}>
        {highlighted}
      </mark>
    );
    last = match.end;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderHighlightedContent(content: string, activeCategories: Set<HighlightCategory>) {
  const emailified = linkifyEmails(content);
  if (typeof emailified === 'string') {
    return highlightKeywords(emailified, activeCategories);
  }
  if (Array.isArray(emailified)) {
    return emailified.flatMap((part) => {
      if (typeof part === 'string') return highlightKeywords(part, activeCategories);
      return [part];
    });
  }
  return [emailified];
}


interface DescriptionSection {
  heading: string;
  blocks: Block[];
  icon: typeof Briefcase;
  priority: number;
}

const SECTION_CLASSIFY: { pattern: RegExp; label: string; icon: typeof Briefcase; priority: number }[] = [
  { pattern: /(?:responsibilities|what you(?:'ll| will) do|in this role|your role|day.to.day|daily|your impact|key duties)/i, label: 'Responsibilities', icon: Target, priority: 1 },
  { pattern: /(?:qualifications|requirements|what (?:you(?:'ll| will) need|we(?:'re| are) looking for)|skills|experience|about you|who you are|must.have)/i, label: 'Qualifications', icon: GraduationCap, priority: 2 },
  { pattern: /(?:preferred|nice.to.have|plus|bonus|desired|ideal)/i, label: 'Nice to Have', icon: Star, priority: 3 },
  { pattern: /(?:benefits|perks|compensation|salary|pay|what we offer|why (?:join|work))/i, label: 'Benefits & Perks', icon: Gift, priority: 4 },
  { pattern: /(?:about (?:the |this )?(?:company|team|us)|our (?:mission|culture|values|team)|who we are)/i, label: 'About the Company', icon: Users, priority: 5 },
  { pattern: /(?:getting started|onboarding|how to apply|application|apply)/i, label: 'Getting Started', icon: Zap, priority: 6 },
];

function classifySection(heading: string): { label: string; icon: typeof Briefcase; priority: number } {
  for (const { pattern, label, icon, priority } of SECTION_CLASSIFY) {
    if (pattern.test(heading)) return { label, icon, priority };
  }
  return { label: heading.replace(/:$/, ''), icon: Briefcase, priority: 10 };
}

function groupBlocksIntoSections(blocks: Block[]): DescriptionSection[] {
  const sections: DescriptionSection[] = [];
  let currentSection: DescriptionSection | null = null;
  let introBlocks: Block[] = [];
  let sectionIdx = 0;

  for (const block of blocks) {
    if (block.type === 'heading') {
      if (currentSection) {
        sections.push(currentSection);
      } else if (introBlocks.length > 0) {
        sections.push({ heading: 'Overview', blocks: introBlocks, icon: FileText, priority: 0 });
        introBlocks = [];
      }
      const classified = classifySection(block.content);
      currentSection = {
        heading: classified.label,
        blocks: [],
        icon: classified.icon,
        priority: classified.priority,
      };
      sectionIdx++;
    } else {
      if (currentSection) {
        currentSection.blocks.push(block);
      } else {
        introBlocks.push(block);
      }
    }
  }
  if (currentSection) sections.push(currentSection);
  if (introBlocks.length > 0 && sections.length === 0) {
    sections.push({ heading: 'Overview', blocks: introBlocks, icon: FileText, priority: 0 });
  } else if (introBlocks.length > 0) {
    sections.unshift({ heading: 'Overview', blocks: introBlocks, icon: FileText, priority: 0 });
  }
  return sections;
}



function DescriptionContent({ text, testId, compact, isPro }: { text?: string | null; testId: string; compact?: boolean; isPro?: boolean }) {
  if (!text) return null;

  const cleanedText = useMemo(() => cleanDescription(text), [text]);
  const blocks = useMemo(() => parseTextIntoBlocks(cleanedText), [cleanedText]);
  const sections = useMemo(() => groupBlocksIntoSections(blocks), [blocks]);

  const activeCategories = useMemo(() => {
    if (isPro) return new Set(Object.keys(HIGHLIGHT_CATEGORIES) as HighlightCategory[]);
    return new Set<HighlightCategory>();
  }, [isPro]);

  const renderBlock = useCallback((block: Block, i: number) => {
    const highlighted = renderHighlightedContent(block.content, activeCategories);
    if (block.type === 'bullet') {
      return (
        <li key={i} className="flex gap-3 text-[0.925rem] text-foreground/80 leading-[1.7]" data-testid={`bullet-${i}`}>
          <span className="shrink-0 mt-[0.65rem] w-[5px] h-[5px] rounded-full bg-primary/40" />
          <span>{highlighted}</span>
        </li>
      );
    }
    return (
      <p key={i} className="text-[0.925rem] text-foreground/80 leading-[1.7]" data-testid={`para-${i}`}>
        {highlighted}
      </p>
    );
  }, [activeCategories]);

  if (compact) {
    return (
      <div className="space-y-2" data-testid={testId}>
        {blocks.slice(0, 12).map((block, i) => {
          if (block.type === 'heading') {
            return <p key={i} className="font-medium text-foreground text-sm pt-2 first:pt-0">{block.content}</p>;
          }
          if (block.type === 'bullet') {
            return (
              <div key={i} className="flex gap-2 pl-1 text-sm">
                <span className="shrink-0 mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-foreground/25" />
                <span className="text-foreground/90">{block.content}</span>
              </div>
            );
          }
          return <p key={i} className="text-sm text-foreground/90">{block.content}</p>;
        })}
      </div>
    );
  }

  if (sections.length <= 1) {
    return (
      <div className="space-y-3.5" data-testid={testId}>
        {blocks.map(renderBlock)}
      </div>
    );
  }

  return (
    <div className="space-y-7" data-testid={testId}>
      {sections.map((section, si) => (
        <div key={`${section.heading}-${si}`} data-testid={`section-${section.heading.toLowerCase().replace(/\s+/g, '-')}`}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {section.heading}
          </h3>
          <div className="space-y-2.5">
            {section.blocks.map((block, i) => renderBlock(block, si * 100 + i))}
          </div>
          {si < sections.length - 1 && (
            <div className="border-b border-border/40 mt-7" />
          )}
        </div>
      ))}
    </div>
  );
}


interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function formatChatMarkdown(text: string) {
  const lines = text.split("\n");
  let key = 0;
  return lines.map((line) => {
    if (line.trim().startsWith("- ")) {
      return (
        <div key={key++} className="flex gap-2 pl-2 py-0.5">
          <span className="text-muted-foreground shrink-0">&bull;</span>
          <span>{renderBoldText(line.trim().slice(2), key)}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={key++} className="h-1.5" />;
    return <p key={key++} className="leading-relaxed">{renderBoldText(line, key)}</p>;
  });
}

function renderBoldText(text: string, pk: number) {
  const parts: (string | JSX.Element)[] = [];
  let last = 0;
  let i = 0;
  const re = /\*\*(.*?)\*\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`${pk}-${i++}`} className="font-semibold">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

const JOB_QUESTION_CHIPS = [
  "Break down what this role does day-to-day",
  "How does my legal background apply here?",
  "What skills should I highlight in my application?",
  "Explain the technical requirements in plain language",
];

function JobChat({ jobId }: { jobId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await apiRequest("POST", "/api/assistant/chat", {
        message: msgText,
        history,
        context: { jobId },
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply || "Sorry, please try again." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card data-testid="section-job-chat">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground" data-testid="heading-job-chat">
            Questions About This Role
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4 pl-[2.375rem]">
          Get plain-language answers tailored to your legal background.
        </p>

        <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-2 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {JOB_QUESTION_CHIPS.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(q)}
                  className="text-xs text-left h-auto py-2 px-3 whitespace-normal"
                  data-testid={`button-job-chip-${q.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <MessageCircle className="h-3 w-3 mr-1.5 shrink-0" />
                  {q}
                </Button>
              ))}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
                data-testid={`message-job-${msg.role}-${msg.id}`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-0.5">{formatChatMarkdown(msg.content)}</div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your question..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[40px] max-h-[80px] py-2 border-b border-border focus:border-foreground transition-colors"
            style={{ height: "40px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "40px";
              t.style.height = Math.min(t.scrollHeight, 80) + "px";
            }}
            data-testid="input-job-chat"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            data-testid="button-send-job-chat"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getPostedDateLabel(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 7) return `Posted ${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Posted ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  const months = Math.floor(days / 30);
  return `Posted ${months} ${months === 1 ? "month" : "months"} ago`;
}

function getLocationTypeLabel(job: Job): string | null {
  if (job.locationType === 'remote' || (!job.locationType && job.isRemote)) return 'Remote';
  if (job.locationType === 'hybrid') return 'Hybrid';
  if (job.locationType === 'onsite') return 'On-site';
  return null;
}

export default function JobDetail() {
  usePageTitle("Job Details");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const { trackNow } = useActivityTracker();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const trackedJobRef = useRef<string | null>(null);
  const applyButtonRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showApplyNudge, setShowApplyNudge] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: isAuthenticated && !!jobId,
  });

  useEffect(() => {
    if (jobId && job && trackedJobRef.current !== jobId) {
      trackedJobRef.current = jobId;
      trackNow({
        eventType: "job_view",
        entityType: "job",
        entityId: jobId,
        metadata: {
          company: job.company,
          roleCategory: job.roleCategory,
          title: job.title,
        },
      });
    }
  }, [jobId, job?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    const el = applyButtonRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [job]);

  const { data: savedJobIds = [] } = useQuery<number[]>({
    queryKey: ["/api/saved-jobs/ids"],
    enabled: isAuthenticated,
  });

  const jobIsSaved = job ? savedJobIds.includes(job.id) : false;

  const { data: userResumes = [] } = useQuery<Resume[]>({
    queryKey: ["/api/resumes"],
    enabled: isAuthenticated,
  });

  const resumeFit = useMemo(() => {
    if (!job?.keySkills?.length || userResumes.length === 0) return null;
    const jobSkillsLower = job.keySkills.map(s => s.toLowerCase().trim());
    const results = userResumes
      .filter(r => r.extractedData && typeof r.extractedData === 'object')
      .map(resume => {
        const data = resume.extractedData as ResumeExtractedData;
        const resumeSkills = (data.skills || []).map(s => s.toLowerCase().trim());
        let matchCount = 0;
        const matched: string[] = [];
        const missing: string[] = [];
        for (const js of job.keySkills!) {
          const jsLower = js.toLowerCase().trim();
          const found = resumeSkills.some(rs =>
            rs.includes(jsLower) || jsLower.includes(rs) ||
            rs.split(/\s+/).some(w => jsLower.split(/\s+/).includes(w))
          );
          if (found) { matchCount++; matched.push(js); } else { missing.push(js); }
        }
        const score = Math.round((matchCount / jobSkillsLower.length) * 100);
        return { resumeId: resume.id, label: resume.label, isPrimary: resume.isPrimary, score, matched, missing, totalSkills: jobSkillsLower.length };
      })
      .sort((a, b) => b.score - a.score);
    return results.length > 0 ? results : null;
  }, [job?.keySkills, userResumes]);

  const { toast } = useToast();
  const saveJobMutation = useMutation({
    mutationFn: async () => {
      if (!job) return;
      if (jobIsSaved) {
        await apiRequest("DELETE", `/api/saved-jobs/${job.id}`);
      } else {
        await apiRequest("POST", `/api/saved-jobs/${job.id}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs/ids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
    },
    onError: (error: any) => {
      if (error?.message?.includes("5 jobs") || error?.message?.includes("Upgrade to Pro")) {
        toast({ title: "Save limit reached", description: "Free accounts can save up to 5 jobs. Upgrade to Pro for unlimited saves.", variant: "destructive" });
      }
    },
  });

  const { data: similarJobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/jobs", jobId, "similar"],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/similar`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && !!jobId,
  });


  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      const k = n / 1000;
      return k % 1 === 0 ? `$${k.toFixed(0)}K` : `$${k.toFixed(1)}K`;
    };
    if (min && max) return `${fmt(min)} \u2013 ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job?.salaryMin, job?.salaryMax);
  const postedLabel = getPostedDateLabel(job?.postedDate);
  const locationTypeLabel = job ? getLocationTypeLabel(job) : null;

  const handleApplyClick = async () => {
    if (!job) return;
    trackNow({
      eventType: "apply_click",
      entityType: "job",
      entityId: String(job.id),
      metadata: {
        company: job.company,
        roleCategory: job.roleCategory,
        title: job.title,
      },
    });
    try {
      await apiRequest("POST", `/api/jobs/${job.id}/apply-click`);
    } catch (e) {
      console.error("Failed to track apply click", e);
    }
    window.open(job.applyUrl, "_blank");
    if (!isPro) {
      setShowApplyNudge(true);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading job details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => setLocation("/jobs")} data-testid="button-back-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5" data-testid="button-back-jobs">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        {/* === HEADER === */}
        <div className="mb-6" ref={applyButtonRef}>
          <h1
            className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight leading-tight"
            data-testid="text-job-detail-title"
          >
            {cleanStructuredText(job.title)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground mt-3">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground/80" data-testid="text-job-detail-company">{cleanStructuredText(job.company)}</span>
            </span>
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-job-detail-location">{cleanStructuredText(job.location)}</span>
              </span>
            )}
            {locationTypeLabel && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-job-detail-location-type">{locationTypeLabel}</span>
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-salary">{salary}</span>
              </span>
            )}
            {job.seniorityLevel && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-level">{job.seniorityLevel}</span>
              </span>
            )}
            {postedLabel && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span data-testid="text-posted-date">{postedLabel}</span>
              </span>
            )}
          </div>

          {(job.roleCategory || job.roleSubcategory || (job.legalRelevanceScore && job.legalRelevanceScore >= 8)) && (
            <div className="flex flex-wrap gap-1.5 mt-3" data-testid="section-job-badges">
              {job.roleCategory && (
                <Badge
                  variant="outline"
                  className="gap-1"
                  data-testid="badge-role-category"
                >
                  <Briefcase className="h-3 w-3" />
                  {cleanStructuredText(job.roleCategory)}
                </Badge>
              )}
              {job.roleSubcategory && (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs"
                  data-testid="badge-role-subcategory"
                >
                  {cleanStructuredText(job.roleSubcategory)}
                </Badge>
              )}
              {job.legalRelevanceScore && job.legalRelevanceScore >= 8 && (
                <Badge
                  variant="secondary"
                  className={`gap-1 ${
                    job.legalRelevanceScore >= 9
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800"
                  }`}
                  data-testid="badge-legal-fit"
                >
                  <Scale className="h-3 w-3" />
                  {job.legalRelevanceScore >= 9 ? "JD Preferred" : "Legal Background Valued"}
                </Badge>
              )}
            </div>
          )}

          {job.keySkills && job.keySkills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2" data-testid="section-key-skills">
              {job.keySkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs"
                  data-testid={`badge-skill-${i}`}
                >
                  {cleanStructuredText(skill)}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={handleApplyClick}
              className="gap-2"
              data-testid="button-apply-top"
            >
              <ExternalLink className="h-4 w-4" />
              Apply Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveJobMutation.mutate()}
              disabled={saveJobMutation.isPending}
              data-testid="button-save-job-detail"
              className={`gap-1.5 ${jobIsSaved ? "text-primary" : ""}`}
            >
              <Bookmark className={`h-4 w-4 ${jobIsSaved ? "fill-current" : ""}`} />
              {jobIsSaved ? "Saved" : "Save"}
            </Button>
          </div>

          <AnimatePresence>
            {showApplyNudge && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3"
                data-testid="section-apply-nudge"
              >
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                      <Target className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Stand out from other applicants</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pro members can match their resume to this role and get personalized tips to improve their chances.
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Link href="/pricing">
                          <Button size="sm" className="gap-1.5 text-xs" data-testid="button-apply-nudge-upgrade">
                            <Crown className="h-3 w-3" />
                            Upgrade to Pro — $5/mo
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => setShowApplyNudge(false)}
                          data-testid="button-apply-nudge-dismiss"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* === UNIFIED JOB DETAILS CARD === */}
        <Card className="mb-6" data-testid="section-job-details">
          <CardContent className="p-5 sm:p-6">
            {job.aiSummary && (
              <div data-testid="section-ai-summary" className="mb-6">
                <div className="rounded-md bg-muted/50 border border-border/30 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="heading-ai-summary">
                      At a Glance
                    </span>
                  </div>
                  <p className="text-[0.925rem] text-foreground/80 leading-[1.75]" data-testid="text-ai-summary">
                    {cleanStructuredText(job.aiSummary)}
                  </p>
                </div>
              </div>
            )}

            {(() => {
              const structured = parseStructuredDescription(job.structuredDescription);
              if (structured) {
                return (
                  <div data-testid="section-full-description">
                    <StructuredDescriptionView data={structured} />
                  </div>
                );
              }
              if (job.description) {
                return (
                  <div data-testid="section-full-description">
                    <DescriptionContent text={job.description} testId="text-job-description" isPro={isPro} />
                    {job.requirements && (
                      <div className="mt-8 pt-6 border-t border-border/40">
                        <DescriptionContent text={job.requirements} testId="text-job-requirements" isPro={isPro} />
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            {resumeFit && resumeFit.length > 0 && (
              <div data-testid="section-resume-fit" className="mt-6 pt-6 border-t border-border/40">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resume Fit</h3>
                <div className="space-y-2.5">
                  {resumeFit.map((rf) => (
                    <div
                      key={rf.resumeId}
                      className="rounded-md border border-border/40 p-3"
                      data-testid={`resume-fit-${rf.resumeId}`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{rf.label}</span>
                          {rf.isPrimary && (
                            <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            rf.score >= 60 ? "text-green-600 dark:text-green-400" :
                            rf.score >= 30 ? "text-amber-600 dark:text-amber-400" :
                            "text-muted-foreground"
                          }`}>
                            {rf.score}% match
                          </span>
                        </div>
                      </div>
                      <Progress value={rf.score} className="h-1.5 mb-2" />
                      <div className="flex flex-wrap gap-1">
                        {rf.matched.map((s, i) => (
                          <Badge key={`m-${i}`} variant="outline" className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40 gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {s}
                          </Badge>
                        ))}
                        {rf.missing.map((s, i) => (
                          <Badge key={`g-${i}`} variant="outline" className="text-[10px] text-muted-foreground gap-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!resumeFit && !isPro && userResumes.length > 0 && job?.keySkills && job.keySkills.length > 0 && (
              <div data-testid="section-resume-match-teaser" className="mt-6 pt-6 border-t border-border/40">
                <div className="rounded-md border border-border/40 p-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 pointer-events-none z-10" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resume Fit</h3>
                  <div className="rounded-md border border-border/30 p-3 opacity-60">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Your Resume</span>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground">??% match</span>
                    </div>
                    <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-muted-foreground/20 rounded-full w-3/5" />
                    </div>
                  </div>
                  <div className="relative z-20 text-center mt-3">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <Lock className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-foreground">See how you match this role</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Pro members get match scores, gap analysis, and personalized recommendations.
                    </p>
                    <Link href="/pricing">
                      <Button size="sm" className="gap-1.5 text-xs" data-testid="button-resume-match-upgrade">
                        <Crown className="h-3 w-3" />
                        Unlock with Pro
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {!resumeFit && userResumes.length === 0 && job?.keySkills && job.keySkills.length > 0 && (
              <div data-testid="section-resume-cta" className="mt-6 pt-6 border-t border-border/40">
                <div className="rounded-md border border-dashed border-border/50 p-4 text-center">
                  <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upload a resume to see how well you match this role</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => setLocation("/resumes")} data-testid="button-upload-resume-cta">
                    <FileText className="h-3.5 w-3.5" />
                    Upload Resume
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-border/40 mt-7 pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/resume-builder?jobId=${job.id}`)}
                data-testid="button-optimize-resume"
                className="gap-1.5"
              >
                <FileText className="h-4 w-4" />
                Tailor Your Resume for This Role
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* === QUESTIONS === */}
        <div className="mb-8">
          <JobChat jobId={jobId || ""} />
        </div>

        {/* === SIMILAR ROLES === */}
        {similarJobs.length > 0 && (
          <div className="mb-8" data-testid="section-similar-jobs">
            <h2 className="text-lg font-serif font-medium text-foreground mb-4 tracking-tight">Similar Roles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {similarJobs.map(sj => {
                const sjSalary = formatSalary(sj.salaryMin, sj.salaryMax);
                const sjLegalFit = sj.legalRelevanceScore && sj.legalRelevanceScore >= 8;
                return (
                  <Link key={sj.id} href={`/jobs/${sj.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-similar-job-${sj.id}`}>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2" data-testid={`text-similar-title-${sj.id}`}>
                          {cleanStructuredText(sj.title)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {cleanStructuredText(sj.company)}
                          </span>
                          {sj.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cleanStructuredText(sj.location)}
                            </span>
                          )}
                          {sjSalary && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <DollarSign className="h-3 w-3" />
                              {sjSalary}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sjLegalFit && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              <Scale className="h-2.5 w-2.5" />
                              Legal Fit
                            </Badge>
                          )}
                          {sj.seniorityLevel && (
                            <Badge variant="outline" className="text-[10px]">{sj.seniorityLevel}</Badge>
                          )}
                          {sj.keySkills && sj.keySkills.slice(0, 3).map((skill, si) => (
                            <Badge key={si} variant="outline" className="text-[10px]">
                              {cleanStructuredText(skill)}
                            </Badge>
                          ))}
                          {sj.keySkills && sj.keySkills.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{sj.keySkills.length - 3}</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* === STICKY APPLY BAR === */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg sm:top-14 sm:bottom-auto"
            data-testid="sticky-apply-bar"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 hidden sm:block">
                <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground truncate">{job.company}</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveJobMutation.mutate()}
                  disabled={saveJobMutation.isPending}
                  className={`gap-1.5 ${jobIsSaved ? "text-primary" : ""}`}
                  data-testid="button-save-sticky"
                >
                  <Bookmark className={`h-4 w-4 ${jobIsSaved ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">{jobIsSaved ? "Saved" : "Save"}</span>
                </Button>
                <Button
                  onClick={handleApplyClick}
                  className="gap-2 flex-1 sm:flex-none"
                  data-testid="button-apply-sticky"
                >
                  <ExternalLink className="h-4 w-4" />
                  Apply Now
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
