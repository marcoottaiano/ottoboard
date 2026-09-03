import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/ui/AppShell";
import { cookies } from "next/headers";
import { ThemeScope } from "@/components/watermelon-ui/theme-scope";
import { GlobalLoadingBar } from "@/components/ui/GlobalLoadingBar";
import { Providers } from "./providers";
import "./watermelon.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ottoboard",
  description: "Personal life dashboard — fitness, finanze, progetti",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ottoboard",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const light = (await cookies()).get("ottoboard-theme")?.value === "light";
  return { themeColor: light ? "#f8faf9" : "#141a18", width: "device-width", initialScale: 1 };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storedTheme = (await cookies()).get("ottoboard-theme")?.value;
  const theme = storedTheme === "light" ? "light" : "dark";
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`} data-theme={theme}>
      <body className="antialiased">
        <Providers>
          <ThemeScope initialTheme={theme}>
            <GlobalLoadingBar />
            <AppShell>{children}</AppShell>
          </ThemeScope>
        </Providers>
      </body>
    </html>
  );
}
