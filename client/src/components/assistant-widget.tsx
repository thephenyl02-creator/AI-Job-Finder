import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { usePersona } from "@/hooks/use-persona";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  FileText,
  Briefcase,
  Sparkles,
  ArrowDown,
  TrendingUp,
  MapPin,
  Target,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function formatMarkdown(text: string) {
  const parts: (string | JSX.Element)[] = [];
  const lines = text.split("\n");
  let key = 0;

  for (const line of lines) {
    if (line.trim().startsWith("- ")) {
      parts.push(
        <div key={key++} className="flex gap-2 pl-2 py-0.5">
          <span className="text-muted-foreground shrink-0 mt-0.5">&bull;</span>
          <span>{renderInline(line.trim().slice(2), key)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      parts.push(<div key={key++} className="h-2" />);
    } else {
      parts.push(<p key={key++} className="leading-relaxed">{renderInline(line, key)}</p>);
    }
  }

  return parts;
}

function renderInline(text: string, parentKey: number) {
  const boldPattern = /\*\*(.*?)\*\*/g;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${parentKey}-b-${i++}`} className="font-semibold">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

const BASE_CHIPS = [
  { label: "What jobs match my skills?", icon: Sparkles, requiresResume: true },
  { label: "What does this role involve?", icon: Briefcase, requiresJob: true },
  { label: "How do I get started in legal tech?", icon: FileText, requiresResume: false },
];

export function AssistantWidget() {
  const { isAuthenticated } = useAuth();
  const { persona, hasPersona } = usePersona();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const jobIdMatch = location.match(/^\/jobs\/(\d+)/);
  const currentJobId = jobIdMatch ? jobIdMatch[1] : null;

  const { data: resumeStatus } = useQuery<{ hasResume: boolean }>({
    queryKey: ["/api/resume"],
    enabled: isAuthenticated,
  });

  const hasResume = resumeStatus?.hasResume || false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const dynamicChips = useMemo(() => {
    const chips = BASE_CHIPS.filter((chip) => {
      if (chip.requiresResume && !hasResume) return false;
      if (chip.requiresJob && !currentJobId) return false;
      return true;
    });

    if (hasPersona && persona) {
      const categories = persona.topCategories as string[] | undefined;
      const locations = persona.preferredLocations as string[] | undefined;
      const companies = persona.viewedCompanies as string[] | undefined;

      if (categories?.length) {
        chips.push({
          label: `What's trending in ${categories[0]}?`,
          icon: TrendingUp,
          requiresResume: false,
          requiresJob: false,
        } as any);
      }
      if (locations?.length && persona.remotePreference !== "strong") {
        chips.push({
          label: `Best opportunities in ${locations[0]}?`,
          icon: MapPin,
          requiresResume: false,
          requiresJob: false,
        } as any);
      }
      if (companies?.length && companies.length >= 2) {
        chips.push({
          label: `Compare ${companies[0]} vs ${companies[1]}`,
          icon: Target,
          requiresResume: false,
          requiresJob: false,
        } as any);
      }
      if (persona.remotePreference === "strong") {
        chips.push({
          label: "Best remote legal tech roles?",
          icon: MapPin,
          requiresResume: false,
          requiresJob: false,
        } as any);
      }
    }

    return chips.slice(0, 4);
  }, [hasPersona, persona, hasResume, currentJobId]);

  if (!isAuthenticated) return null;

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msgText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const context: Record<string, any> = {};
      if (currentJobId) context.jobId = currentJobId;

      const res = await apiRequest("POST", "/api/assistant/chat", {
        message: msgText,
        history,
        context,
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Sorry, I couldn't process that. Please try again.",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again in a moment.",
        },
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

  const contextLabel = currentJobId
    ? "Discussing this job"
    : hasPersona
    ? "Personalized"
    : hasResume
    ? "Resume loaded"
    : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="flex flex-col shadow-lg border overflow-visible" style={{ height: "500px", maxHeight: "calc(100vh - 8rem)" }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageCircle className="h-4 w-4 text-foreground shrink-0" />
                  <span className="font-semibold text-sm text-foreground truncate">Career Assistant</span>
                  {contextLabel && (
                    <Badge variant="secondary" className="text-xs shrink-0">{contextLabel}</Badge>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-assistant"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center text-center py-6 space-y-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {hasPersona ? "Welcome back. How can I help today?" : "How can I help?"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentJobId
                          ? "Ask me anything about this job posting. I'll explain it in plain language."
                          : hasPersona && persona?.personaSummary
                          ? "I know your interests and can give you personalized recommendations."
                          : hasResume
                          ? "Ask about jobs that match your resume, or anything about legal tech careers."
                          : "Ask about any job listing, career advice, or legal tech in general."}
                      </p>
                    </div>
                    {dynamicChips.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {dynamicChips.map((chip) => (
                          <Badge
                            key={chip.label}
                            variant="outline"
                            onClick={() => sendMessage(chip.label)}
                            className="cursor-pointer flex items-center gap-1.5 text-xs"
                            data-testid={`button-chip-${chip.label.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`}
                          >
                            <chip.icon className="h-3 w-3" />
                            {chip.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="space-y-1">{formatMarkdown(msg.content)}</div>
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
                    placeholder={
                      currentJobId
                        ? "Ask about this job..."
                        : "Ask me anything..."
                    }
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[36px] max-h-[80px] py-2"
                    style={{ height: "36px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "36px";
                      target.style.height = Math.min(target.scrollHeight, 80) + "px";
                    }}
                    data-testid="input-assistant-message"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    data-testid="button-send-assistant"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-4 right-4 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-12 w-12 shadow-lg"
          data-testid="button-open-assistant"
        >
          {isOpen ? (
            <ArrowDown className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </Button>
      </motion.div>
    </>
  );
}
