/**
 * Style reminder — Zanzibar Civic Ledger: permissions are explicit, compact,
 * and legible; every menu item and action maps to a defined responsibility.
 */
export type AppRole = "officer" | "administrator" | "reporter";

export type AppPermission =
  | "dashboard:view"
  | "cases:view"
  | "cases:follow_up"
  | "cases:message"
  | "reports:view"
  | "reports:review"
  | "reports:export"
  | "intelligence:view"
  | "team:view"
  | "team:manage"
  | "audit:view"
  | "settings:manage";

export type NavKey = "dashboard" | "cases" | "reports" | "analytics" | "team" | "audit" | "settings";

export type NavDefinition = {
  key: NavKey;
  label: string;
  href: string;
  section: "operations" | "governance";
  permission: AppPermission;
};

export const navigationDefinitions: NavDefinition[] = [
  { key: "dashboard", label: "Command center", href: "/", section: "operations", permission: "dashboard:view" },
  { key: "cases", label: "My case queue", href: "/cases", section: "operations", permission: "cases:view" },
  { key: "reports", label: "Reports", href: "/reports", section: "operations", permission: "reports:view" },
  { key: "analytics", label: "Intelligence", href: "/analytics", section: "governance", permission: "intelligence:view" },
  { key: "team", label: "Team capacity", href: "/team", section: "governance", permission: "team:view" },
  { key: "audit", label: "Audit activity", href: "/audit", section: "governance", permission: "audit:view" },
  { key: "settings", label: "Workspace settings", href: "/settings", section: "governance", permission: "settings:manage" },
];

const rolePermissions: Record<AppRole, AppPermission[]> = {
  officer: ["dashboard:view", "cases:view", "cases:follow_up", "cases:message", "reports:view", "reports:review"],
  administrator: ["dashboard:view", "reports:view", "reports:review", "reports:export", "intelligence:view", "team:view", "team:manage", "audit:view", "settings:manage"],
  reporter: [],
};

export const roleLabels: Record<AppRole, { title: string; subtitle: string; initials: string }> = {
  officer: { title: "Safeguarding officer", subtitle: "Casework and follow-up", initials: "SO" },
  administrator: { title: "Administrator", subtitle: "Governance and oversight", initials: "AD" },
  reporter: { title: "Reporter", subtitle: "Reporter access", initials: "RP" },
};

export function can(role: AppRole, permission: AppPermission) {
  return rolePermissions[role].includes(permission);
}

export function navigationForRole(role: AppRole) {
  return navigationDefinitions.filter((item) => can(role, item.permission));
}
