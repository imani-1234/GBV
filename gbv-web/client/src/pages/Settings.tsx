/**
 * Style reminder — Zanzibar Civic Ledger: settings are simple, bounded, and
 * transparent about actual live connection and access state.
 */
import { Database, KeyRound, ShieldCheck, Webhook } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { roleLabels } from "@/lib/rbac";

export default function Settings() {
  const { user } = useAuth();
  const health = trpc.gbv.health.useQuery(undefined, { retry: false, refetchInterval: 60_000 });
  const rows = [
    { icon: Database, title: "GBV backend connection", detail: health.isSuccess ? "Connected to the configured local Django REST API. Health endpoint reports operational." : health.isLoading ? "Checking the configured Django REST API health endpoint…" : "Django API health check is unavailable. Confirm the local server is running on port 8000.", action: health.isSuccess ? "Connected" : "Check connection" },
    { icon: KeyRound, title: "Web authentication", detail: user ? `Authenticated as ${user.email}. Django-issued JWTs are retained in HTTP-only web-session cookies.` : "No Django safeguarding session is active.", action: user ? "Active session" : "Sign-in required" },
    { icon: ShieldCheck, title: "Role permissions", detail: user ? `${roleLabels[user.role].title} permissions are derived from the Django profile, not selected in the browser.` : "Role is evaluated after Django authentication.", action: user ? roleLabels[user.role].title : "No role" },
    { icon: Webhook, title: "Governance exports", detail: "Administrator intelligence and audit pages can prepare de-identified text exports from live aggregate API responses.", action: "Available" },
  ];
  return <div className="page-stack"><section className="page-title-row"><div><div className="eyebrow">System configuration</div><h1>Workspace settings</h1><p>Live connection state for the web console and its existing Django safeguarding system.</p></div></section><article className="surface-card settings-card">{rows.map((row) => { const Icon = row.icon; return <div className="settings-row" key={row.title}><div className="settings-icon"><Icon size={19} /></div><div><strong>{row.title}</strong><p>{row.detail}</p></div><span className={`availability ${row.action === "Connected" || row.action === "Active session" || row.action === "Available" ? "availability--available" : "availability--away"}`}>{row.action}</span></div>; })}</article></div>;
}
