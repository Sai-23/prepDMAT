import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function localEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        return [line.slice(0, separator), value];
      }),
  );
}

const env = localEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Phase 12 live audit requires the configured Supabase URL, anon key, and service-role key.");
}

const options = { auth: { autoRefreshToken: false, persistSession: false } };
const anon = createClient(url, anonKey, options);
const service = createClient(url, serviceKey, options);

const schemaChecks = [
  ["profiles", "id,onboarding_completed_at,onboarding_preference,diagnostic_status,diagnostic_session_id"],
  ["test_attempts", "id,test_id,generated_mock_id,mock_origin,display_title,user_id,status,mock_seed,protocol_version,generator_versions,question_fingerprints,current_section_key,current_question_key"],
  ["practice_attempt_items", "attempt_id,source_question_id,question_key,test_section_id,section_key,public_snapshot,private_snapshot,fingerprint"],
  ["user_responses", "attempt_id,question_id,question_key,response_status,response_payload,is_correct"],
  ["generated_core_mocks", "id,user_id,generation_request_id,status,attempt_id,mock_seed,protocol_version,assembler_version,fingerprints,structural_profiles,family_sequences,difficulty_sequences,quality_score,critical_gate_passed"],
  ["core_mock_generation_events", "id,user_id,mock_id,event_type,module,duration_ms,retry_count,novelty_rejection_count,validation_rejection_count,metadata"],
  ["practice_sessions", "id,user_id,module,difficulty_mode,question_count,timing_mode,source_mode,session_type,status,current_position,expires_at"],
  ["practice_session_items", "id,session_id,question_key,position,question_type,difficulty,public_snapshot,private_snapshot,response_status,response_payload,is_correct,fingerprint,structural_profile"],
  ["practice_events", "id,user_id,session_id,question_key,event_type,metadata,created_at"],
  ["question_reports", "id,question_id,practice_session_item_id,reporter_id"],
];

const restrictedTables = [
  "generated_core_mocks",
  "core_mock_generation_events",
  "practice_sessions",
  "practice_session_items",
  "practice_events",
];

const rpcChecks = [
  ["reserve_generated_core_mock", {
    p_user_id: crypto.randomUUID(),
    p_generation_request_id: crypto.randomUUID(),
    p_mock_seed: "",
    p_cooldown_seconds: 0,
    p_protocol_version: "phase12-probe",
    p_assembler_version: "phase12-probe",
  }, "mock_seed_required"],
  ["create_practice_session", {
    p_session_id: crypto.randomUUID(),
    p_user_id: crypto.randomUUID(),
    p_module: "figure_sequence",
    p_difficulty_mode: "easy",
    p_question_count: 5,
    p_timing_mode: "untimed",
    p_source_mode: "generated",
    p_master_seed: "",
    p_started_at: new Date().toISOString(),
    p_expires_at: null,
    p_retry_of_session_id: null,
    p_focus_families: [],
    p_items: [],
  }, "practice_seed_required"],
  ["create_initial_core_diagnostic", {
    p_session_id: crypto.randomUUID(),
    p_user_id: crypto.randomUUID(),
    p_master_seed: "",
    p_started_at: new Date().toISOString(),
    p_items: [],
  }, "diagnostic_seed_required"],
  ["create_core_mock_attempt", {
    p_attempt_id: crypto.randomUUID(),
    p_test_id: crypto.randomUUID(),
    p_user_id: crypto.randomUUID(),
    p_mock_seed: "",
    p_protocol_version: "phase12-probe",
    p_generator_versions: {},
    p_question_fingerprints: {},
    p_test_snapshot: {},
    p_items: [],
    p_response_question_ids: [],
    p_started_at: new Date().toISOString(),
    p_expires_at: new Date().toISOString(),
    p_current_section_id: crypto.randomUUID(),
    p_section_expires_at: new Date().toISOString(),
    p_current_question_id: crypto.randomUUID(),
  }, "mock seed"],
];

const report = {
  target: url.includes("localhost") || url.includes("127.0.0.1") ? "local" : "remote-unclassified",
  generatedAt: new Date().toISOString(),
  schema: [],
  anonymousIsolation: [],
  rpc: [],
  latency: [],
};

function errorDetails(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message || null,
    details: error.details || null,
    hint: error.hint || null,
  };
}

function percentile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1);
  return ordered[index];
}

for (const [table, columns] of schemaChecks) {
  const started = performance.now();
  const { error } = await service.from(table).select(columns, { head: true }).limit(1);
  report.schema.push({
    table,
    ok: !error,
    latencyMs: Math.round((performance.now() - started) * 10) / 10,
    error: errorDetails(error),
  });
}

for (const [area, table, columns] of [
  ["dashboard/progress", "test_attempts", "id,status"],
  ["practice session load", "practice_session_items", "id,session_id,position"],
  ["mock attempt load/results", "practice_attempt_items", "id,attempt_id"],
  ["on-demand mock state", "generated_core_mocks", "id,status"],
  ["diagnostic state", "practice_sessions", "id,session_type,status"],
]) {
  const samples = [];
  let error = null;
  for (let sample = 0; sample < 7; sample += 1) {
    const started = performance.now();
    const result = await service.from(table).select(columns, { head: true }).limit(1);
    samples.push(Math.round((performance.now() - started) * 10) / 10);
    if (result.error) {
      error = result.error;
      break;
    }
  }
  report.latency.push({
    area,
    samples: samples.length,
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    maxMs: Math.max(...samples),
    error: errorDetails(error),
  });
}

for (const table of restrictedTables) {
  const { error } = await anon.from(table).select("*").limit(1);
  report.anonymousIsolation.push({
    table,
    blocked: Boolean(error),
    errorCode: error?.code ?? null,
  });
}

for (const [name, args, expectedError] of rpcChecks) {
  const serviceResult = await service.rpc(name, args);
  const anonResult = await anon.rpc(name, args);
  report.rpc.push({
    name,
    exists: !serviceResult.error || serviceResult.error.code !== "PGRST202",
    safeValidationReached: serviceResult.error?.message?.toLowerCase().includes(expectedError) ?? false,
    serviceErrorCode: serviceResult.error?.code ?? null,
    serviceError: errorDetails(serviceResult.error),
    anonymousBlocked: Boolean(anonResult.error),
    anonymousErrorCode: anonResult.error?.code ?? null,
  });
}

console.log(JSON.stringify(report, null, 2));
