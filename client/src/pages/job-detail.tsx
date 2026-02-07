import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation, useParams } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "@/components/animations";
import { useAuth } from "@/hooks/use-auth";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Job } from "@shared/schema";
import { Link } from "wouter";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Building2,
  Briefcase,
  DollarSign,
  Loader2,
  CheckCircle2,
  MessageCircle,
  Send,
  FileText,
  Bookmark,
  Mail,
  Upload,
} from "lucide-react";

function extractContactEmails(text: string | null | undefined): string[] {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  const noReplyPatterns = /^(no-?reply|donotreply|unsubscribe|notifications?|mailer|bounce|auto|system|info@greenhouse|privacy@|legal@|compliance@)/i;
  const imagePatterns = /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i;
  const filtered = matches.filter(email => {
    if (noReplyPatterns.test(email)) return false;
    if (imagePatterns.test(email)) return false;
    if (email.includes('example.com')) return false;
    return true;
  });
  return [...new Set(filtered)];
}

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

const SECTION_HEADING_PATTERNS = [
  /(?:About (?:the |your |this )?(?:role|position|opportunity|company|team|us|job))/i,
  /(?:About [A-Z][A-Za-z\s&.'()-]+?)(?=\s(?:We|Our|The|Founded|is a|is the|was|has been))/,
  /(?:What you(?:'ll| will) (?:do|need|bring|be doing|work on))/i,
  /(?:What we(?:'re| are) (?:looking for|seeking|offering))/i,
  /(?:What we offer)/i,
  /(?:How you will [\w\s]+)/i,
  /(?:Why (?:join us|work (?:here|with us|at)))/i,
  /(?:(?:Key |Core )?(?:Responsibilities|Qualifications|Requirements|Skills|Competencies|Duties))/i,
  /(?:(?:Required|Preferred|Minimum|Desired|Basic|Nice.to.have) (?:Qualifications|Skills|Experience|Requirements))/i,
  /(?:(?:Benefits|Perks|Compensation|Salary|Pay)(?: (?:and|&) (?:Benefits|Perks|Compensation))?)/i,
  /(?:(?:Job |Position |Role )?(?:Summary|Overview|Description|Highlights))/i,
  /(?:Who (?:you are|we are|you'll work with))/i,
  /(?:(?:Your |Day.to.day |Daily )?(?:Impact|Responsibilities|Tasks))/i,
  /(?:(?:Equal |EEO |EOE )(?:Opportunity|Employment)[\w\s]*)/i,
  /(?:(?:Our |The )?(?:Mission|Vision|Culture|Values|Team))/i,
  /(?:(?:Education|Experience|Background)(?: (?:Requirements|Required))?)/i,
  /(?:In this role(?:,? you))/i,
  /(?:(?:Apply|How to apply|Application process|To apply))/i,
];

function splitFlatTextIntoSections(text: string): string[] {
  const markers: { index: number; match: string }[] = [];

  for (const pattern of SECTION_HEADING_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
    let m;
    while ((m = global.exec(text)) !== null) {
      if (m.index === 0 || /[.!?]\s*$/.test(text.slice(Math.max(0, m.index - 3), m.index)) || m.index < 3) {
        markers.push({ index: m.index, match: m[0] });
      }
    }
  }

  markers.sort((a, b) => a.index - b.index);

  const unique: typeof markers = [];
  for (const mk of markers) {
    if (unique.length === 0 || mk.index - unique[unique.length - 1].index > 5) {
      unique.push(mk);
    }
  }

  if (unique.length === 0) return [text];

  const chunks: string[] = [];
  if (unique[0].index > 0) {
    chunks.push(text.slice(0, unique[0].index).trim());
  }
  for (let i = 0; i < unique.length; i++) {
    const start = unique[i].index;
    const end = i + 1 < unique.length ? unique[i + 1].index : text.length;
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

function extractHeadingFromSection(section: string): { heading: string; body: string } | null {
  for (const pattern of SECTION_HEADING_PATTERNS) {
    const m = section.match(pattern);
    if (m && section.startsWith(m[0])) {
      let heading = m[0].trim();
      let body = section.slice(heading.length).trim();
      if (heading.endsWith(':')) heading = heading.slice(0, -1).trim();
      const colonEnd = body.match(/^:?\s*/);
      if (colonEnd) body = body.slice(colonEnd[0].length);
      return { heading, body };
    }
  }
  return null;
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let buffer = '';
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (buffer) {
      if (buffer.length < 40 && !buffer.match(/[.!?]$/)) {
        buffer += ' ' + trimmed;
        continue;
      }
      sentences.push(buffer);
      buffer = '';
    }
    buffer = trimmed;
  }
  if (buffer) sentences.push(buffer);
  return sentences;
}

type Block = { type: 'paragraph' | 'heading' | 'bullet'; content: string };

function parseTextIntoBlocks(text: string): Block[] {
  const newlineCount = (text.match(/\n/g) || []).length;
  const hasNewlines = newlineCount > 3;

  if (hasNewlines) {
    return parseNewlinedText(text);
  }
  return parseFlatText(text);
}

function parseNewlinedText(text: string): Block[] {
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

function parseFlatText(text: string): Block[] {
  const sections = splitFlatTextIntoSections(text);
  const blocks: Block[] = [];

  for (const section of sections) {
    const extracted = extractHeadingFromSection(section);
    if (extracted) {
      blocks.push({ type: 'heading', content: extracted.heading });
      if (extracted.body) {
        const sentences = splitSentences(extracted.body);
        if (sentences.length > 3) {
          for (const s of sentences) {
            blocks.push({ type: 'bullet', content: s });
          }
        } else {
          blocks.push({ type: 'paragraph', content: extracted.body });
        }
      }
    } else {
      const sentences = splitSentences(section);
      if (sentences.length > 5) {
        blocks.push({ type: 'paragraph', content: sentences.slice(0, 2).join(' ') });
        for (let i = 2; i < sentences.length; i++) {
          blocks.push({ type: 'bullet', content: sentences[i] });
        }
      } else {
        blocks.push({ type: 'paragraph', content: section });
      }
    }
  }
  return blocks;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C').replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018').replace(/&rsquo;/g, '\u2019')
    .replace(/&bull;/g, '\u2022').replace(/&hellip;/g, '\u2026')
    .replace(/&trade;/g, '\u2122').replace(/&copy;/g, '\u00A9').replace(/&reg;/g, '\u00AE')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripHtmlToText(html: string): string {
  let text = decodeHtmlEntities(html);
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
  text = text.replace(/<(?:p|div|h[1-6]|ul|ol|table|tbody|thead|section|article)(?:\s[^>]*)?>/gi, '\n');
  text = text.replace(/<li(?:\s[^>]*)?>/gi, '- ');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&[a-z]+;/gi, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function stripBoilerplate(text: string): string {
  let cleaned = text;

  cleaned = cleaned.replace(/^[A-Z][\w\s&.'()-]{2,60} is committed to providing an excellent candidate experience[^\n]*\.\s*\n*/i, '');

  cleaned = cleaned.replace(/^Summary:\s*/i, '');

  cleaned = cleaned.replace(/^ABOUT\s+(?:US|THE COMPANY|THE JOB|FIRSTBASE|NOTABENE)\s*/i, '');
  cleaned = cleaned.replace(/^About\s+(?:the company|us|the job|Axiom|Rocket Lawyer|the role)\s*:?\s*/i, '');
  cleaned = cleaned.replace(/^About\s+[\w\s&.'()-]{2,30}\s+(?:We\s)/i, 'We ');
  cleaned = cleaned.replace(/^(?:Intro description|Job Description|Role Description|Position Description)\s*:?\s*/i, '');

  const companyIntroWithSeparator = /^(?:[\w\s&.'()-]{2,50})\s+(?:is|are)\s+(?:a|an|the|on a|where|building)\s+[^]*?\n\n/;
  const introSepMatch = cleaned.match(companyIntroWithSeparator);
  if (introSepMatch && introSepMatch[0].length < cleaned.length * 0.35) {
    const afterIntro = cleaned.slice(introSepMatch[0].length).trim();
    if (afterIntro.length > 100) {
      cleaned = afterIntro;
    }
  }

  cleaned = cleaned.replace(/^(?:The Opportunity|The Role|Overview|Position Summary|Job Summary|Role Summary|Position Overview)\s*:?\s*\n*/i, '');

  const trailingPatterns = [
    /\n*(?:Equal\s+(?:Opportunity|Employment)|EEO|EOE)\s*(?:Statement|Employer|Policy)?[^\n]*(?:\n[^\n]*){0,10}$/i,
    /\n*(?:We are (?:an?|committed to being an?) (?:equal opportunity|EEO) employer)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*(?:Disclaimer|Notice|Legal Notice):?\s*(?:This job (?:posting|description|ad))[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*(?:This (?:employer|company|organization) is an equal opportunity employer)[^\n]*/i,
    /\n*(?:[\w\s&.'()-]{2,50} is an? (?:equal opportunity|affirmative action) employer)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*(?:[\w\s&.'()-]{2,50} provides equal employment)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*We pride ourselves on having a diverse workforce[^\n]*(?:\n[^\n]*){0,8}$/i,
    /\n*We collect and process the personal information[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*We use Covey as part of our[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*When preparing to engage with[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*(?:Pursue Truth While Finding Yours|Find Your Truth)[^\n]*(?:\n[^\n]*){0,15}$/i,
    /\n*[\u200B\s]*About [\w\s&.'()-]{2,40}\n+We help[^\n]*(?:\n[^\n]*){0,15}$/i,
    /\n*(?:By applying for this role, you acknowledge)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n*(?:Your privacy is important to us)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n*(?:Individuals with Disabilities|Reasonable Accommodation)[^\n]*(?:\n[^\n]*){0,5}$/i,
    /\n*(?:To learn more, visit:?\s*everify\.com)[^\n]*(?:\n[^\n]*){0,3}$/i,
    /\n*(?:NetDocuments believes diversity)[^\n]*(?:\n[^\n]*){0,3}$/i,
  ];
  for (const p of trailingPatterns) {
    cleaned = cleaned.replace(p, '');
  }

  cleaned = cleaned.replace(/\n*-\s*#LI-\w+\s*/g, '');
  cleaned = cleaned.replace(/#LI-(?:Remote|Hybrid|Onsite|DNI|\w+)\s*/g, '');

  cleaned = cleaned.replace(/\n*-?\s*Find out more about our Benefits and Perks\s*\n*/gi, '\n');

  return cleaned.trim();
}

function cleanDescription(text: string): string {
  let cleaned = text;
  if (cleaned.includes('&lt;') || cleaned.includes('&gt;') || cleaned.includes('&amp;') || /<[a-z][^>]*>/i.test(cleaned)) {
    cleaned = stripHtmlToText(cleaned);
  }
  let prev = '';
  let iterations = 0;
  while (prev !== cleaned && iterations < 5) {
    prev = cleaned;
    cleaned = stripBoilerplate(cleaned);
    iterations++;
  }
  return cleaned;
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

function DescriptionContent({ text, testId }: { text?: string | null; testId: string }) {
  if (!text) return null;

  const blocks = parseTextIntoBlocks(cleanDescription(text));

  return (
    <div className="max-w-none text-foreground leading-relaxed space-y-2" data-testid={testId}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="font-medium text-foreground pt-3 first:pt-0">
              {linkifyEmails(block.content)}
            </p>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={i} className="flex gap-2 pl-1 py-0.5">
              <span className="text-muted-foreground shrink-0">&#8226;</span>
              <span>{linkifyEmails(block.content)}</span>
            </div>
          );
        }
        return <p key={i}>{linkifyEmails(block.content)}</p>;
      })}
    </div>
  );
}

function cleanSummary(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(?:As (?:an?|the) [\w\s,/()-]+? at [\w\s&.'()-]+?,\s*(?:you(?:'ll| will)\s*)?)/i, '');
  if (cleaned.length < 20) return text.trim();
  if (cleaned.length > 0 && cleaned[0] !== cleaned[0].toUpperCase()) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function SummaryContent({ text, testId }: { text: string; testId: string }) {
  const cleaned = cleanSummary(text);
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  if (sentences.length <= 2) {
    return (
      <p className="text-foreground leading-relaxed" data-testid={testId}>
        {cleaned}
      </p>
    );
  }

  return (
    <div className="space-y-2 text-foreground leading-relaxed" data-testid={testId}>
      <p>{sentences[0]}</p>
      <div className="space-y-1.5">
        {sentences.slice(1).map((s, i) => (
          <div key={i} className="flex gap-2 pl-1">
            <span className="text-muted-foreground shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
            <span>{s}</span>
          </div>
        ))}
      </div>
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
  "What does this role actually involve day-to-day?",
  "Would this be a good fit for a lawyer?",
  "Explain the requirements in simple terms",
  "What skills do I need for this?",
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
    <Card>
      <CardContent className="pt-5 pb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ask About This Job
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Have a question about this role? Ask below and get a plain-language answer.
        </p>

        <div ref={scrollRef} className="max-h-64 overflow-y-auto space-y-2 mb-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {JOB_QUESTION_CHIPS.map((q) => (
                <Badge
                  key={q}
                  variant="outline"
                  onClick={() => sendMessage(q)}
                  className="cursor-pointer text-xs"
                  data-testid={`button-job-chip-${q.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {q}
                </Badge>
              ))}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${
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
            placeholder="Ask a question about this job..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[32px] max-h-[64px] py-1.5 border-b border-border focus:border-foreground transition-colors"
            style={{ height: "32px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "32px";
              t.style.height = Math.min(t.scrollHeight, 64) + "px";
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

export default function JobDetail() {
  usePageTitle("Job Details");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { trackNow } = useActivityTracker();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  useEffect(() => {
    if (jobId) trackNow({ eventType: "job_view", entityType: "job", entityId: jobId });
  }, [jobId]);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: isAuthenticated && !!jobId,
  });

  const { data: savedJobIds = [] } = useQuery<number[]>({
    queryKey: ["/api/saved-jobs/ids"],
    enabled: isAuthenticated,
  });

  const jobIsSaved = job ? savedJobIds.includes(job.id) : false;

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

  const { data: resumeData } = useQuery<{ hasResume: boolean }>({
    queryKey: ["/api/resume/check"],
    queryFn: async () => {
      const res = await fetch("/api/resume", { credentials: "include" });
      if (!res.ok) return { hasResume: false };
      const data = await res.json();
      return { hasResume: !!data?.resumeFilename };
    },
    enabled: isAuthenticated,
  });

  const handleApplyClick = async () => {
    if (!job) return;
    trackNow({ eventType: "apply_click", entityType: "job", entityId: String(job.id) });
    try {
      await apiRequest("POST", `/api/jobs/${job.id}/apply-click`);
    } catch (e) {
      console.error("Failed to track apply click", e);
    }
    window.open(job.applyUrl, "_blank");
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

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/jobs")}
          className="mb-6"
          data-testid="button-back-jobs"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>

        <ScrollReveal>
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  {job.companyLogo && (
                    <img
                      src={job.companyLogo}
                      alt={`${job.company} logo`}
                      className="w-12 h-12 rounded-lg object-contain bg-muted p-1"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div>
                    <h1
                      className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-tight"
                      data-testid="text-job-detail-title"
                    >
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium" data-testid="text-job-detail-company">{job.company}</span>
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span data-testid="text-job-detail-location">{job.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {job.seniorityLevel && (
                    <Badge variant="secondary" data-testid="badge-seniority">
                      {job.seniorityLevel}
                    </Badge>
                  )}
                  {job.roleCategory && (
                    <Badge variant="outline" data-testid="badge-category">
                      {job.roleCategory}
                    </Badge>
                  )}
                  {job.roleSubcategory && (
                    <Badge variant="outline" data-testid="badge-subcategory">
                      {job.roleSubcategory}
                    </Badge>
                  )}
                  {job.isRemote && (
                    <Badge variant="secondary">Remote</Badge>
                  )}
                  {job.roleType && (
                    <Badge variant="outline">{job.roleType}</Badge>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => saveJobMutation.mutate()}
                  disabled={saveJobMutation.isPending}
                  data-testid="button-save-job-detail"
                  className={jobIsSaved ? "text-primary" : "text-muted-foreground"}
                >
                  <Bookmark className={`h-5 w-5 ${jobIsSaved ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/resume-builder?jobId=${job.id}`)}
                  data-testid="button-optimize-resume"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Optimize Resume
                </Button>
                <Button
                  size="lg"
                  onClick={handleApplyClick}
                  data-testid="button-apply-detail"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <Card className="bg-muted/30 border-border/50 mb-6" data-testid="card-resume-match">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-background border border-border/60 flex items-center justify-center shrink-0">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground text-sm" data-testid="text-resume-match-title">See how well you match this role</h3>
                  <p className="text-xs text-muted-foreground" data-testid="text-resume-match-description">Upload your resume to get a personalized match score and gap analysis.</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation(`/resumes?jobId=${job.id}`)}
                data-testid="button-upload-resume-match"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Resume
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {job.aiSummary && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overview</h2>
                  <SummaryContent text={job.aiSummary} testId="text-job-summary" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-5 pb-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Full Description</h2>
                <DescriptionContent text={job.description} testId="text-job-description" />
              </CardContent>
            </Card>

            {job.requirements && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Requirements</h2>
                  <DescriptionContent text={job.requirements} testId="text-job-requirements" />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-5 pb-5 space-y-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h2>

                {salary && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Salary</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-salary">{salary}</p>
                    </div>
                  </div>
                )}

                {(job.experienceMin || job.experienceMax) && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Experience</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-experience">
                        {job.experienceMin && job.experienceMax
                          ? `${job.experienceMin}-${job.experienceMax} years`
                          : job.experienceMin
                          ? `${job.experienceMin}+ years`
                          : `Up to ${job.experienceMax} years`}
                      </p>
                    </div>
                  </div>
                )}

                {(() => {
                  const emails = extractContactEmails(
                    (job.description || '') + ' ' + (job.requirements || '')
                  );
                  if (emails.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                      </div>
                      {emails.map((email) => (
                        <a
                          key={email}
                          href={`mailto:${email}`}
                          className="flex items-center gap-2 pl-10 text-sm font-medium text-foreground hover:underline"
                          data-testid={`link-contact-email-${email.replace(/[@.]/g, '-')}`}
                        >
                          {email}
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  );
                })()}

              </CardContent>
            </Card>

            {job.keySkills && job.keySkills.length > 0 && (
              <Card>
                <CardContent className="pt-5 pb-5">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.keySkills.map((skill, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-skill-${i}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <JobChat jobId={jobId || ""} />
          </div>
        </div>

        {!resumeData?.hasResume && (
          <Card className="mt-6">
            <CardContent className="py-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-medium text-foreground text-sm" data-testid="text-resume-prompt-title">See how well you match this role</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upload your resume to get a personalized match score and gap analysis.</p>
              </div>
              <Button asChild data-testid="button-upload-resume-prompt">
                <Link href="/resumes">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {similarJobs.length > 0 && (
          <div className="mt-8" data-testid="section-similar-jobs">
            <h2 className="text-lg font-serif font-medium text-foreground mb-4 tracking-tight">Similar Roles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {similarJobs.map(sj => {
                const sjSalary = sj.salaryMin || sj.salaryMax
                  ? `${sj.salaryMin ? `$${(sj.salaryMin / 1000).toFixed(0)}K` : ''}${sj.salaryMin && sj.salaryMax ? ' - ' : ''}${sj.salaryMax ? `$${(sj.salaryMax / 1000).toFixed(0)}K` : ''}`
                  : null;
                return (
                  <Link key={sj.id} href={`/jobs/${sj.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-similar-job-${sj.id}`}>
                      <CardContent className="p-4">
                        <h3 className="font-medium text-foreground text-sm leading-snug truncate">{sj.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {sj.company}
                          </span>
                          {sj.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {sj.location}
                            </span>
                          )}
                          {sjSalary && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <DollarSign className="h-3 w-3" />
                              {sjSalary}
                            </span>
                          )}
                        </div>
                        {sj.seniorityLevel && (
                          <Badge variant="outline" className="mt-2 text-xs">{sj.seniorityLevel}</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}