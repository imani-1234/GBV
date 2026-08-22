/**
 * Style reminder — Zanzibar Civic Ledger: denied access is direct, non-punitive,
 * and always provides an obvious route to the correct protected workspace.
 */
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function AccessDenied() {
  const [, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const isReporter = user?.role === "reporter";
  const copy = isReporter
    ? "Your reporter account does not have access to the officer and administrator operations console. Use the reporter application to create or follow up on a personal report."
    : user?.role === "officer"
      ? "Officer access is focused on assigned casework, follow-up, and report review."
      : "Administrator access is focused on report oversight, system intelligence, and governance.";

  return <div className="access-denied"><div className="access-denied__icon"><ShieldAlert size={24} /></div><div className="eyebrow">Role boundary</div><h1>{isReporter ? "This console is reserved for safeguarding staff." : "This area is not in your workspace."}</h1><p>{copy}</p><button className="button button--primary" onClick={() => { if (isReporter) { void signOut(); navigate("/login"); return; } navigate("/"); }}><ArrowLeft size={17} /> {isReporter ? "Sign out" : "Return to command center"}</button></div>;
}
