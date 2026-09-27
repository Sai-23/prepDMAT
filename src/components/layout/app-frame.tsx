import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { RootAuthState } from "@/lib/auth/root-auth-state";

export function AppFrame({
  authState,
  children,
}: {
  authState: RootAuthState;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme={authState.theme}>
      <div className="relative flex min-h-screen flex-col bg-background" data-app-frame>
        <SiteHeader
          diagnosticStatus={authState.diagnosticStatus}
          initialAccount={authState.account}
        />
        <main className="min-h-0 flex-1" data-site-main>{children}</main>
      </div>
    </ThemeProvider>
  );
}
