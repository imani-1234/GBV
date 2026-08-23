/**
 * Style reminder — Zanzibar Civic Ledger: midnight command rail, role-bounded
 * navigation, and calm mobile-first actions with no unnecessary controls.
 */
import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, Bell, BriefcaseBusiness, ChevronDown, ClipboardList, LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/branding/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { navigationForRole, NavDefinition, roleLabels } from "@/lib/rbac";

const navIcons = { dashboard: LayoutDashboard, cases: BriefcaseBusiness, reports: ClipboardList, analytics: BarChart3, team: UsersRound, audit: Activity, settings: Settings };

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavGroup({ items, pathname, navigate, onNavigate }: { items: NavDefinition[]; pathname: string; navigate: (to: string) => void; onNavigate: () => void }) {
  return <div className="nav-group">{items.map((item) => {
    const Icon = navIcons[item.key];
    const active = isCurrent(pathname, item.href);
    return <button key={item.href} className={`nav-item ${active ? "nav-item--active" : ""}`} onClick={() => { navigate(item.href); onNavigate(); }}><Icon size={18} strokeWidth={active ? 2.3 : 1.8} /><span>{item.label}</span></button>;
  })}</div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [pathname, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  if (!user) return null;

  const role = roleLabels[user.role];
  const menuItems = navigationForRole(user.role);
  const primaryNav = menuItems.filter((item) => item.section === "operations");
  const secondaryNav = menuItems.filter((item) => item.section === "governance");
  const primaryAction = user.role === "officer" ? { label: "Record follow-up", href: "/cases" } : { label: "Review reports", href: "/reports" };

  const isOfficer = user.role === "officer";

  return <div className={`app-shell ${isOfficer ? "app-shell--officer" : ""}`}>
    <aside className={`command-rail ${isOfficer ? "command-rail--officer" : ""} ${menuOpen ? "command-rail--open" : ""}`}>
      <div className="rail-head"><BrandMark inverse /><button className="mobile-dismiss" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
      <div className="rail-context"><button className="role-switcher" onClick={() => toast.info("Your menus and actions are assigned through your safeguarding role.")}><span className="role-switcher__dot" /><span><strong>{role.title}</strong><small>{role.subtitle}</small></span><ChevronDown size={15} /></button></div>
      <nav className="rail-nav" aria-label="Main navigation"><p className="nav-caption">Operations</p><NavGroup items={primaryNav} pathname={pathname} navigate={navigate} onNavigate={() => setMenuOpen(false)} />{secondaryNav.length > 0 && <><p className="nav-caption nav-caption--lower">Governance</p><NavGroup items={secondaryNav} pathname={pathname} navigate={navigate} onNavigate={() => setMenuOpen(false)} /></>}</nav>
      <div className="rail-foot"><div className="privacy-pledge"><ShieldCheck size={17} /><span>Restricted case workspace</span></div><button className="profile-card" onClick={() => { void signOut(); navigate("/login"); }} title="Sign out"><div className="profile-card__avatar">{role.initials}</div><div><strong>{user.name}</strong><small>Sign out</small></div><ChevronDown size={16} /></button></div>
    </aside>
    <div className={`rail-scrim ${menuOpen ? "rail-scrim--visible" : ""}`} onClick={() => setMenuOpen(false)} />
    <main className={`workbench ${isOfficer ? "workbench--officer" : ""}`}><header className="topbar"><button className="menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button><button className="search-trigger" onClick={() => toast.info("Use the live case queue search to find records available to your safeguarding role.")}><Search size={18} /><span>{isOfficer ? "Search your casework" : "Search live casework"}</span><kbd>⌘ K</kbd></button><div className="topbar-actions"><button className="icon-button" aria-label="Notifications" onClick={() => toast.info("Notification delivery remains managed by the Django safeguarding service.")}><Bell size={19} /><span className="notification-dot" /></button><button className="new-action" onClick={() => navigate(primaryAction.href)}><Plus size={18} /> {primaryAction.label}</button></div></header><div className="workspace-banner"><span className="workspace-banner__signal" /> {isOfficer ? "PRIVATE CASEWORK SPACE" : "LIVE DJANGO WORKSPACE"} <span>{isOfficer ? "Your view is restricted to safeguarding work assigned through your approved officer role." : "Connected to the local safeguarding API. Handle all records according to approved privacy policy."}</span></div><section className="page-frame">{children}</section></main>
  </div>;
}
