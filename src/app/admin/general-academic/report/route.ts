import { requireRole } from "@/lib/auth/guards";
import { exportGeneralAcademicContentReportCsv } from "@/lib/general-academic/content-intelligence";
import { loadGeneralAcademicInventoryForAdmin } from "@/lib/general-academic/content-intelligence-data";

export async function GET() {
  const { user } = await requireRole(["admin"]);
  const inventory = await loadGeneralAcademicInventoryForAdmin(user.id);
  return new Response(exportGeneralAcademicContentReportCsv(inventory), {
    headers: {
      "Content-Disposition": 'attachment; filename="prepdmat-gam-content-report.csv"',
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
