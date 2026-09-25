import {
  Activity,
  AlertTriangle,
  BarChart3,
  Box,
  Cpu,
  Droplet,
  FileText,
  Flame,
  Globe,
  Home,
  Layers,
  Leaf,
  Link,
  MapPin,
  Maximize2,
  PieChart,
  Radio,
  QrCode,
  Scan,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const CITIZEN_NAV: NavItem[] = [
  { title: "Home Setup Hub", href: "/citizen", icon: Home },
  { title: "Electricity Intelligence", href: "/citizen/electricity", icon: Zap },
  { title: "Water Supply Portal", href: "/citizen/water", icon: Droplet },
  { title: "LPG Management", href: "/citizen/gas", icon: Flame },
  { title: "Green Score", href: "/citizen/green-score", icon: Leaf },
  { title: "Leaderboard", href: "/citizen/leaderboard", icon: Users },
  { title: "Rank Progress", href: "/citizen/progress", icon: TrendingUp },
  { title: "Carbon Footprint", href: "/citizen/carbon", icon: PieChart, badge: "New" },
  { title: "Digital Twin", href: "/citizen/twin", icon: Box, badge: "Beta" },
  { title: "Smart Scan", href: "/citizen/scan", icon: Scan },
  { title: "Data Integration", href: "/citizen/connect", icon: Link },
  { title: "Services Hub", href: "/citizen/services", icon: Cpu },
];

export const SUPERVISOR_NAV: NavItem[] = [
  { title: "Ward Overview", href: "/supervisor", icon: Home },
  { title: "Water Supply Pipeline", href: "/supervisor/water", icon: Droplet },
  { title: "Verified Reports", href: "/supervisor/water/verified", icon: FileText },
  { title: "LPG Distribution", href: "/supervisor/gas", icon: Flame },
  { title: "Grid Operations", href: "/supervisor/electricity", icon: Zap },
  { title: "Ward Simulation", href: "/supervisor/twin", icon: Box, badge: "Sim" },
];

export const GOV_NAV: NavItem[] = [
  { title: "Command Center", href: "/gov", icon: Home },
  { title: "City Grid & ADR", href: "/gov/electricity", icon: Zap },
  { title: "Water Supply Board", href: "/gov/water", icon: Droplet },
  { title: "LPG Distribution Cell", href: "/gov/gas", icon: Flame },
  { title: "Resource Heatmap", href: "/gov/heatmap", icon: Layers },
  { title: "Wards & Areas", href: "/gov/wards", icon: MapPin },
  { title: "AI Demand Forecast", href: "/gov/forecast", icon: TrendingUp },
  { title: "Resource Planning", href: "/gov/planning", icon: Activity },
  { title: "City Analytics", href: "/gov/analytics", icon: BarChart3 },
  { title: "Green Score Distribution", href: "/gov/green-score", icon: Leaf },
  { title: "Department Cases", href: "/gov/cases", icon: AlertTriangle },
  { title: "Official Alerts", href: "/gov/alerts", icon: ShieldAlert },
  { title: "Industrial Intelligence", href: "/gov/industrial", icon: Globe, badge: "GHG" },
  { title: "City Twin Simulation", href: "/gov/twin", icon: Maximize2, badge: "Sim" },
];
