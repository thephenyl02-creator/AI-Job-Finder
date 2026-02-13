import * as React from "react";
import { cn } from "@/lib/utils";

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: "md" | "lg" | "xl";
};

export function Container({
  className,
  size = "xl",
  ...props
}: ContainerProps) {
  const max =
    size === "md"
      ? "max-w-5xl"
      : size === "lg"
      ? "max-w-6xl"
      : "max-w-7xl";

  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}
      {...props}
    />
  );
}
