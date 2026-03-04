import { MapPin, Wifi, Laptop, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type LocationSize = "sm" | "md";

interface JobLocationProps {
  location: string | null | undefined;
  locationType: string | null | undefined;
  isRemote: boolean | null | undefined;
  size?: LocationSize;
  showTypeBadge?: boolean;
  showIcon?: boolean;
  className?: string;
  testIdPrefix?: string;
}

function isLocationEmpty(loc: string | null | undefined): boolean {
  return !loc || loc.trim() === '' || loc.trim() === 'Not specified';
}

function isRemoteLocation(loc: string | null | undefined): boolean {
  if (!loc) return false;
  const lower = loc.toLowerCase().trim();
  return lower.startsWith('remote');
}

function getEffectiveLocationType(
  locationType: string | null | undefined,
  isRemote: boolean | null | undefined
): string | null {
  if (locationType) return locationType;
  if (isRemote) return 'remote';
  return null;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'remote': return 'Remote';
    case 'hybrid': return 'Hybrid';
    case 'onsite': return 'On-site';
    default: return type;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'remote': return Wifi;
    case 'hybrid': return Laptop;
    case 'onsite': return Building2;
    default: return MapPin;
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'remote':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'hybrid':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'onsite':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    default:
      return '';
  }
}

export function JobLocation({
  location,
  locationType,
  isRemote,
  size = "sm",
  showTypeBadge = true,
  showIcon = true,
  className = "",
  testIdPrefix = "",
}: JobLocationProps) {
  const effectiveType = getEffectiveLocationType(locationType, isRemote);
  const hasLocation = !isLocationEmpty(location);
  const locationIsRemoteText = isRemoteLocation(location);

  if (!hasLocation && !effectiveType) return null;

  const showLocationText = hasLocation && !locationIsRemoteText;
  const showType = showTypeBadge && effectiveType;
  const showRemoteAsType = locationIsRemoteText && effectiveType === 'remote';

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {showLocationText && (
        <span className="flex items-center gap-1" title={location || undefined}>
          {showIcon && <MapPin className={`${iconSize} shrink-0`} />}
          <span data-testid={testIdPrefix ? `${testIdPrefix}-location` : undefined}>{location}</span>
        </span>
      )}
      {showType && (
        <Badge
          variant="secondary"
          className={`gap-1 text-[10px] ${getTypeBadgeClass(effectiveType!)}`}
          data-testid={testIdPrefix ? `${testIdPrefix}-type` : undefined}
        >
          {(() => {
            const TypeIcon = getTypeIcon(effectiveType!);
            return <TypeIcon className={`${iconSize} shrink-0`} />;
          })()}
          {getTypeLabel(effectiveType!)}
        </Badge>
      )}
      {!showLocationText && !showType && hasLocation && (
        <span className="flex items-center gap-1" title={location || undefined}>
          {showIcon && <MapPin className={`${iconSize} shrink-0`} />}
          <span data-testid={testIdPrefix ? `${testIdPrefix}-location` : undefined}>{location}</span>
        </span>
      )}
    </span>
  );
}

export function JobLocationInline({
  location,
  locationType,
  isRemote,
  className = "",
}: {
  location: string | null | undefined;
  locationType: string | null | undefined;
  isRemote: boolean | null | undefined;
  className?: string;
}) {
  const effectiveType = getEffectiveLocationType(locationType, isRemote);
  const hasLocation = !isLocationEmpty(location);
  const locationIsRemoteText = isRemoteLocation(location);

  if (!hasLocation && !effectiveType) return <span className={className}>-</span>;

  if (hasLocation && !locationIsRemoteText) {
    const typeLabel = effectiveType ? ` (${getTypeLabel(effectiveType)})` : '';
    return <span className={className}>{location}{typeLabel}</span>;
  }

  if (effectiveType) {
    return <span className={className}>{getTypeLabel(effectiveType)}</span>;
  }

  if (hasLocation) {
    return <span className={className}>{location}</span>;
  }

  return <span className={className}>-</span>;
}
