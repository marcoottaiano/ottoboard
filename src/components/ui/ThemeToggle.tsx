"use client";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/watermelon-ui/button";
import { useThemeScope } from "@/components/watermelon-ui/theme-scope";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeScope();
  const label = theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="min-h-11 min-w-11"
      aria-label={label}
      title={label}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  );
}
