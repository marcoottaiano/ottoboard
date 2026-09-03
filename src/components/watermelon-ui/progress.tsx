"use client";
// Adapted from Watermelon UI (MIT); see README.md and LICENSE.
import { Progress as Primitive } from "radix-ui";
import { type CSSProperties, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Progress({
  value = 0,
  className,
  indicatorClassName,
  indicatorStyle,
  ...props
}: Omit<ComponentProps<typeof Primitive.Root>, "max"> & {
  indicatorClassName?: string;
  indicatorStyle?: CSSProperties;
}) {
  const percentage = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(value, 100)) : 0;
  return (
    <Primitive.Root
      {...props}
      value={percentage}
      max={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-wm-muted", className)}
    >
      <Primitive.Indicator
        className={cn(
          "h-full w-full origin-left bg-wm-primary transition-transform motion-reduce:transition-none",
          indicatorClassName,
        )}
        style={{ ...indicatorStyle, transform: `scaleX(${percentage / 100})` }}
      />
    </Primitive.Root>
  );
}
