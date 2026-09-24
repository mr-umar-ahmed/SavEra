import type { Notification, User } from "@/types";

export function selectNotificationsFor(user: User | null, notifications: Notification[]): Notification[] {
  if (!user) return [];

  return notifications.filter((n) => {
    const t = n.target;
    // Role must match
    if (t.role !== user.role) return false;

    // Specific user match
    if (t.userIds && t.userIds.length > 0 && !t.userIds.includes(user.id)) {
      return false;
    }

    // Role-specific narrowing:
    if (user.role === "citizen") {
      if (t.householdIds && t.householdIds.length > 0 && user.householdId && !t.householdIds.includes(user.householdId)) {
        return false;
      }
      if (t.wardIds && t.wardIds.length > 0 && user.wardId && !t.wardIds.includes(user.wardId)) {
        return false;
      }
    } else if (user.role === "supervisor") {
      if (t.wardIds && t.wardIds.length > 0 && user.wardId && !t.wardIds.includes(user.wardId)) {
        return false;
      }
    } else if (user.role === "gov") {
      if (t.departments && t.departments.length > 0 && user.department && !t.departments.includes(user.department)) {
        return false;
      }
    }

    return true;
  });
}
