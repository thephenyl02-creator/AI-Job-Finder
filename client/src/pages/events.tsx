import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollReveal } from "@/components/animations";
import type { Event } from "@shared/schema";
import { EVENT_TYPES, ATTENDANCE_TYPES } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Filter,
  X,
  GraduationCap,
  Video,
  Building2,
  Globe,
  DollarSign,
  Tag,
  Clock,
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
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Events() {
  usePageTitle("Events");

  const [eventType, setEventType] = useState<string>("all");
  const [attendanceType, setAttendanceType] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const hasFilters = eventType !== "all" || attendanceType !== "all" || freeOnly || !upcomingOnly;

  const queryParams = new URLSearchParams();
  if (eventType !== "all") queryParams.set("eventType", eventType);
  if (attendanceType !== "all") queryParams.set("attendanceType", attendanceType);
  if (freeOnly) queryParams.set("isFree", "true");
  if (upcomingOnly) queryParams.set("upcoming", "true");
  const queryString = queryParams.toString();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/events?${queryString}` : "/api/events";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ total: number; upcoming: number; eventTypes: Record<string, number> }>({
    queryKey: ["/api/events/stats"],
  });

  const clearFilters = () => {
    setEventType("all");
    setAttendanceType("all");
    setFreeOnly(false);
    setUpcomingOnly(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <ScrollReveal>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="text-events-title">
                Legal Tech Events
              </h1>
              <p className="text-muted-foreground" data-testid="text-events-subtitle">
                Conferences, seminars, workshops, and CLE programs for legal technology professionals
              </p>
              {stats && (
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span data-testid="text-events-total">{stats.total} total events</span>
                  <span data-testid="text-events-upcoming">{stats.upcoming} upcoming</span>
                </div>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-md border border-border/40 bg-muted/30" data-testid="filter-bar">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-[160px]" data-testid="select-event-type">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={attendanceType} onValueChange={setAttendanceType}>
                <SelectTrigger className="w-[160px]" data-testid="select-attendance-type">
                  <SelectValue placeholder="Attendance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  {ATTENDANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "in-person" ? "In-Person" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <Checkbox
                  checked={freeOnly}
                  onCheckedChange={(checked) => setFreeOnly(checked === true)}
                  data-testid="checkbox-free-only"
                />
                Free events
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <Checkbox
                  checked={upcomingOnly}
                  onCheckedChange={(checked) => setUpcomingOnly(checked === true)}
                  data-testid="checkbox-upcoming-only"
                />
                Upcoming only
              </label>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                  data-testid="button-clear-filters"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : !events || events.length === 0 ? (
            <ScrollReveal>
              <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
                <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No events found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters to find more events.
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters-empty">
                    Clear all filters
                  </Button>
                )}
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event, index) => {
                const AttendanceIcon = ATTENDANCE_ICONS[event.attendanceType] || Globe;
                const topics = event.topics || [];
                const displayTopics = topics.slice(0, 3);
                const remainingTopics = topics.length - 3;

                return (
                  <ScrollReveal key={event.id} delay={index * 0.05} direction="up">
                    <Card className="h-full hover-elevate" data-testid={`card-event-${event.id}`}>
                      <CardContent className="p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-xs no-default-hover-elevate no-default-active-elevate ${EVENT_TYPE_STYLES[event.eventType] || ""}`}
                            data-testid={`badge-event-type-${event.id}`}
                          >
                            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                          </Badge>
                          {event.cleCredits && (
                            <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-cle-${event.id}`}>
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {event.cleCredits} CLE
                            </Badge>
                          )}
                        </div>

                        <Link href={`/events/${event.id}`}>
                          <h3
                            className="font-semibold text-foreground leading-snug line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                            data-testid={`link-event-title-${event.id}`}
                          >
                            {event.title}
                          </h3>
                        </Link>

                        <p className="text-sm text-muted-foreground" data-testid={`text-organizer-${event.id}`}>
                          {event.organizer}
                        </p>

                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span data-testid={`text-date-${event.id}`}>
                            {formatEventDate(event.startDate, event.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span data-testid={`text-location-${event.id}`}>
                            {event.attendanceType === "virtual" ? "Online" : event.location || "TBD"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-attendance-${event.id}`}>
                            <AttendanceIcon className="h-3 w-3 mr-1" />
                            {event.attendanceType === "in-person" ? "In-Person" : event.attendanceType.charAt(0).toUpperCase() + event.attendanceType.slice(1)}
                          </Badge>

                          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-cost-${event.id}`}>
                            <DollarSign className="h-3 w-3" />
                            {event.isFree ? "Free" : event.cost || "See details"}
                          </span>
                        </div>

                        {displayTopics.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                      </CardContent>
                    </Card>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
