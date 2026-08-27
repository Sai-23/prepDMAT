import "server-only";

import { createHash } from "node:crypto";

export function correlationReference(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
