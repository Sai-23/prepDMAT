import { headers } from "next/headers";

import { PublicAppFrame } from "@/components/layout/public-app-frame";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Next.js can only attach the per-request CSP nonce to framework scripts
  // during request rendering. This read intentionally preserves that security
  // contract while the public shell avoids all auth and database work.
  await headers();
  return <PublicAppFrame>{children}</PublicAppFrame>;
}
