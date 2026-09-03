"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";

export type AppTheme = "light" | "dark";
export const APP_THEME_COOKIE = "ottoboard-theme";
interface ThemeScopeValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  portalContainer: HTMLDivElement | null;
}
const ThemeScopeContext = createContext<ThemeScopeValue | null>(null);
export function ThemeScope({ initialTheme, children }: { initialTheme: AppTheme; children: ReactNode }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const accent = pathname === "/fitness" || pathname.startsWith("/fitness/") ? "fitness" : "default";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const color = theme === "dark" ? "#141a18" : "#f8faf9";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [theme]);

  function setTheme(nextTheme: AppTheme) {
    document.documentElement.dataset.theme = nextTheme;
    setThemeState(nextTheme);
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${APP_THEME_COOKIE}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    document.cookie = `ottoboard-finance-theme=; Path=/finance; Max-Age=0; SameSite=Lax${secure}`;
  }
  return (
    <ThemeScopeContext.Provider value={{ theme, setTheme, portalContainer }}>
      <div className="wm-theme min-h-dvh" data-ui-accent={accent}>
        {children}
        <div ref={setPortalContainer} data-app-portals="" />
        <Toaster
          theme={theme}
          position="bottom-right"
          className="app-toaster"
          toastOptions={{
            style: {
              background: "var(--wm-popover)",
              border: "1px solid var(--wm-border)",
              color: "var(--wm-foreground)",
            },
          }}
        />
      </div>
    </ThemeScopeContext.Provider>
  );
}
export function useThemeScope() {
  const value = useContext(ThemeScopeContext);
  if (!value) throw new Error("Watermelon components must be rendered inside ThemeScope.");
  return value;
}
