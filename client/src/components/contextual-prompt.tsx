import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePersona, type UserPersona } from "@/hooks/use-persona";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";

interface ContextualPromptProps {
  pageContext: "search" | "resumes" | "career-advisor" | "alerts" | "insights" | "job-detail";
  jobId?: string | number;
  searchQuery?: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function getPromptChips(
  context: string,
  persona: UserPersona | null,
  hasPersona: boolean,
  searchQuery?: string,
): { label: string }[] {
  const chips: { label: string }[] = [];
  const categories = (persona?.topCategories as string[]) || [];
  const locations = (persona?.preferredLocations as string[]) || [];

  switch (context) {
    case "search":
      if (searchQuery) {
        chips.push({ label: `Why these results for "${searchQuery.slice(0, 30)}"?` });
      }
      if (hasPersona && categories.length) {
        chips.push({ label: `What ${categories[0]} roles are growing fastest?` });
      }
      chips.push({ label: "Help me narrow my search" });
      if (hasPersona && locations.length) {
        chips.push({ label: `What's the market like in ${locations[0]}?` });
      }
      break;

    case "resumes":
      chips.push({ label: "How strong is my resume for legal tech?" });
      if (hasPersona && categories.length) {
        chips.push({ label: `Tailor tips for ${categories[0]} roles` });
      }
      chips.push({ label: "What skills should I highlight?" });
      break;

    case "career-advisor":
      if (hasPersona && categories.length >= 2) {
        chips.push({ label: `${categories[0]} vs ${categories[1]} - which path?` });
      }
      chips.push({ label: "What should I consider when comparing roles?" });
      chips.push({ label: "How to evaluate company culture fit?" });
      break;

    case "alerts":
      if (hasPersona && categories.length) {
        chips.push({ label: `Best alert setup for ${categories[0]}?` });
      }
      chips.push({ label: "What criteria matter most for alerts?" });
      chips.push({ label: "How often do new legal tech jobs appear?" });
      break;

    case "insights":
      chips.push({ label: "What sectors are hiring the most?" });
      if (hasPersona && categories.length) {
        chips.push({ label: `Salary trends for ${categories[0]}?` });
      }
      chips.push({ label: "Remote vs in-office hiring trends" });
      break;

    case "job-detail":
      chips.push({ label: "Break down this job in plain language" });
      chips.push({ label: "What would a typical day look like?" });
      if (hasPersona) {
        chips.push({ label: "How does this fit my interests?" });
      }
      break;
  }

  return chips.slice(0, 3);
}

function formatInlineMarkdown(text: string) {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={`b-${i++}`} className="font-semibold">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

function formatBlock(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.trim().startsWith("- ")) {
      return (
        <div key={i} className="flex gap-2 pl-2 py-0.5">
          <span className="text-muted-foreground shrink-0">&bull;</span>
          <span>{formatInlineMarkdown(line.trim().slice(2))}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return <p key={i} className="leading-relaxed">{formatInlineMarkdown(line)}</p>;
  });
}

export function ContextualPrompt({ pageContext, jobId, searchQuery, className = "" }: ContextualPromptProps) {
  const { isAuthenticated } = useAuth();
  const { persona, hasPersona } = usePersona();
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  if (!isAuthenticated) return null;

  const chips = getPromptChips(pageContext, persona, hasPersona, searchQuery);

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    if (!expanded) setExpanded(true);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const context: Record<string, any> = {};
      if (jobId) context.jobId = String(jobId);

      const res = await apiRequest("POST", "/api/assistant/chat", { message: msgText, history, context });
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const contextTitles: Record<string, string> = {
    search: "Search Assistant",
    resumes: "Resume Advisor",
    "career-advisor": "Career Guide",
    alerts: "Alert Advisor",
    insights: "Market Analyst",
    "job-detail": "Job Advisor",
  };

  return (
    <Card className={`overflow-visible ${className}`} data-testid={`contextual-prompt-${pageContext}`}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-contextual-${pageContext}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {contextTitles[pageContext] || "Assistant"}
          </span>
          {hasPersona && (
            <Badge variant="secondary" className="text-xs shrink-0">Personalized</Badge>
          )}
        </div>
        <Button size="icon" variant="ghost">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {!expanded && chips.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Badge
              key={chip.label}
              variant="outline"
              className="cursor-pointer text-xs"
              onClick={() => sendMessage(chip.label)}
              data-testid={`chip-${chip.label.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
            >
              {chip.label}
            </Badge>
          ))}
        </div>
      )}

      {expanded && (
        <div className="border-t">
          <div ref={scrollRef} className="max-h-[300px] overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <Badge
                    key={chip.label}
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => sendMessage(chip.label)}
                    data-testid={`chip-expanded-${chip.label.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    {chip.label}
                  </Badge>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`contextual-message-${msg.role}-${msg.id}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-1">{formatBlock(msg.content)}</div>
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

          <div className="border-t px-3 py-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[80px] py-2"
                style={{ height: "36px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "36px";
                  target.style.height = Math.min(target.scrollHeight, 80) + "px";
                }}
                data-testid={`input-contextual-${pageContext}`}
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                data-testid={`button-send-contextual-${pageContext}`}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
