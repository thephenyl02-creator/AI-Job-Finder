import { CATEGORY_TO_TRACK, type RoleTrack } from "@shared/schema";

export const TRACK_COLORS: Record<RoleTrack, {
  primary: string;
  muted: string;
  bg: string;
  text: string;
  border: string;
  fill: string;
}> = {
  "Lawyer-Led": {
    primary: "hsl(var(--chart-1))",
    muted: "hsl(var(--chart-1) / 0.5)",
    bg: "hsl(var(--chart-1) / 0.08)",
    text: "hsl(var(--chart-1))",
    border: "hsl(var(--chart-1) / 0.25)",
    fill: "hsl(var(--chart-1) / 0.15)",
  },
  "Technical": {
    primary: "hsl(var(--chart-2))",
    muted: "hsl(var(--chart-2) / 0.5)",
    bg: "hsl(var(--chart-2) / 0.08)",
    text: "hsl(var(--chart-2))",
    border: "hsl(var(--chart-2) / 0.25)",
    fill: "hsl(var(--chart-2) / 0.15)",
  },
  "Ecosystem": {
    primary: "hsl(var(--chart-5))",
    muted: "hsl(var(--chart-5) / 0.5)",
    bg: "hsl(var(--chart-5) / 0.08)",
    text: "hsl(var(--chart-5))",
    border: "hsl(var(--chart-5) / 0.25)",
    fill: "hsl(var(--chart-5) / 0.15)",
  },
};

const TRACK_OPACITY_STEPS: Record<RoleTrack, number[]> = {
  "Lawyer-Led": [1.0, 0.85, 0.7, 0.55, 0.45, 0.35, 0.28, 0.22, 0.18],
  "Technical": [1.0, 0.75, 0.5],
  "Ecosystem": [1.0],
};

export function getCategoryColor(category: string): string {
  const track = CATEGORY_TO_TRACK[category] || "Lawyer-Led";
  const trackColor = TRACK_COLORS[track];
  const categoriesInTrack = Object.entries(CATEGORY_TO_TRACK)
    .filter(([, t]) => t === track)
    .map(([c]) => c);
  const idx = categoriesInTrack.indexOf(category);
  const steps = TRACK_OPACITY_STEPS[track];
  const opacity = steps[Math.min(idx, steps.length - 1)] || 0.5;
  const cssVar = track === "Lawyer-Led" ? "--chart-1" : track === "Technical" ? "--chart-2" : "--chart-5";
  return `hsl(var(${cssVar}) / ${opacity})`;
}

export function getTrackColor(track: RoleTrack): string {
  return TRACK_COLORS[track]?.primary || TRACK_COLORS["Lawyer-Led"].primary;
}

export function getTrackForCategory(category: string): RoleTrack {
  return CATEGORY_TO_TRACK[category] || "Lawyer-Led";
}

export const GENERIC_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const STATUS_COLORS = {
  success: "hsl(var(--status-success))",
  warning: "hsl(var(--status-warning))",
  danger: "hsl(var(--status-danger))",
  neutral: "hsl(var(--status-neutral))",
};

export const WORK_MODE_PALETTE = {
  remote: "hsl(var(--chart-1))",
  hybrid: "hsl(var(--chart-5))",
  onsite: "hsl(var(--muted-foreground) / 0.4)",
};

export const SHARED_AXIS_STYLE = {
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
};

export const SHARED_GRID_STYLE = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.5,
};

export const SHARED_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "6px",
    fontSize: "12px",
    padding: "8px 12px",
    boxShadow: "var(--shadow-md)",
    fontFamily: "var(--font-sans)",
  },
  labelStyle: {
    fontWeight: 600,
    marginBottom: "4px",
    fontSize: "11px",
    color: "hsl(var(--muted-foreground))",
    fontFamily: "var(--font-sans)",
  },
  itemStyle: {
    fontSize: "12px",
    padding: "1px 0",
    fontFamily: "var(--font-sans)",
  },
};

export function accessibilityLabel(score: number): { label: string; color: string; className: string } {
  if (score >= 65) return { label: "High", color: STATUS_COLORS.success, className: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 35) return { label: "Moderate", color: STATUS_COLORS.warning, className: "text-amber-600 dark:text-amber-400" };
  return { label: "Selective", color: STATUS_COLORS.danger, className: "text-rose-600 dark:text-rose-400" };
}
