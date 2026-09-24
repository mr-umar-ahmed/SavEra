import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { StoreHydrator } from "@/components/layout/StoreHydrator";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#050B08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-background text-foreground min-h-screen overflow-x-hidden antialiased selection:bg-emerald-500/30">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <StoreHydrator />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
