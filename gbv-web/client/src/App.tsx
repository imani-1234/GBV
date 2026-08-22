/**
 * Style reminder — Zanzibar Civic Ledger: all routes live inside one calm,
 * persistent command shell so there are no navigational dead ends.
 */
import type { ComponentType } from "react";
import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import CommandCenter from "@/pages/CommandCenter";
import CaseQueue from "@/pages/CaseQueue";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import Team from "@/pages/Team";
import Audit from "@/pages/Audit";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import AccessDenied from "@/pages/AccessDenied";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppPermission, can } from "@/lib/rbac";

function withShell(Page: ComponentType, permission: AppPermission) {
  return function ShellRoute() {
    const { user, isReady } = useAuth();
    if (!isReady) return <div className="app-loading">Loading secure workspace…</div>;
    if (!user) return <Login />;
    if (!can(user.role, permission)) return <AccessDenied />;
    return <AppShell><Page /></AppShell>;
  };
}

const DashboardRoute = withShell(CommandCenter, "dashboard:view");
const CasesRoute = withShell(CaseQueue, "cases:view");
const ReportsRoute = withShell(Reports, "reports:view");
const AnalyticsRoute = withShell(Analytics, "intelligence:view");
const TeamRoute = withShell(Team, "team:view");
const AuditRoute = withShell(Audit, "audit:view");
const SettingsRoute = withShell(Settings, "settings:manage");
function Router() {
  // make sure to consider if you need authentication for certain routes
  return <Switch>
    <Route path="/login" component={Login} />
    <Route path="/" component={DashboardRoute} />
    <Route path="/cases" component={CasesRoute} />
    <Route path="/reports" component={ReportsRoute} />
    <Route path="/analytics" component={AnalyticsRoute} />
    <Route path="/team" component={TeamRoute} />
    <Route path="/audit" component={AuditRoute} />
    <Route path="/settings" component={SettingsRoute} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><AuthProvider><TooltipProvider><Toaster position="top-right" richColors /><Router /></TooltipProvider></AuthProvider></ThemeProvider></ErrorBoundary>;
}
