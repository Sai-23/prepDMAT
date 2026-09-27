import { PublicSiteHeader } from "@/components/layout/public-site-header";
import { ThemeProvider } from "@/components/providers/theme-provider";

export function PublicAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="relative flex min-h-screen flex-col bg-background" data-app-frame>
        <PublicSiteHeader />
        <main className="min-h-0 flex-1" data-site-main>{children}</main>
      </div>
    </ThemeProvider>
  );
}
