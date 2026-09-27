import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { from: vi.fn() },
  createAdmin: vi.fn(),
  consoleError: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (operation: () => unknown) => operation,
}));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: mocks.createAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { getPublicTestimonials } from "./data";

type QueryResult = { data: unknown; error: { code?: string } | null };

function queryBuilder(result: QueryResult) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    in: vi.fn(),
    overrideTypes: vi.fn().mockResolvedValue(result),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  return builder;
}

const eligible = {
  id: "10000000-0000-4000-8000-000000000001",
  user_id: "20000000-0000-4000-8000-000000000001",
  rating: 5,
  public_consent: true,
  status: "approved",
  is_featured: true,
  testimonial_public: "Focused and clear",
  created_at: "2026-09-27T00:00:00.000Z",
};

describe("public testimonial data source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdmin.mockReturnValue(mocks.admin);
    vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
  });

  it("queries only eligible rows and returns a safe DTO with a missing-profile fallback", async () => {
    const feedbackQuery = queryBuilder({ data: [eligible], error: null });
    const profileQuery = queryBuilder({ data: [], error: null });
    mocks.admin.from.mockImplementation((table: string) => table === "student_feedback" ? feedbackQuery : profileQuery);

    await expect(getPublicTestimonials()).resolves.toEqual([{
      id: eligible.id,
      rating: 5,
      testimonial: "Focused and clear",
      displayName: "PrepDMAT student",
      createdAt: eligible.created_at,
    }]);
    expect(feedbackQuery.eq).toHaveBeenCalledWith("status", "approved");
    expect(feedbackQuery.eq).toHaveBeenCalledWith("public_consent", true);
    expect(feedbackQuery.eq).toHaveBeenCalledWith("is_featured", true);
    expect(feedbackQuery.limit).toHaveBeenCalledWith(3);
  });

  it("fails closed and emits only a sanitized query diagnostic", async () => {
    const feedbackQuery = queryBuilder({ data: null, error: { code: "42501" } });
    mocks.admin.from.mockReturnValue(feedbackQuery);

    await expect(getPublicTestimonials()).resolves.toEqual([]);
    expect(mocks.consoleError).toHaveBeenCalledWith(
      "[feedback.public_testimonials] failed",
      { stage: "feedback_query", code: "42501" },
    );
  });

  it("keeps testimonials visible with fallback names when profile enrichment fails", async () => {
    const feedbackQuery = queryBuilder({ data: [eligible], error: null });
    const profileQuery = queryBuilder({ data: null, error: { code: "42501" } });
    mocks.admin.from.mockImplementation((table: string) => table === "student_feedback" ? feedbackQuery : profileQuery);

    const result = await getPublicTestimonials();
    expect(result[0]?.displayName).toBe("PrepDMAT student");
    expect(mocks.consoleError).toHaveBeenCalledWith(
      "[feedback.public_testimonials] profile enrichment failed",
      { code: "42501" },
    );
  });

  it("fails closed if the server-only admin client is unavailable", async () => {
    mocks.createAdmin.mockImplementation(() => { throw new Error("configuration details"); });
    await expect(getPublicTestimonials()).resolves.toEqual([]);
    expect(mocks.consoleError).toHaveBeenCalledWith(
      "[feedback.public_testimonials] failed",
      { stage: "admin_client" },
    );
  });
});
