import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Link } from "wouter";
import {
  ArrowLeft, Plus, LinkIcon, Trash2, Calendar, Loader2, Search,
  CheckCircle, XCircle, ToggleLeft, ToggleRight, Pencil, Sparkles,
  RefreshCw, Clock, Activity, AlertTriangle, ExternalLink
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Event } from "@shared/schema";

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

const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  "in-person": "In-Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

const EMPTY_FORM: Record<string, any> = {
  title: "",
  organizer: "",
  eventType: "conference",
  startDate: "",
  endDate: "",
  location: "",
  attendanceType: "in-person",
  description: "",
  registrationUrl: "",
  cost: "",
  isFree: false,
  topics: "",
  cleCredits: "",
};

interface ValidationResult {
  brokenLinks: Array<{
    eventId: number;
    title: string;
    url: string;
    statusCode: number;
  }>;
  checkedCount: number;
  brokenCount: number;
}

export default function AdminEvents() {
  usePageTitle("Admin - Events");
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);

  const { data: allEvents = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/admin/events"],
  });

  const now = new Date();
  const activeEvents = allEvents.filter(e => e.isActive);
  const upcomingEvents = allEvents.filter(e => e.isActive && new Date(e.startDate) >= now);
  const pastInactive = allEvents.filter(e => !e.isActive);

  const filteredEvents = allEvents
    .filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.organizer.toLowerCase().includes(q)) return false;
      }
      if (statusFilter === "active" && !e.isActive) return false;
      if (statusFilter === "inactive" && e.isActive) return false;
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: number; body: Record<string, any> }) => {
      const payload = {
        ...data.body,
        topics: data.body.topics
          ? (typeof data.body.topics === "string" ? data.body.topics.split(",").map((t: string) => t.trim()).filter(Boolean) : data.body.topics)
          : [],
        isFree: !!data.body.isFree,
        startDate: data.body.startDate ? new Date(data.body.startDate).toISOString() : undefined,
        endDate: data.body.endDate ? new Date(data.body.endDate).toISOString() : undefined,
      };
      if (!payload.endDate) delete payload.endDate;
      if (data.id) {
        const res = await apiRequest("PATCH", `/api/admin/events/${data.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/events", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editingEvent ? "Event updated" : "Event created" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setDialogOpen(false);
      setEditingEvent(null);
      setForm({ ...EMPTY_FORM });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/events/${id}`, { isActive: !isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/events/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/events/validate-links");
      return res.json();
    },
    onSuccess: (data) => {
      setValidationResults(data);
      toast({
        title: "Link validation complete",
        description: `Checked ${data.checkedCount} links, found ${data.brokenCount} broken`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/events/deactivate-past");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Cleanup complete", description: data.message || "Past events deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/events/refresh");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Refresh complete", description: data.message || "Events refreshed from AI" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const aiExtractMutation = useMutation({
    mutationFn: async (payload: { title?: string; url?: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/admin/events/ai-extract", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setForm(prev => ({
        ...prev,
        ...data,
        topics: Array.isArray(data.topics) ? data.topics.join(", ") : (data.topics || prev.topics),
        startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : prev.startDate,
        endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : prev.endDate,
      }));
      toast({ title: "AI extraction complete" });
    },
    onError: (err: any) => {
      toast({ title: "AI extraction failed", description: err.message, variant: "destructive" });
    },
  });

  const deactivateSingleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/events/${id}`, { isActive: false });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openAddDialog() {
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEditDialog(event: Event) {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      organizer: event.organizer || "",
      eventType: event.eventType || "conference",
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      location: event.location || "",
      attendanceType: event.attendanceType || "in-person",
      description: event.description || "",
      registrationUrl: event.registrationUrl || "",
      cost: event.cost || "",
      isFree: event.isFree || false,
      topics: Array.isArray(event.topics) ? (event.topics as string[]).join(", ") : "",
      cleCredits: event.cleCredits || "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    saveMutation.mutate({
      id: editingEvent?.id,
      body: form,
    });
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" data-testid="button-back-admin">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold font-serif" data-testid="text-page-title">Event Management</h1>
                <p className="text-sm text-muted-foreground">Manage legal tech events, conferences, and workshops</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                data-testid="button-validate-links"
              >
                {validateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-1" />}
                Validate Links
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cleanupMutation.mutate()}
                disabled={cleanupMutation.isPending}
                data-testid="button-cleanup-past"
              >
                {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Clock className="w-4 h-4 mr-1" />}
                Clean Up Past Events
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                data-testid="button-refresh-ai"
              >
                {refreshMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Refresh from AI
              </Button>
              <Button
                size="sm"
                onClick={openAddDialog}
                data-testid="button-add-event"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Event
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card data-testid="card-total-events">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Total Events</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-total-events">{allEvents.length}</span>
                <p className="text-xs text-muted-foreground">all events</p>
              </CardContent>
            </Card>
            <Card data-testid="card-active-events">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Active</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-active-events">{activeEvents.length}</span>
                <p className="text-xs text-muted-foreground">currently active</p>
              </CardContent>
            </Card>
            <Card data-testid="card-upcoming-events">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Upcoming</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-upcoming-events">{upcomingEvents.length}</span>
                <p className="text-xs text-muted-foreground">future events</p>
              </CardContent>
            </Card>
            <Card data-testid="card-past-events">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Past / Inactive</span>
                </div>
                <span className="text-lg font-bold" data-testid="text-past-events">{pastInactive.length}</span>
                <p className="text-xs text-muted-foreground">inactive events</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-events"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card data-testid="card-events-table">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Events ({filteredEvents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm" data-testid="text-no-events">No events found matching your filters.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[80px_1fr_120px_90px_100px_100px_80px_60px_100px] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                      <span>Status</span>
                      <span>Title</span>
                      <span>Organizer</span>
                      <span>Type</span>
                      <span>Date</span>
                      <span>Location</span>
                      <span>Attend.</span>
                      <span>URL</span>
                      <span>Actions</span>
                    </div>
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="grid grid-cols-[80px_1fr_120px_90px_100px_100px_80px_60px_100px] gap-2 px-2 py-2 text-sm border-b border-border/50 hover-elevate rounded cursor-pointer items-center"
                        onClick={() => openEditDialog(event)}
                        data-testid={`row-event-${event.id}`}
                      >
                        <span>
                          {event.isActive ? (
                            <Badge variant="default" className="bg-emerald-600 text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-active-${event.id}`}>Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`badge-inactive-${event.id}`}>Inactive</Badge>
                          )}
                        </span>
                        <span className="text-sm font-medium truncate" data-testid={`text-title-${event.id}`}>{event.title}</span>
                        <span className="text-xs text-muted-foreground truncate" data-testid={`text-organizer-${event.id}`}>{event.organizer}</span>
                        <span>
                          <Badge
                            variant="secondary"
                            className={`text-xs no-default-hover-elevate no-default-active-elevate ${EVENT_TYPE_STYLES[event.eventType] || ""}`}
                            data-testid={`badge-type-${event.id}`}
                          >
                            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                          </Badge>
                        </span>
                        <span className="text-xs" data-testid={`text-date-${event.id}`}>
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground truncate" data-testid={`text-location-${event.id}`}>
                          {event.location || "TBD"}
                        </span>
                        <span className="text-xs" data-testid={`text-attendance-${event.id}`}>
                          {ATTENDANCE_TYPE_LABELS[event.attendanceType] || event.attendanceType}
                        </span>
                        <span onClick={(e) => e.stopPropagation()}>
                          {event.registrationUrl && (
                            <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-url-${event.id}`}>
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                        </span>
                        <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(event)}
                            data-testid={`button-edit-${event.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate({ id: event.id, isActive: !!event.isActive })}
                            data-testid={`button-toggle-${event.id}`}
                          >
                            {event.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmId(event.id)}
                            data-testid={`button-delete-${event.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {validationResults && validationResults.brokenLinks.length > 0 && (
            <Card data-testid="card-validation-results">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base">
                    <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                    Broken Links ({validationResults.brokenCount})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setValidationResults(null)} data-testid="button-dismiss-validation">
                    Dismiss
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationResults.brokenLinks.map((link) => (
                    <div key={link.eventId} className="flex items-center justify-between gap-2 p-2 rounded border border-border/50" data-testid={`broken-link-${link.eventId}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                        <Badge variant="destructive" className="text-xs mt-1 no-default-hover-elevate no-default-active-elevate">Status: {link.statusCode}</Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deactivateSingleMutation.mutate(link.eventId)}
                        data-testid={`button-deactivate-broken-${link.eventId}`}
                      >
                        Deactivate
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-event-title"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => aiExtractMutation.mutate({
                  title: form.title,
                  url: form.registrationUrl,
                  description: form.description,
                })}
                disabled={aiExtractMutation.isPending}
                data-testid="button-ai-extract"
              >
                {aiExtractMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                AI Extract
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-organizer">Organizer</Label>
                <Input
                  id="event-organizer"
                  value={form.organizer}
                  onChange={(e) => setForm(prev => ({ ...prev, organizer: e.target.value }))}
                  data-testid="input-event-organizer"
                />
              </div>
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={form.eventType} onValueChange={(val) => setForm(prev => ({ ...prev, eventType: val }))}>
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-start-date">Start Date</Label>
                <Input
                  id="event-start-date"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-event-start-date"
                />
              </div>
              <div>
                <Label htmlFor="event-end-date">End Date</Label>
                <Input
                  id="event-end-date"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  data-testid="input-event-end-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={form.location}
                  onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                  data-testid="input-event-location"
                />
              </div>
              <div>
                <Label htmlFor="event-attendance">Attendance Type</Label>
                <Select value={form.attendanceType} onValueChange={(val) => setForm(prev => ({ ...prev, attendanceType: val }))}>
                  <SelectTrigger data-testid="select-attendance-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ATTENDANCE_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                data-testid="input-event-description"
              />
            </div>

            <div>
              <Label htmlFor="event-url">Registration URL</Label>
              <Input
                id="event-url"
                value={form.registrationUrl}
                onChange={(e) => setForm(prev => ({ ...prev, registrationUrl: e.target.value }))}
                data-testid="input-event-url"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-cost">Cost</Label>
                <Input
                  id="event-cost"
                  value={form.cost}
                  onChange={(e) => setForm(prev => ({ ...prev, cost: e.target.value }))}
                  data-testid="input-event-cost"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="event-is-free"
                  checked={form.isFree}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, isFree: !!checked }))}
                  data-testid="checkbox-is-free"
                />
                <Label htmlFor="event-is-free" className="text-sm cursor-pointer">Free Event</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-topics">Topics (comma-separated)</Label>
                <Input
                  id="event-topics"
                  value={form.topics}
                  onChange={(e) => setForm(prev => ({ ...prev, topics: e.target.value }))}
                  placeholder="AI, Legal Tech, Privacy"
                  data-testid="input-event-topics"
                />
              </div>
              <div>
                <Label htmlFor="event-cle">CLE Credits</Label>
                <Input
                  id="event-cle"
                  value={form.cleCredits}
                  onChange={(e) => setForm(prev => ({ ...prev, cleCredits: e.target.value }))}
                  data-testid="input-event-cle"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-event">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.title || !form.organizer || !form.description || !form.registrationUrl}
              data-testid="button-save-event"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editingEvent ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-delete-confirm-title">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground" data-testid="text-delete-confirm-message">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
