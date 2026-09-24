import type { Role, User } from "@/types";

export function roleDefaultPath(role: Role, department?: string): string {
  switch (role) {
    case "citizen":
      return "/citizen/electricity";
    case "supervisor":
      return "/supervisor/water";
    case "gov":
      if (department === "water") return "/gov/water";
      if (department === "gas") return "/gov/gas";
      return "/gov/electricity";
  }
}

export function canAccessRole(user: User | null, requiredRole: Role): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}
