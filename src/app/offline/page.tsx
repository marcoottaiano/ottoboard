"use client";

import { Button } from "@/components/watermelon-ui/button";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] gap-6 text-center px-8">
      <WifiOff className="w-16 h-16 text-wm-muted-foreground" />
      <h1 className="text-2xl font-bold text-wm-foreground">Sei offline</h1>
      <p className="text-sm text-wm-muted-foreground max-w-xs">
        Connettiti a internet per continuare a usare Ottoboard.
      </p>
      <Button
        size="auto"
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2 rounded-lg  transition-colors text-sm font-medium"
      >
        Riprova
      </Button>
    </div>
  );
}
