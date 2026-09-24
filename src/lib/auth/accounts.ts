import type { DemoAccount } from "@/types";

export const DEMO_PASSWORD = "savera";
export const DEMO_OTP = "123456";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    userId: "u-citizen-1",
    role: "citizen",
    email: "citizen@savera.demo",
    mobile: "9000000001",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Citizen (primary)",
    description: "H-1024, XYZ Colony, Ward 24",
  },
  {
    userId: "u-citizen-2",
    role: "citizen",
    email: "citizen2@savera.demo",
    mobile: "9000000002",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Citizen (abnormal LPG)",
    description: "H-1088, ABC Colony, Ward 24",
  },
  {
    userId: "u-supervisor-24",
    role: "supervisor",
    email: "supervisor@savera.demo",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Supervisor",
    description: "Ward 24 (all colonies)",
  },
  {
    userId: "u-gov-electricity",
    role: "gov",
    email: "electricity@savera.demo",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Gov — Electricity",
    description: "City Grid Operations & Demand Response",
  },
  {
    userId: "u-gov-water",
    role: "gov",
    email: "water@savera.demo",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Gov — Water Supply",
    description: "City Water Board & Case Resolution",
  },
  {
    userId: "u-gov-gas",
    role: "gov",
    email: "gas@savera.demo",
    password: DEMO_PASSWORD,
    otp: DEMO_OTP,
    label: "Gov — LPG Cell",
    description: "City LPG Distribution & Demand Forecasting",
  },
];

export function findAccount(identifier: string): DemoAccount | undefined {
  const clean = identifier.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === clean || (a.mobile && a.mobile === clean),
  );
}

export function findAccountByUserId(userId: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.userId === userId);
}
