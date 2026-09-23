import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

export function exportGeneralAcademicPackJson(pack: CanonicalGeneralAcademicPack) {
  const canonical = canonicalGeneralAcademicPackSchema.parse(pack);
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

