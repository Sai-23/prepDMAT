import { parseGeneralAcademicPackJson, type GeneralAcademicImportResult } from "./importer";
import { GENERAL_ACADEMIC_LIMITS } from "./limits";

export type GeneralAcademicUploadInput = {
  name: string;
  size: number;
  text: string;
};

function uploadFailure(code: string, message: string): GeneralAcademicImportResult {
  return { ok: false, errors: [{ code, path: "$", message, severity: "error" }], warnings: [] };
}

export function parsePastedGeneralAcademicJson(text: string) {
  return parseGeneralAcademicPackJson(text);
}

export function parseUploadedGeneralAcademicJson(file: GeneralAcademicUploadInput) {
  if (!file.name.toLocaleLowerCase("en").endsWith(".json")) {
    return uploadFailure("INVALID_FILE_TYPE", "Choose a .json file.");
  }
  if (file.size > GENERAL_ACADEMIC_LIMITS.totalJsonBytes) {
    return uploadFailure("INPUT_TOO_LARGE", "General Academic JSON exceeds the 512 KB import limit.");
  }
  return parseGeneralAcademicPackJson(file.text);
}
