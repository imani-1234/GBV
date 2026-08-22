/**
 * Style reminder — Zanzibar Civic Ledger: calm operational data, navy authority,
 * lagoon-active states, and clearly marked demonstration workspace content.
 */
export type CaseStatus = "New" | "Under review" | "Assigned" | "Follow-up" | "Resolved";
export type CasePriority = "Critical" | "High" | "Medium" | "Low";

export type CaseRecord = {
  id: string;
  category: string;
  campus: string;
  status: CaseStatus;
  priority: CasePriority;
  age: string;
  updated: string;
  owner: string;
  due: string;
  nextAction: string;
  safety: "Immediate" | "Standard" | "Monitoring";
};

export const APP_MARK_URL = "/manus-storage/sauti-yako-web-appmark_ba0f0788.png";
export const COMMAND_HERO_URL = "/manus-storage/sauti-yako-command-hero_3050c99b.jpg";
export const FOLLOW_UP_VISUAL_URL = "/manus-storage/sauti-yako-followup-visual_2f3e7e17.jpg";
export const ANALYTICS_VISUAL_URL = "/manus-storage/sauti-yako-analytics-visual_16862357.jpg";

export const cases: CaseRecord[] = [
  { id: "GBV-26-0438", category: "Harassment", campus: "Tunguu", status: "New", priority: "Critical", age: "18 min", updated: "Now", owner: "Unassigned", due: "Within 45 min", nextAction: "Safeguarding triage", safety: "Immediate" },
  { id: "GBV-26-0437", category: "Intimate partner violence", campus: "Stone Town", status: "Under review", priority: "High", age: "2 h", updated: "18 min ago", owner: "A. Mussa", due: "Today, 14:00", nextAction: "Confirm safe contact method", safety: "Immediate" },
  { id: "GBV-26-0435", category: "Sexual harassment", campus: "Vuga", status: "Assigned", priority: "High", age: "1 d", updated: "42 min ago", owner: "F. Juma", due: "Today, 16:30", nextAction: "Record first response", safety: "Standard" },
  { id: "GBV-26-0432", category: "Digital abuse", campus: "Tunguu", status: "Follow-up", priority: "Medium", age: "3 d", updated: "2 h ago", owner: "A. Mussa", due: "Tomorrow", nextAction: "Review support referral", safety: "Monitoring" },
  { id: "GBV-26-0429", category: "Threats and intimidation", campus: "Stone Town", status: "Follow-up", priority: "High", age: "4 d", updated: "5 h ago", owner: "F. Juma", due: "Tomorrow", nextAction: "Second welfare check", safety: "Monitoring" },
  { id: "GBV-26-0424", category: "Sexual assault", campus: "Vuga", status: "Resolved", priority: "Critical", age: "8 d", updated: "Yesterday", owner: "M. Said", due: "Closed", nextAction: "Archive safeguarding record", safety: "Standard" },
];

export const kpis = [
  { label: "Open safeguarding cases", value: "24", detail: "6 require action today", tone: "navy", trend: "+3 this week" },
  { label: "First-response median", value: "42m", detail: "Target: under 60 minutes", tone: "turquoise", trend: "12m faster" },
  { label: "Follow-ups on time", value: "91%", detail: "32 of 35 due actions", tone: "green", trend: "+5.4 pts" },
  { label: "Escalations in review", value: "3", detail: "Senior officer attention", tone: "coral", trend: "No change" },
];

export const caseTrend = [
  { period: "May", received: 16, resolved: 11 },
  { period: "Jun", received: 19, resolved: 14 },
  { period: "Jul", received: 22, resolved: 17 },
  { period: "Aug", received: 18, resolved: 18 },
  { period: "Sep", received: 24, resolved: 19 },
  { period: "Oct", received: 21, resolved: 20 },
];

export const categoryMix = [
  { name: "Harassment", value: 34, fill: "#0F9FAF" },
  { name: "Digital abuse", value: 21, fill: "#1F8068" },
  { name: "Violence", value: 18, fill: "#D77A60" },
  { name: "Other", value: 27, fill: "#D9A441" },
];

export const followUps = [
  { title: "Safe-contact preference confirmed", owner: "A. Mussa", time: "09:12", state: "Complete" },
  { title: "Counselling referral check-in", owner: "F. Juma", time: "Due 14:00", state: "Due today" },
  { title: "Case note quality review", owner: "M. Said", time: "Due tomorrow", state: "Planned" },
];

export const activities = [
  { time: "09:12", title: "Safe contact method updated", detail: "GBV-26-0437 · A. Mussa" },
  { time: "08:48", title: "New critical report received", detail: "GBV-26-0438 · Unassigned" },
  { time: "08:20", title: "Follow-up marked complete", detail: "GBV-26-0429 · F. Juma" },
  { time: "Yesterday", title: "Monthly safeguarding brief generated", detail: "Administrator workspace" },
];

export const officers = [
  { initials: "AM", name: "Asha Mussa", role: "Safeguarding officer", load: 7, response: "37m", state: "Available" },
  { initials: "FJ", name: "Fatma Juma", role: "Case follow-up officer", load: 6, response: "44m", state: "In review" },
  { initials: "MS", name: "Mbarouk Said", role: "Senior safeguarding officer", load: 5, response: "39m", state: "Available" },
  { initials: "ZN", name: "Zainab Nasser", role: "Counselling liaison", load: 4, response: "48m", state: "Field support" },
];
