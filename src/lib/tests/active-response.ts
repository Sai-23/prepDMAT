import {
  answerMatchesQuestion,
  type PracticeAnswer,
  type PracticeQuestion,
} from "@/lib/practice/schemas";

export function isTestAnswerComplete(
  question: PracticeQuestion,
  answer: PracticeAnswer | null | undefined,
): boolean {
  return Boolean(answer && answerMatchesQuestion(answer, question));
}

export type SaveState = "idle" | "saving" | "saved" | "error";

type QueueEntry<Payload> = {
  payload: Payload;
  version: number;
  savedVersion: number;
  inFlight: Promise<void> | null;
};

/**
 * Serializes writes per question and coalesces rapid changes. If a newer
 * payload is staged while a request is active, it is persisted immediately
 * after the active request, so an older completion can never become final.
 */
export class LatestResponseQueue<Payload> {
  private readonly entries = new Map<string, QueueEntry<Payload>>();

  constructor(
    private readonly persist: (
      questionId: string,
      payload: Payload,
      version: number,
    ) => Promise<void>,
  ) {}

  stage(questionId: string, payload: Payload): number {
    const current = this.entries.get(questionId);
    if (current) {
      current.payload = payload;
      current.version += 1;
      return current.version;
    }
    const version = 1;
    this.entries.set(questionId, {
      payload,
      version,
      savedVersion: 0,
      inFlight: null,
    });
    return version;
  }

  isDirty(questionId: string): boolean {
    const entry = this.entries.get(questionId);
    return Boolean(entry && entry.savedVersion < entry.version);
  }

  flush(questionId: string): Promise<void> {
    const entry = this.entries.get(questionId);
    if (!entry || entry.savedVersion >= entry.version) return Promise.resolve();
    if (entry.inFlight) return entry.inFlight;

    const run = (async () => {
      while (entry.savedVersion < entry.version) {
        const version = entry.version;
        const payload = entry.payload;
        await this.persist(questionId, payload, version);
        entry.savedVersion = version;
      }
    })();
    const completion = run.finally(() => {
      entry.inFlight = null;
    });
    entry.inFlight = completion;
    return completion.then(async () => {
      if (entry.savedVersion < entry.version) await this.flush(questionId);
    });
  }

  async flushAll(): Promise<void> {
    await Promise.all(
      [...this.entries.keys()].map((questionId) => this.flush(questionId)),
    );
  }
}
