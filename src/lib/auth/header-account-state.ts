import { resolveDisplayName } from "@/lib/auth/display-name";
import type { HeaderAccountState } from "@/types/auth";

export type BrowserAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export function reconcileHeaderAccount(
  current: HeaderAccountState | null,
  user: BrowserAuthUser | null,
): HeaderAccountState | null {
  if (!user) return null;
  const sameUser = current?.userId === user.id;

  return {
    userId: user.id,
    displayName: sameUser
      ? current.displayName
      : resolveDisplayName({
          metadataDisplayName: user.user_metadata?.display_name,
          metadataFullName: user.user_metadata?.full_name,
          email: user.email,
        }),
    workspace: sameUser ? current.workspace : null,
  };
}
