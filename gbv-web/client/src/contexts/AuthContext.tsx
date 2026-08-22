/**
 * The web console reads identity and role exclusively from Django's profile
 * endpoint. JWTs stay in HTTP-only web-server cookies and are never persisted
 * in localStorage or exposed to the React application.
 */
import { createContext, ReactNode, useContext, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { AppRole, roleLabels } from "@/lib/rbac";

export type AppUser = { id: string; email: string; name: string; role: AppRole; isActive: boolean; requiresTotp: boolean };
type SignInResult = { requiresTotp: boolean; detail?: string };
type AuthContextValue = { user: AppUser | null; isReady: boolean; signIn: (email: string, password: string, totpCode?: string) => Promise<SignInResult>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapRole(role: "REPORTER" | "OFFICER" | "ADMIN"): AppRole {
  if (role === "ADMIN") return "administrator";
  if (role === "OFFICER") return "officer";
  return "reporter";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = trpc.gbvAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 });
  const login = trpc.gbvAuth.login.useMutation();
  const logout = trpc.gbvAuth.logout.useMutation();
  const utils = trpc.useUtils();
  const user = useMemo<AppUser | null>(() => session.data ? ({ id: session.data.id, email: session.data.email, name: session.data.full_name, role: mapRole(session.data.role), isActive: session.data.is_active, requiresTotp: session.data.requires_totp }) : null, [session.data]);

  useEffect(() => {
    if (user) document.title = `Sauti Yako | ${roleLabels[user.role].title}`;
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady: !session.isLoading,
    signIn: async (email, password, totpCode) => {
      const result = await login.mutateAsync({ email, password, totpCode });
      if (result.requires_totp) return { requiresTotp: true, detail: result.detail };
      await utils.gbvAuth.me.invalidate();
      return { requiresTotp: false };
    },
    signOut: async () => {
      await logout.mutateAsync();
      await utils.gbvAuth.me.invalidate();
    },
  }), [login, logout, session.isLoading, user, utils]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
