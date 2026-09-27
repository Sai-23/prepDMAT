import { AuthenticatedAppFrame } from "@/components/layout/authenticated-app-frame";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";

export default function GeneralAcademicMockLayout({ children }: { children: React.ReactNode }) {
  requireGeneralAcademicEnabled();
  return <AuthenticatedAppFrame>{children}</AuthenticatedAppFrame>;
}
