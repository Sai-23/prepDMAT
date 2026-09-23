import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findGeneralAcademicPacksByFingerprintForAdmin,
  listGeneralAcademicDraftsForAdmin,
  type GeneralAcademicCatalogRepository,
  type GeneralAcademicDraftSummary,
} from "./persistence";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const STUDENT_ID = "00000000-0000-4000-8000-000000000020";
const summary: GeneralAcademicDraftSummary = {
  id: "00000000-0000-4000-8000-000000000030",
  title: "Energy systems",
  domain: "engineering",
  topic: "Energy efficiency",
  difficulty: "medium",
  origin: "manual",
  reviewStatus: "draft",
  questionCount: 4,
  contentFingerprint: "general-academic-pack:v1:1234567890abcdef",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

function repository(): GeneralAcademicCatalogRepository {
  return {
    isAdmin: async (userId) => userId === ADMIN_ID,
    listDrafts: async () => [summary],
    findByFingerprint: async () => [{ id: summary.id, title: summary.title }],
  };
}

describe("General Academic admin catalog persistence", () => {
  it("loads draft-list metadata for a verified administrator", async () => {
    await expect(listGeneralAcademicDraftsForAdmin(ADMIN_ID, repository())).resolves.toEqual([summary]);
  });

  it("blocks student draft-list access", async () => {
    await expect(listGeneralAcademicDraftsForAdmin(STUDENT_ID, repository())).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });

  it("loads exact fingerprint matches without semantic deletion or overwrite", async () => {
    await expect(findGeneralAcademicPacksByFingerprintForAdmin(summary.contentFingerprint, ADMIN_ID, repository())).resolves.toEqual([{ id: summary.id, title: summary.title }]);
  });

  it("blocks non-admin duplicate lookup", async () => {
    await expect(findGeneralAcademicPacksByFingerprintForAdmin(summary.contentFingerprint, STUDENT_ID, repository())).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});
