import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";

export default function GeneralAcademicPracticeLayout({ children }: { children: React.ReactNode }) {
  requireGeneralAcademicEnabled();
  return children;
}
