import type { Department, Role } from "./common";

/** A signed-in demo user. Citizens carry a household, supervisors a ward, gov users a department. */
export interface User {
  id: string;
  role: Role;
  /** Government users only. */
  department?: Department;
  /** Citizens only. */
  householdId?: string;
  /** Supervisors (assigned ward) and citizens (home ward). */
  wardId?: string;
  name: string;
  email: string;
  mobile?: string;
  /** Leaderboard opt-in: show the real display name instead of "Green Home #n". */
  displayNamePublic: boolean;
}

/** A seeded demo login (password `savera`, OTP `123456`), listed on `/auth` and in the role switcher. */
export interface DemoAccount {
  userId: string;
  role: Role;
  email: string;
  /** Alternative login identifier (primary citizen: `9000000001`). */
  mobile?: string;
  password: string;
  otp: string;
  /** Short name shown in the role switcher, e.g. "Citizen (primary)". */
  label: string;
  /** Scope line, e.g. "H-1024, XYZ Colony, Ward 24". */
  description: string;
}
