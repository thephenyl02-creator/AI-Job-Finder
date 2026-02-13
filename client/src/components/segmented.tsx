import * as React from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedProps<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  className?: string;
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-card p-1",
        className
      )}
      data-testid="segmented-control"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            )}
            data-testid={`segmented-${opt.value}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
