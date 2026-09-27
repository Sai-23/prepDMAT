import type { Metadata } from "next";

import { AuthenticatedAppFrame } from "@/components/layout/authenticated-app-frame";
import { NoIndexLayout } from "@/components/layout/no-index-layout";
import { noIndexMetadata } from "@/lib/site-config";

export const metadata: Metadata = noIndexMetadata;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedAppFrame>
      <NoIndexLayout>{children}</NoIndexLayout>
    </AuthenticatedAppFrame>
  );
}
