import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useParams } from "wouter";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/animations";
import { apiRequest } from "@/lib/queryClient";
import type { Event, EventSpeaker } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  Globe,
  Video,
  DollarSign,
  GraduationCap,
  ExternalLink,
  Users,
  Share2,
  Tag,
  AlertCircle,
} from "lucide-react";

const EVENT_TYPE_STYLES: Record<string, string> = {
  conference: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
  seminar: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  webinar: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
  workshop: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  cle: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  networking: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400",
  hackathon: "bg-pink-500/10 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
  panel: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  seminar: "Seminar",
  webinar: "Webinar",
  workshop: "Workshop",
  cle: "CLE",
  networking: "Networking",
  hackathon: "Hackathon",
  panel: "Panel",
};

const ATTENDANCE_ICONS: Record<string, typeof Building2> = {
  "in-person": Building2,
  virtual: Video,
  hybrid: Globe,
};

function formatEventDate(startDate: string | Date, endDate?: string | Date | null): string {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  if (!endDate) {
    return start.toLocaleDateString("en-US", options);
  }

  const end = new Date(endDate);
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-US", options);
  }

  const shortOpts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", shortOpts)} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", shortOpts)} - ${end.toLocaleDateString("en-US", options)}`;
}

function EventDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-56" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { track } = useActivityTracker();

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["/api/events", id],
    enabled: !!id,
  });

  usePageTitle(event?.title ? event.title : "Event Details");

  useEffect(() => {
    if (id) {
      track({ eventType: "page_view", pagePath: `/events/${id}` });
      track({ eventType: "event_view", entityType: "event", entityId: id, pagePath: `/events/${id}` });
    }
  }, [id]);

  const handleRegisterClick = () => {
    if (!event?.registrationUrl) return;
    window.open(event.registrationUrl, "_blank", "noopener,noreferrer");
    apiRequest("POST", `/api/events/${event.id}/register-click`).catch(() => {});
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Event link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Share",
        description: url,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <EventDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4" data-testid="event-not-found">
            <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Event not found</h2>
            <p className="text-sm text-muted-foreground">
              This event may have been removed or doesn't exist.
            </p>
            <Link href="/events">
              <Button variant="outline" data-testid="button-back-to-events">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const AttendanceIcon = ATTENDANCE_ICONS[event.attendanceType] || Globe;
  const speakers = (event.speakers as EventSpeaker[] | null) || [];
  const topics = event.topics || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <ScrollReveal>
            <Link href="/events">
              <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Events
              </Button>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge
                  variant="secondary"
                  className={`no-default-hover-elevate no-default-active-elevate ${EVENT_TYPE_STYLES[event.eventType] || ""}`}
                  data-testid="badge-event-type"
                >
                  {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                </Badge>
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-attendance">
                  <AttendanceIcon className="h-3 w-3 mr-1" />
                  {event.attendanceType === "in-person"
                    ? "In-Person"
                    : event.attendanceType.charAt(0).toUpperCase() + event.attendanceType.slice(1)}
                </Badge>
                {event.isFree && (
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" data-testid="badge-free">
                    Free
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground leading-tight mb-3 tracking-tight" data-testid="text-event-title">
                {event.title}
              </h1>

              <p className="text-muted-foreground font-medium" data-testid="text-organizer">
                Hosted by {event.organizer}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Card className="mb-6" data-testid="card-event-details">
              <CardContent className="p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Date</p>
                      <p className="text-sm text-foreground" data-testid="text-date">
                        {formatEventDate(event.startDate, event.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Location</p>
                      <p className="text-sm text-foreground" data-testid="text-location">
                        {event.attendanceType === "virtual" ? "Online" : event.location || "TBD"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Cost</p>
                      <p className="text-sm text-foreground" data-testid="text-cost">
                        {event.isFree ? "Free" : event.cost || "See registration page"}
                      </p>
                    </div>
                  </div>

                  {event.cleCredits && (
                    <div className="flex items-start gap-3">
                      <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">CLE Credits</p>
                        <p className="text-sm text-foreground" data-testid="text-cle">
                          {event.cleCredits}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="flex flex-wrap gap-3 mb-6">
              {(event as any).linkStatus === "broken" ? (
                <Button variant="secondary" disabled data-testid="button-register">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Registration link unavailable
                </Button>
              ) : (
                <Button onClick={handleRegisterClick} data-testid="button-register">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Register
                </Button>
              )}
              <Button variant="outline" onClick={handleShare} data-testid="button-share">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            {(event as any).linkStatus === "broken" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5" data-testid="text-broken-link-notice">
                <AlertCircle className="h-3 w-3 shrink-0" />
                The registration link for this event could not be verified. Try searching for the event directly on the organizer's website.
              </p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-2" data-testid="text-event-disclaimer">
              Event details are sourced from public information and may change. Please verify directly with the organizer before registering.
            </p>
          </ScrollReveal>

          {event.description && (
            <ScrollReveal delay={0.2}>
              <Card className="mb-6" data-testid="card-description">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">About this Event</h2>
                  <div className="text-[0.925rem] text-foreground/80 leading-[1.7] whitespace-pre-wrap" data-testid="text-description">
                    {event.description}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {topics.length > 0 && (
            <ScrollReveal delay={0.25}>
              <Card className="mb-6" data-testid="card-topics">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Topics</h2>
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="no-default-hover-elevate no-default-active-elevate"
                        data-testid={`badge-topic-${i}`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {speakers.length > 0 && (
            <ScrollReveal delay={0.3}>
              <Card className="mb-6" data-testid="card-speakers">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    <Users className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
                    Speakers
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {speakers.map((speaker, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-0.5 p-3 rounded-md bg-muted/30"
                        data-testid={`speaker-${i}`}
                      >
                        <span className="text-sm font-medium text-foreground">{speaker.name}</span>
                        {speaker.title && (
                          <span className="text-xs text-muted-foreground">{speaker.title}</span>
                        )}
                        {speaker.organization && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {speaker.organization}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
