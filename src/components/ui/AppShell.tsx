"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Eye, EyeOff, House, LogOut, User, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePrivacyMode } from "@/hooks/usePrivacyMode";
import { Button } from "@/components/watermelon-ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/watermelon-ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/finance", label: "Finanze", icon: Wallet },
  { href: "/fitness", label: "Fitness", icon: Activity },
  { href: "/profile", label: "Profilo", icon: User },
];
function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Navigazione mobile" : "Navigazione principale"}
      className={mobile ? "app-mobile-nav" : "hidden items-center gap-1 md:flex"}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`app-nav-link ${active ? (href === "/fitness" ? "app-nav-fitness" : "app-nav-active") : ""}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
function AccountControls() {
  const [userName, setUserName] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const pending = useRef(false);
  const router = useRouter();
  const { isPrivate, toggle, hydrate } = usePrivacyMode();
  useEffect(() => {
    hydrate();
    let active = true;
    const client = createClient();
    void client.auth.getUser().then(({ data }) => {
      if (active) setUserName(data.user?.email?.split("@")[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [hydrate]);
  async function logout() {
    if (pending.current) return;
    pending.current = true;
    setLeaving(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/auth/login");
      router.refresh();
    } catch {
      toast.error("Uscita non riuscita. Riprova.");
    } finally {
      pending.current = false;
      setLeaving(false);
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="min-h-11 min-w-11"
        onClick={toggle}
        aria-pressed={isPrivate}
        aria-label={isPrivate ? "Disattiva privacy" : "Attiva privacy"}
      >
        {isPrivate ? <EyeOff size={19} /> : <Eye size={19} />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="min-h-11 min-w-11 rounded-full" aria-label="Menu account">
            <User size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {userName && <p className="max-w-56 truncate border-b border-wm-border px-2 py-3 text-sm">{userName}</p>}
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User size={16} />
              Profilo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={leaving} onSelect={() => void logout()}>
            <LogOut size={16} />
            {leaving ? "Uscita..." : "Esci"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = pathname.startsWith("/auth/") || pathname === "/onboarding" || pathname === "/offline";
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="app-skip-link">
        Salta al contenuto
      </a>
      <header className="app-header">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center justify-between gap-2 px-4 md:px-7">
          <Link href="/" className="flex min-h-11 items-center gap-2 rounded-lg" aria-label="Ottoboard">
            <Image src="/icons/icon-192x192.png" alt="" width={32} height={32} className="rounded-lg" priority />
            <span className="text-sm font-semibold tracking-tight">Ottoboard</span>
          </Link>
          {!minimal && <Navigation />}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!minimal && <AccountControls />}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={minimal ? "app-main app-main-minimal" : "app-main"}>
        {children}
      </main>
      {!minimal && <Navigation mobile />}
    </div>
  );
}
