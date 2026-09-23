import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";

export default function GeneralAcademicMockLayout({ children }: { children: React.ReactNode }) {
  requireGeneralAcademicEnabled();
  return children;
}
