import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { StoreHydrator } from "@/components/layout/StoreHydrator";
import { RouteProgress } from "@/components/layout/RouteProgress";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAVERA — Resource Intelligence Platform",
  description:
    "SAVERA is an AI-powered resource intelligence and action platform that measures household electricity, water and LPG usage, builds personalised baselines, detects abnormal consumption, predicts next-month consumption and cost, gives actionable recommendations, connects citizens with utility services, and — through digital simulation, authorised integrations, compatible hardware and human-verified government workflows — helps translate digital insight into real-world resource-saving action.",
  applicationName: "SAVERA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SAVERA",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3ECE1" },
    { media: "(prefers-color-scheme: dark)", color: "#15100C" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable}`}>
      <body className="bg-background text-foreground min-h-screen overflow-x-hidden antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="savera-theme-v2">
          <StoreHydrator />
          <RouteProgress />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
