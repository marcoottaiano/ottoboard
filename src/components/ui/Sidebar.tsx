"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ChevronLeft, ChevronRight, Eye, EyeOff, LayoutDashboard, LogOut, User, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, module: "home", accent: "var(--brand)", activeBg: "rgba(101, 214, 166, 0.08)" },
  { href: "/finance", label: "Finanze", icon: Wallet, module: "finance", accent: "var(--brand)", activeBg: "rgba(101, 214, 166, 0.08)" },
  { href: "/fitness", label: "Fitness", icon: Activity, module: "fitness", accent: "var(--fitness)", activeBg: "rgba(255, 107, 74, 0.08)" },
  { href: "/profile", label: "Profilo", icon: User, module: "profile", accent: "var(--foreground)", activeBg: "rgba(243, 240, 232, 0.06)" },
] as const;

type Module = (typeof NAV_ITEMS)[number]["module"];

function getActiveModule(pathname: string): Module {
  if (pathname.startsWith("/finance")) return "finance";
  if (pathname.startsWith("/fitness")) return "fitness";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

function formatToday() {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const activeModule = getActiveModule(pathname);
  const { isPrivate, toggle: togglePrivacy, hydrate: hydratePrivacy } = usePrivacyMode();
  const activeItem = NAV_ITEMS.find((item) => item.module === activeModule) ?? NAV_ITEMS[0];

  useEffect(() => {
    hydratePrivacy();
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split("@")[0] ?? null);
    });
  }, [hydratePrivacy]);

  const handleLogout = async () => {
    const client = createClient();
    await client.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-[#061114] md:flex ${collapsed ? "w-[72px]" : "w-[240px]"} transition-[width] duration-300`}
        style={{ borderColor: "var(--border)" }}
      >
        <div className={`flex h-16 shrink-0 items-center border-b px-3 ${collapsed ? "justify-center" : "gap-3"}`} style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="shrink-0 rounded-xl border p-1" style={{ borderColor: "var(--border-strong)" }}>
            <Image src="/icons/icon-192x192.png" alt="Ottoboard" width={34} height={34} className="rounded-lg" priority />
          </Link>
          {!collapsed ? (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-white/90">Ottoboard</span>
              <button onClick={() => setCollapsed(true)} className="ob-icon-button size-8" title="Riduci navigazione">
                <ChevronLeft size={15} />
              </button>
            </>
          ) : null}
        </div>

        <nav className={`flex-1 space-y-1 py-4 ${collapsed ? "px-3" : "px-3"}`} aria-label="Navigazione principale">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.module === activeModule;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={`relative flex min-h-11 items-center rounded-xl border transition-colors ${collapsed ? "justify-center" : "gap-3 px-3"}`}
                style={{
                  color: isActive ? item.accent : "var(--muted)",
                  borderColor: isActive ? "var(--border-strong)" : "transparent",
                  background: isActive ? item.activeBg : "transparent",
                }}
              >
                {isActive ? <span className="absolute -left-[13px] h-5 w-0.5 rounded-full" style={{ background: item.accent }} /> : null}
                <Icon size={18} strokeWidth={1.8} className="shrink-0" />
                {!collapsed ? <span className={`text-sm ${isActive ? "font-medium text-white/90" : "text-muted"}`}>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        {!collapsed ? (
          <div className="mx-3 mb-3 rounded-xl border px-3 py-3" style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.018)" }}>
            <p className="ob-eyebrow">Oggi</p>
            <p className="mt-1.5 text-xs capitalize text-white/70" suppressHydrationWarning>{formatToday()}</p>
          </div>
        ) : null}

        <div className={`border-t py-3 ${collapsed ? "px-3" : "px-3"}`} style={{ borderColor: "var(--border)" }}>
          {!collapsed ? (
            <Link href="/profile" className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted" style={{ borderColor: "var(--border)" }}><User size={14} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/80">{userName ?? "…"}</p>
                <p className="text-[10px] text-muted">Profilo personale</p>
              </div>
            </Link>
          ) : (
            <button onClick={() => setCollapsed(false)} className="ob-icon-button mb-2 w-full border-transparent" title="Espandi navigazione"><ChevronRight size={16} /></button>
          )}

          <div className={`flex gap-1 ${collapsed ? "flex-col" : "items-center"}`}>
            <button onClick={togglePrivacy} className={`ob-icon-button border-transparent ${collapsed ? "w-full" : "flex-1"}`} title={isPrivate ? "Disattiva privacy" : "Attiva privacy"}>
              {isPrivate ? <EyeOff size={16} className="text-fitness" /> : <Eye size={16} />}
              {!collapsed ? <span className="ml-2 text-xs">{isPrivate ? "Privato" : "Privacy"}</span> : null}
            </button>
            <button onClick={handleLogout} className={`ob-icon-button border-transparent hover:text-red-400 ${collapsed ? "w-full" : ""}`} title="Esci"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-[#061114]/95 px-4 backdrop-blur md:hidden" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <Image src="/icons/icon-192x192.png" alt="Ottoboard" width={32} height={32} className="rounded-lg" priority />
          <div>
            <p className="text-sm font-semibold">{activeItem.label}</p>
            <p className="text-[10px] capitalize text-muted" suppressHydrationWarning>{formatToday()}</p>
          </div>
        </div>
        <button onClick={togglePrivacy} className="ob-icon-button" title={isPrivate ? "Disattiva privacy" : "Attiva privacy"}>{isPrivate ? <EyeOff size={16} className="text-fitness" /> : <Eye size={16} />}</button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[68px] grid-cols-4 border-t bg-[#061114]/95 px-2 backdrop-blur md:hidden" style={{ borderColor: "var(--border)" }} aria-label="Navigazione mobile">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.module === activeModule;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium" style={{ color: isActive ? item.accent : "var(--muted-soft)" }}>
              <Icon size={19} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className={`min-h-screen min-w-0 pt-16 pb-[68px] md:py-0 ${collapsed ? "md:ml-[72px]" : "md:ml-[240px]"} transition-[margin] duration-300`}>{children}</main>
    </div>
  );
}
