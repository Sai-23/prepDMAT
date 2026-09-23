import type { JsonValue } from "@/lib/generation/types";

import { GENERAL_ACADEMIC_LIMITS } from "./limits";

// Phase 1 stores plain text and structured data only. Reject every HTML-like
// tag, not just an allowlist of known executable elements, so future renderers
// cannot accidentally turn imported markup into active content.
const EXECUTABLE_MARKUP = /<\s*\/?\s*[a-z][^>]*>|javascript\s*:|\bon[a-z]+\s*=/i;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function containsExecutableContent(value: string) {
  return EXECUTABLE_MARKUP.test(value);
}

export type StructuredDataSafetyFailure = {
  code: "STRUCTURED_DATA_DEPTH" | "STRUCTURED_DATA_SIZE" | "UNSAFE_STRUCTURED_KEY" | "EXECUTABLE_CONTENT";
  path: string;
  message: string;
};

export function inspectStructuredData(
  value: JsonValue,
  rootPath = "data",
): StructuredDataSafetyFailure | null {
  let nodes = 0;

  const visit = (current: JsonValue, path: string, depth: number): StructuredDataSafetyFailure | null => {
    nodes += 1;
    if (nodes > GENERAL_ACADEMIC_LIMITS.structuredDataNodes) {
      return {
        code: "STRUCTURED_DATA_SIZE",
        path,
        message: "Structured figure data contains too many values.",
      };
    }
    if (depth > GENERAL_ACADEMIC_LIMITS.structuredDataDepth) {
      return {
        code: "STRUCTURED_DATA_DEPTH",
        path,
        message: `Structured figure data cannot exceed ${GENERAL_ACADEMIC_LIMITS.structuredDataDepth} nested levels.`,
      };
    }
    if (typeof current === "string" && containsExecutableContent(current)) {
      return {
        code: "EXECUTABLE_CONTENT",
        path,
        message: "Executable HTML, SVG, event handlers, and script URLs are not allowed.",
      };
    }
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        const failure = visit(current[index], `${path}[${index}]`, depth + 1);
        if (failure) return failure;
      }
    } else if (current && typeof current === "object") {
      for (const [key, child] of Object.entries(current)) {
        if (UNSAFE_KEYS.has(key.toLocaleLowerCase("en")) || /^on[a-z]+$/i.test(key)) {
          return {
            code: "UNSAFE_STRUCTURED_KEY",
            path: `${path}.${key}`,
            message: "Unsafe executable or prototype-related structured-data keys are not allowed.",
          };
        }
        const failure = visit(child, `${path}.${key}`, depth + 1);
        if (failure) return failure;
      }
    }
    return null;
  };

  try {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > GENERAL_ACADEMIC_LIMITS.figureDataBytes) {
      return {
        code: "STRUCTURED_DATA_SIZE",
        path: rootPath,
        message: "Structured figure data is too large.",
      };
    }
  } catch {
    return {
      code: "STRUCTURED_DATA_SIZE",
      path: rootPath,
      message: "Structured figure data must be JSON-serializable.",
    };
  }

  return visit(value, rootPath, 0);
}
