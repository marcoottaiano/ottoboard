"use client";
// Watermelon tab styling with Radix keyboard navigation and persistent panels.
import { Tabs as Primitive } from "radix-ui";
import { type ComponentProps } from "react";
import { ChartVisibility } from "@/components/ui/ChartVisibility";
import { cn } from "@/lib/utils";
export const Tabs = Primitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      className={cn(
        "grid w-full grid-cols-2 gap-2 md:flex md:gap-1 md:overflow-x-auto md:border-b md:border-wm-border",
        className,
      )}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        "inline-flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-wm-border bg-wm-card px-2 py-2 text-sm font-medium text-wm-muted-foreground transition-colors hover:text-wm-foreground focus-visible:outline-2 focus-visible:outline-wm-ring data-[state=active]:border-wm-primary data-[state=active]:bg-wm-primary/10 data-[state=active]:text-wm-primary md:min-h-12 md:shrink-0 md:flex-row md:gap-2 md:rounded-none md:border-0 md:border-b-2 md:border-transparent md:bg-transparent md:px-4 md:data-[state=active]:border-wm-primary md:data-[state=active]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
export function TabsContent({ className, children, hidden, ...props }: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      hidden={hidden}
      className={cn("pt-6 outline-none data-[state=inactive]:hidden", className)}
      {...props}
    >
      <ChartVisibility visible={hidden !== true}>{children}</ChartVisibility>
    </Primitive.Content>
  );
}
