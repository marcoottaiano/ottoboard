"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center px-8">
      <WifiOff className="w-16 h-16 text-zinc-500" />
      <h1 className="text-2xl font-bold text-white">Sei offline</h1>
      <p className="text-sm text-zinc-400 max-w-xs">
        Connettiti a internet per continuare a usare Ottoboard.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 transition-colors text-white text-sm font-medium"
      >
        Riprova
      </button>
    </div>
  );
}
