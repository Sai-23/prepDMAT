"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { generateGeneralAcademicPack } from "@/lib/general-academic/ai/generation";
import { generalAcademicGenerationConfigSchema } from "@/lib/general-academic/ai/generation-config";
import { getGamGenerationProviderStatus } from "@/lib/general-academic/ai/router";
import {
  addGeneralAcademicBatchSimilarity,
  GENERAL_ACADEMIC_BATCH_GENERATION_MAX,
  GENERAL_ACADEMIC_BATCH_IMPORT_MAX,
  parseGeneralAcademicBatchJson,
  type GeneralAcademicBatchImportItem,
} from "@/lib/general-academic/batch";
import { auditGeneralAcademicPackQuality, compareGeneralAcademicPacks, type GeneralAcademicInventoryPack } from "@/lib/general-academic/content-intelligence";
import { loadGeneralAcademicInventoryForAdmin } from "@/lib/general-academic/content-intelligence-data";
import { createGeneralAcademicContentFingerprint } from "@/lib/general-academic/fingerprint";
import { GeneralAcademicLifecycleError, transitionGeneralAcademicPack } from "@/lib/general-academic/lifecycle-persistence";
import { createGeneralAcademicDraft, GeneralAcademicPersistenceError } from "@/lib/general-academic/persistence";
import { canonicalGeneralAcademicPackSchema } from "@/lib/general-academic/schemas";
import { enforceSecurityRateLimit, RateLimitExceededError, SecurityControlUnavailableError } from "@/lib/security/rate-limit";

const batchGenerationSchema = z.object({
  config: z.unknown(),
  packCount: z.number().int().min(1).max(GENERAL_ACADEMIC_BATCH_GENERATION_MAX),
}).strict();

export type GeneralAcademicBatchGenerationItemResult = {
  index: number;
  status: "saved" | "failed";
  id?: string;
  title: string;
  message: string;
  warningCount: number;
  similarityKinds: string[];
};

export type GeneralAcademicBatchGenerationResult = {
  ok: boolean;
  message: string;
  items: GeneralAcademicBatchGenerationItemResult[];
};

function revalidatePhase8() {
  for (const path of [
    "/admin/general-academic",
    "/admin/general-academic/coverage",
    "/admin/general-academic/quality",
    "/admin/general-academic/review",
  ]) revalidatePath(path);
}

function generationFailureMessage(error: unknown) {
  if (error instanceof RateLimitExceededError) return `Generation limit reached. Try again in about ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`;
  if (error instanceof SecurityControlUnavailableError) return "Generation is temporarily unavailable because its security control could not be verified.";
  if (error instanceof GeneralAcademicPersistenceError) return error.message;
  return "This pack could not be generated safely.";
}

export async function generateGeneralAcademicBatchAction(input: unknown): Promise<GeneralAcademicBatchGenerationResult> {
  const { user } = await requireRole(["admin"]);
  const request = batchGenerationSchema.safeParse(input);
  if (!request.success) return { ok: false, message: `Choose between 1 and ${GENERAL_ACADEMIC_BATCH_GENERATION_MAX} packs and check the generation settings.`, items: [] };
  const config = generalAcademicGenerationConfigSchema.safeParse(request.data.config);
  if (!config.success) return { ok: false, message: "Check the generation settings and try again.", items: [] };
  if (!getGamGenerationProviderStatus().configured) return { ok: false, message: "AI generation is not configured.", items: [] };

  let comparisonInventory: GeneralAcademicInventoryPack[];
  try {
    comparisonInventory = await loadGeneralAcademicInventoryForAdmin(user.id);
  } catch {
    return { ok: false, message: "Inventory could not be loaded, so duplicate-safe batch generation did not start.", items: [] };
  }
  const items: GeneralAcademicBatchGenerationItemResult[] = [];
  for (let index = 0; index < request.data.packCount; index += 1) {
    try {
      await enforceSecurityRateLimit("generation:general-academic", { userId: user.id });
      const generated = await generateGeneralAcademicPack({
        ...config.data,
        batchVariation: { index: index + 1, count: request.data.packCount },
      });
      if (!generated.ok) {
        items.push({ index, status: "failed", title: `Pack ${index + 1}`, message: generated.error.message, warningCount: 0, similarityKinds: [] });
        continue;
      }
      const fingerprint = createGeneralAcademicContentFingerprint(generated.pack);
      const candidate: GeneralAcademicInventoryPack = { id: `generated-${index}`, pack: generated.pack, contentFingerprint: fingerprint, createdAt: "", updatedAt: "" };
      const quality = auditGeneralAcademicPackQuality(candidate);
      if (quality.blocking.length) {
        items.push({ index, status: "failed", title: generated.pack.title, message: "Generated content failed deterministic quality checks.", warningCount: quality.warnings.length, similarityKinds: [] });
        continue;
      }
      const similarities = comparisonInventory.map((existing) => compareGeneralAcademicPacks(candidate, existing)).filter((value) => value !== null);
      const stored = await createGeneralAcademicDraft(generated.pack, user.id);
      comparisonInventory.push({ id: stored.id, pack: stored.pack, contentFingerprint: stored.contentFingerprint, createdAt: stored.createdAt, updatedAt: stored.updatedAt, lifecycle: stored.lifecycle });
      items.push({
        index,
        status: "saved",
        id: stored.id,
        title: stored.pack.title,
        message: similarities.length ? "Draft saved with similarity alerts for human review." : "Draft saved for human review.",
        warningCount: quality.warnings.length,
        similarityKinds: [...new Set(similarities.flatMap((alert) => alert.kinds))],
      });
    } catch (error) {
      items.push({ index, status: "failed", title: `Pack ${index + 1}`, message: generationFailureMessage(error), warningCount: 0, similarityKinds: [] });
      if (error instanceof RateLimitExceededError || error instanceof SecurityControlUnavailableError) break;
    }
  }
  if (items.some((item) => item.status === "saved")) revalidatePhase8();
  const saved = items.filter((item) => item.status === "saved").length;
  return { ok: saved > 0, message: `${saved} of ${request.data.packCount} requested draft${request.data.packCount === 1 ? "" : "s"} saved.`, items };
}

export async function previewGeneralAcademicBatchImportAction(input: unknown): Promise<{ ok: boolean; message: string; items: GeneralAcademicBatchImportItem[] }> {
  const { user } = await requireRole(["admin"]);
  if (typeof input !== "string") return { ok: false, message: "Paste valid batch JSON.", items: [] };
  const items = parseGeneralAcademicBatchJson(input);
  let inventory: GeneralAcademicInventoryPack[];
  try {
    inventory = await loadGeneralAcademicInventoryForAdmin(user.id);
  } catch {
    return { ok: false, message: "Inventory could not be loaded, so duplicate-safe preview is unavailable.", items: [] };
  }
  const compared = addGeneralAcademicBatchSimilarity(items, inventory);
  return { ok: compared.some((item) => item.ok), message: `${compared.filter((item) => item.ok).length} of ${compared.length} packs are eligible to save as drafts.`, items: compared };
}

const batchSaveSchema = z.array(z.unknown()).min(1).max(GENERAL_ACADEMIC_BATCH_IMPORT_MAX);

export async function saveGeneralAcademicBatchImportAction(input: unknown): Promise<GeneralAcademicBatchGenerationResult> {
  const { user } = await requireRole(["admin"]);
  const selected = batchSaveSchema.safeParse(input);
  if (!selected.success) return { ok: false, message: `Select between 1 and ${GENERAL_ACADEMIC_BATCH_IMPORT_MAX} valid packs.`, items: [] };
  let comparisonInventory: GeneralAcademicInventoryPack[];
  try {
    comparisonInventory = await loadGeneralAcademicInventoryForAdmin(user.id);
  } catch {
    return { ok: false, message: "Inventory could not be loaded, so no drafts were saved.", items: [] };
  }
  const items: GeneralAcademicBatchGenerationItemResult[] = [];
  for (const [index, value] of selected.data.entries()) {
    const parsed = canonicalGeneralAcademicPackSchema.safeParse(value);
    if (!parsed.success || parsed.data.review.status !== "draft") {
      items.push({ index, status: "failed", title: `Pack ${index + 1}`, message: "Pack is invalid or does not have draft lifecycle status.", warningCount: 0, similarityKinds: [] });
      continue;
    }
    const fingerprint = createGeneralAcademicContentFingerprint(parsed.data);
    const candidate: GeneralAcademicInventoryPack = { id: `import-${index}`, pack: parsed.data, contentFingerprint: fingerprint, createdAt: "", updatedAt: "" };
    const quality = auditGeneralAcademicPackQuality(candidate);
    if (quality.blocking.length) {
      items.push({ index, status: "failed", title: parsed.data.title, message: "Pack failed deterministic quality checks.", warningCount: quality.warnings.length, similarityKinds: [] });
      continue;
    }
    try {
      const similarities = comparisonInventory.map((existing) => compareGeneralAcademicPacks(candidate, existing)).filter((value) => value !== null);
      const stored = await createGeneralAcademicDraft(parsed.data, user.id);
      comparisonInventory.push({ id: stored.id, pack: stored.pack, contentFingerprint: stored.contentFingerprint, createdAt: stored.createdAt, updatedAt: stored.updatedAt, lifecycle: stored.lifecycle });
      items.push({ index, status: "saved", id: stored.id, title: stored.pack.title, message: similarities.length ? "Draft saved with similarity alerts." : "Draft saved.", warningCount: quality.warnings.length, similarityKinds: [...new Set(similarities.flatMap((alert) => alert.kinds))] });
    } catch (error) {
      items.push({ index, status: "failed", title: parsed.data.title, message: error instanceof GeneralAcademicPersistenceError ? error.message : "Draft could not be saved.", warningCount: quality.warnings.length, similarityKinds: [] });
    }
  }
  if (items.some((item) => item.status === "saved")) revalidatePhase8();
  const saved = items.filter((item) => item.status === "saved").length;
  return { ok: saved > 0, message: `${saved} of ${selected.data.length} selected draft${selected.data.length === 1 ? "" : "s"} saved.`, items };
}

const bulkLifecycleSchema = z.object({
  packIds: z.array(z.string().uuid()).min(1).max(20),
  target: z.enum(["needs_review", "published"]),
}).strict();

export async function bulkTransitionGeneralAcademicPacksAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const request = bulkLifecycleSchema.safeParse(input);
  if (!request.success) return { ok: false, message: "Select valid packs and an allowed bulk transition.", items: [] as Array<{ id: string; ok: boolean; message: string }> };
  const items: Array<{ id: string; ok: boolean; message: string }> = [];
  for (const id of [...new Set(request.data.packIds)]) {
    try {
      const result = await transitionGeneralAcademicPack(id, request.data.target, {}, user.id);
      items.push({ id, ok: true, message: `Changed from ${result.from.replaceAll("_", " ")} to ${result.to.replaceAll("_", " ")}.` });
    } catch (error) {
      items.push({ id, ok: false, message: error instanceof GeneralAcademicLifecycleError ? error.message : "Lifecycle transition failed." });
    }
  }
  if (items.some((item) => item.ok)) revalidatePhase8();
  return { ok: items.some((item) => item.ok), message: `${items.filter((item) => item.ok).length} of ${items.length} transitions completed.`, items };
}
