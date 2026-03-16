import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ConditionalSidebar from "@/components/ui/ConditionalSidebar";
import { GlobalLoadingBar } from "@/components/ui/GlobalLoadingBar";
import { Providers } from "./providers";

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

export const viewport: Viewport = {
  themeColor: "#1a5f6b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0f]`}
      >
        <Providers>
          <GlobalLoadingBar />
          <ConditionalSidebar>{children}</ConditionalSidebar>
        </Providers>
      </body>
    </html>
  );
}
