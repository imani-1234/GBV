/**
 * Secure Django authentication entry point. Roles are assigned by the backend,
 * never selected in the browser, and compatible with future TOTP enforcement.
 */
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BrandMark } from "@/components/branding/BrandMark";
import { COMMAND_HERO_URL } from "@/lib/demo-data";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Enter your work email and password to continue."); return; }
    setError(""); setIsSubmitting(true);
    try {
      const result = await signIn(email.trim(), password, totpCode.trim() || undefined);
      if (result.requiresTotp) { setNeedsTotp(true); setError(result.detail || "Enter the code from your authenticator app."); return; }
      toast.success("Secure workspace opened", { description: "Your Django role and access boundaries are now active." });
      navigate("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not sign you in. Check your credentials and try again.");
    } finally { setIsSubmitting(false); }
  };

  return <main className="login-page"><section className="login-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(5,25,42,.68), rgba(5,25,42,.93)), url(${COMMAND_HERO_URL})` }}><div className="login-visual__head"><BrandMark inverse /></div><div className="login-visual__story"><div className="eyebrow eyebrow--light"><ShieldCheck size={14} /> Secure safeguarding workspace</div><h1>Clarity for every<br /><em>responsible action.</em></h1><p>A private operational console for safeguarded reporting, case follow-up, and accountable oversight.</p></div><div className="login-visual__assurance"><LockKeyhole size={17} /><span>Access is determined by your verified Django account and safeguarding role.</span></div></section><section className="login-panel"><div className="login-panel__inner"><div className="login-mobile-brand"><BrandMark /></div><div className="eyebrow">Sauti Yako workspace</div><h2>Sign in to continue</h2><p className="login-copy">Your account determines whether you enter officer casework or administrator oversight. No role is selected in the browser.</p><div className="secure-threshold" aria-label="Protected workspace controls"><LockKeyhole size={16} /><div><strong>Protected operational threshold</strong><span>Identity checked <i /> scope assigned <i /> record preserved</span></div></div><form onSubmit={submit} className="login-form"><label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>{needsTotp && <label>Authenticator code<input inputMode="numeric" pattern="[0-9]*" value={totpCode} onChange={(event) => setTotpCode(event.target.value)} autoComplete="one-time-code" placeholder="6-digit code" /></label>}{error && <p className="login-error" role="alert">{error}</p>}<button type="submit" className="login-submit" disabled={isSubmitting}>{isSubmitting ? "Verifying secure access…" : "Open secure workspace"} <ArrowRight size={18} /></button></form><div className="login-notice"><LockKeyhole size={15} /><span>Authentication is provided by the connected Sauti Yako Django service.</span></div></div></section></main>;
}
