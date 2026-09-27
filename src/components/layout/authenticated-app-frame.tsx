import { AppFrame } from "@/components/layout/app-frame";
import { resolveRootAuthState } from "@/lib/auth/root-auth-state";

export async function AuthenticatedAppFrame({ children }: { children: React.ReactNode }) {
  const authState = await resolveRootAuthState();
  return <AppFrame authState={authState}>{children}</AppFrame>;
}
