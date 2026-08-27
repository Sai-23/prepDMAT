import { ErrorState } from "@/components/shared/error-state";
import { TestRunner } from "@/components/tests/test-runner";
import { requireUser } from "@/lib/auth/guards";
import { getTestAttempt } from "@/lib/tests/data";
import { testIdSchema } from "@/lib/tests/schemas";

export default async function TakeTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const user = await requireUser();
  const testId = testIdSchema.safeParse((await params).testId);
  const attemptId = testIdSchema.safeParse((await searchParams).attempt);

  if (!testId.success || !attemptId.success) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <ErrorState
          title="Invalid test attempt"
          description="Return to the test catalog and start the test again."
        />
      </div>
    );
  }

  let attempt = null;
  let loadError: string | null = null;
  try {
    attempt = await getTestAttempt(user.id, testId.data, attemptId.data);
  } catch {
    loadError = "Unable to restore this test attempt.";
  }

  if (loadError || !attempt) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <ErrorState
          title="Test attempt unavailable"
          description={loadError ?? "This attempt could not be restored."}
        />
      </div>
    );
  }

  return <TestRunner attempt={attempt} />;
}
