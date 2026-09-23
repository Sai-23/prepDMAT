import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";

export default function GeneralAcademicProgressLayout({ children }: { children: React.ReactNode }) {
  requireGeneralAcademicEnabled();
  return children;
}
