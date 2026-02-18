import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/animations";
import type { Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  MapPin,
  ExternalLink,
  GraduationCap,
  Video,
  Building2,
  Globe,
  DollarSign,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

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
    month: "short",
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

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", options)}`;
}

function EventCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardContent>
    </Card>
  );
}

function getRelativeTime(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Past";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.ceil(diffDays / 30);
  return `In ${months} month${months > 1 ? "s" : ""}`;
}

export default function Events() {
  usePageTitle("Events");
  const { track } = useActivityTracker();
  useEffect(() => { track({ eventType: "page_view", pagePath: "/events" }); }, []);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <ScrollReveal>
            <div className="mb-10">
              <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-3" data-testid="text-events-label">
                Stay connected
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-3 tracking-tight" data-testid="text-events-title">
                Upcoming events in legal tech
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl" data-testid="text-events-subtitle">
                Conferences, summits, and networking opportunities. A great way to meet people and learn what's happening in the industry.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 max-w-2xl" data-testid="text-events-disclaimer">
                Event details are sourced from public information and may change. Please verify dates, locations, and registration details directly with event organizers before making plans.
              </p>
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <ScrollReveal>
              <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
                <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No events yet</h3>
                <p className="text-sm text-muted-foreground">
                  Check back soon for new legal tech events and conferences.
                </p>
              </div>
            </ScrollReveal>
          ) : (() => {
            const now = new Date();
            const upcomingEvents = events.filter(e => new Date(e.startDate) >= now);
            const pastEvents = events.filter(e => new Date(e.startDate) < now);
            const allSorted = [...upcomingEvents, ...pastEvents];
            const displayEvents = allSorted;

            return (
            <div className="space-y-4">
              {displayEvents.map((event, index) => {
                const AttendanceIcon = ATTENDANCE_ICONS[event.attendanceType] || Globe;
                const topics = event.topics || [];
                const displayTopics = topics.slice(0, 4);
                const remainingTopics = topics.length - 4;
                const timeUntil = getRelativeTime(event.startDate);
                const isPast = timeUntil === "Past";
                const isSoon = timeUntil === "Today" || timeUntil === "Tomorrow" || timeUntil.startsWith("In") && parseInt(timeUntil.split(" ")[1]) <= 7;

                return (
                  <ScrollReveal key={event.id} delay={index * 0.05} direction="up">
                    <Card className={`hover-elevate ${isPast ? "opacity-60" : ""}`} data-testid={`card-event-${event.id}`}>
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="hidden sm:flex flex-col items-center justify-center w-16 shrink-0 text-center">
                            <span className="text-xs font-medium text-muted-foreground uppercase">
                              {new Date(event.startDate).toLocaleDateString("en-US", { month: "short" })}
                            </span>
                            <span className="text-2xl font-bold text-foreground leading-tight">
                              {new Date(event.startDate).getDate()}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={`text-xs no-default-hover-elevate no-default-active-elevate ${EVENT_TYPE_STYLES[event.eventType] || ""}`}
                                data-testid={`badge-event-type-${event.id}`}
                              >
                                {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                              </Badge>
                              <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-attendance-${event.id}`}>
                                <AttendanceIcon className="h-3 w-3 mr-1" />
                                {event.attendanceType === "in-person" ? "In-Person" : event.attendanceType.charAt(0).toUpperCase() + event.attendanceType.slice(1)}
                              </Badge>
                              {event.cleCredits && (
                                <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-cle-${event.id}`}>
                                  <GraduationCap className="h-3 w-3 mr-1" />
                                  {event.cleCredits} CLE
                                </Badge>
                              )}
                              {isSoon && !isPast && (
                                <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                  {timeUntil}
                                </Badge>
                              )}
                            </div>

                            <Link href={`/events/${event.id}`} data-testid={`link-event-title-${event.id}`}>
                              <h3 className="text-lg font-semibold text-foreground leading-snug cursor-pointer mb-1">
                                {event.title}
                              </h3>
                            </Link>

                            <p className="text-sm text-muted-foreground mb-3" data-testid={`text-organizer-${event.id}`}>
                              {event.organizer}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1.5" data-testid={`text-date-${event.id}`}>
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {formatEventDate(event.startDate, event.endDate)}
                              </span>
                              <span className="flex items-center gap-1.5" data-testid={`text-location-${event.id}`}>
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {event.attendanceType === "virtual" ? "Online" : event.location || "TBD"}
                              </span>
                              <span className="flex items-center gap-1.5" data-testid={`text-cost-${event.id}`}>
                                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                {event.isFree ? "Free" : event.cost || "See details"}
                              </span>
                            </div>

                            {displayTopics.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {displayTopics.map((topic, i) => (
                                  <Badge
                                    key={i}
                                    variant="secondary"
                                    className="text-xs no-default-hover-elevate no-default-active-elevate"
                                    data-testid={`badge-topic-${event.id}-${i}`}
                                  >
                                    <Tag className="h-2.5 w-2.5 mr-1" />
                                    {topic}
                                  </Badge>
                                ))}
                                {remainingTopics > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{remainingTopics} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="sm:shrink-0 sm:self-center">
                            <Link href={`/events/${event.id}`} data-testid={`link-view-event-${event.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-event-${event.id}`}>
                                View Details
                                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                );
              })}
            </div>
            );
          })()}
        </div>
      </main>

      <Footer />
    </div>
  );
}
