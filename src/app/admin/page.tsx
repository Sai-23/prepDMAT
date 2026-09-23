import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  FlaskConical,
  Send,
  Users,
  WandSparkles,
  Activity,
  CalendarDays,
  LibraryBig,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminMetrics } from "@/lib/admin/data";
import { requireRole } from "@/lib/auth/guards";
import { getRecentGeneratedCoreMocksForAdmin } from "@/lib/mocks/on-demand";

export default async function AdminDashboardPage() {
  const { roles } = await requireRole(["reviewer", "admin"]);
  const isAdmin = roles.includes("admin");
  let metrics = null;
  let generatedMocks: Awaited<ReturnType<typeof getRecentGeneratedCoreMocksForAdmin>> = [];
  let loadError: string | null = null;

  try {
    [metrics, generatedMocks] = await Promise.all([
      getAdminMetrics(),
      isAdmin ? getRecentGeneratedCoreMocksForAdmin(10) : Promise.resolve([]),
    ]);
  } catch {
    loadError = "Unable to load administrative metrics.";
  }

  const cards = metrics
    ? [
        ...(isAdmin ? [{ label: "Total users", value: metrics.totalUsers, icon: Users }] : []),
        {
          label: "Total questions",
          value: metrics.totalQuestions,
          icon: FileQuestion,
        },
        ...(!isAdmin ? [{
          label: "Awaiting review",
          value: metrics.underReview,
          icon: ClipboardCheck,
        }, {
          label: "Approved drafts",
          value: metrics.approvedDrafts,
          icon: Send,
        }] : []),
        {
          label: "Published questions",
          value: metrics.publishedQuestions,
          icon: CheckCircle2,
        },
        {
          label: "Open reports",
          value: metrics.openReports,
          icon: AlertTriangle,
        },
        {
          label: "Published mocks",
          value: metrics.publishedTests,
          icon: FlaskConical,
        },
        ...(isAdmin ? [
          { label: "Generated questions", value: metrics.generatedQuestions, icon: WandSparkles },
          { label: "Generated today (UTC)", value: metrics.generatedTodayUtc, icon: CalendarDays },
          { label: "Total attempts", value: metrics.totalAttempts, icon: Activity },
          { label: "Completed attempts", value: metrics.completedAttempts, icon: Activity },
        ] : []),
      ]
    : [];

  return (
    <PageShell
      eyebrow={isAdmin ? "Admin dashboard" : "Reviewer dashboard"}
      title={isAdmin ? "Manage the Core question bank" : "Review content quality"}
      description={
        isAdmin
          ? "Generate validated questions, manage the active bank, track reports, and maintain available assessments."
          : "Monitor the review queue, validate submitted questions, and track content quality."
      }
      admin
      roles={roles}
    >
      {loadError || !metrics ? (
        <ErrorState
          title="Admin metrics unavailable"
          description={loadError ?? "Unable to load administrative metrics."}
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardContent className="flex items-start justify-between gap-4 p-6">
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                    </div>
                    <span className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {isAdmin ? (
            <Card>
              <CardHeader><CardTitle>Generated question distribution</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold">By type</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><dt>Figure Sequences</dt><dd>{metrics.generatedByType.figure_sequence}</dd></div>
                    <div className="flex justify-between"><dt>Mathematical Equations</dt><dd>{metrics.generatedByType.mathematical_equation}</dd></div>
                    <div className="flex justify-between"><dt>Latin Squares</dt><dd>{metrics.generatedByType.latin_square}</dd></div>
                  </dl>
                </div>
                <div>
                  <p className="text-sm font-semibold">By difficulty</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between"><dt>Easy</dt><dd>{metrics.generatedByDifficulty.easy}</dd></div>
                    <div className="flex justify-between"><dt>Medium</dt><dd>{metrics.generatedByDifficulty.medium}</dd></div>
                    <div className="flex justify-between"><dt>Hard</dt><dd>{metrics.generatedByDifficulty.hard}</dd></div>
                  </dl>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {isAdmin ? (
            <Card>
              <CardHeader><CardTitle>Recent generated Core mocks</CardTitle></CardHeader>
              <CardContent>
                {generatedMocks.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-3 pr-4">Created</th>
                          <th className="py-3 pr-4">Student</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4">Quality</th>
                          <th className="py-3 pr-4">Critical gate</th>
                          <th className="py-3">Assembler</th>
                          <th className="py-3">Generators</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {generatedMocks.map((mock) => (
                          <tr key={mock.id}>
                            <td className="py-3 pr-4">{new Date(mock.created_at).toLocaleString("en")}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{String(mock.user_id).slice(0, 8)}…</td>
                            <td className="py-3 pr-4">{mock.status}</td>
                            <td className="py-3 pr-4">{mock.quality_score ?? "—"}</td>
                            <td className="py-3 pr-4">{mock.critical_gate_passed === null ? "—" : mock.critical_gate_passed ? "Passed" : "Failed"}</td>
                            <td className="py-3 font-mono text-xs">{mock.assembler_version ?? "—"}</td>
                            <td className="py-3 font-mono text-xs">
                              {Object.values((mock.generator_versions ?? {}) as Record<string, unknown>).map(String).join(", ") || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-600">No generated Core mock requests yet.</p>}
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? "Question bank" : "Review questions"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  {isAdmin ? "Preview published questions and safely remove questions from future Practice and Mock selections." : "Validate submitted questions and record an approval, rejection, or change request."}
                </p>
                <Button asChild>
                  <Link href="/admin/review">{isAdmin ? "Open question bank" : "Open review queue"}</Link>
                </Button>
              </CardContent>
            </Card>
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Generate questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Create deterministic figure sequences, equation systems, or Latin squares, inspect the validated preview, then publish explicitly.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={"/admin/generate" as Route}>
                      Open validated generator
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader><CardTitle>General Academic Studio</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">Create, import, validate, preview, and reopen General Academic source-pack drafts.</p>
                  <Button asChild variant="secondary"><Link href={"/admin/general-academic" as Route}><LibraryBig className="size-4" /> Open General Academic</Link></Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader><CardTitle>Difficulty calibration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">Compare generator difficulty with observed accuracy, response time, skips, reports, and sample-gated review flags.</p>
                  <Button asChild variant="secondary"><Link href={"/admin/analytics" as Route}>Open calibration analytics</Link></Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Author a supported question type and submit it into the controlled
                    review workflow.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href="/admin/questions/new">Open question creator</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Mock Builder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Filter and assemble approved questions, then preview, edit, and publish created mocks.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={"/admin/tests" as Route}>
                      Open Mock Builder
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </PageShell>
  );
}
