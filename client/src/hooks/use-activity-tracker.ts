import { useCallback, useRef, useEffect } from "react";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

interface ActivityEvent {
  eventType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  pagePath?: string;
}

const SESSION_KEY = "ltc_session_id";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function useActivityTracker() {
  const { isAuthenticated } = useAuth();
  const queueRef = useRef<ActivityEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!isAuthenticated || queueRef.current.length === 0) return;
    const events = queueRef.current.splice(0, queueRef.current.length);
    const sessionId = getSessionId();

    try {
      await apiRequest("POST", "/api/activities", {
        events: events.map(e => ({ ...e, sessionId })),
      });
    } catch {
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flush();
    };
  }, [flush]);

  const track = useCallback((event: ActivityEvent) => {
    if (!isAuthenticated) return;

    queueRef.current.push({
      ...event,
      pagePath: event.pagePath || window.location.pathname,
    });

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flush, 2000);
  }, [isAuthenticated, flush]);

  const trackNow = useCallback(async (event: ActivityEvent) => {
    if (!isAuthenticated) return;
    const sessionId = getSessionId();

    try {
      await apiRequest("POST", "/api/activities", {
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        pagePath: event.pagePath || window.location.pathname,
        sessionId,
      });
    } catch {
    }
  }, [isAuthenticated]);

  return { track, trackNow };
}
