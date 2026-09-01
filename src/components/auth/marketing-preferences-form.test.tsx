import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({
  saveMarketingPreferencesAction: vi.fn(),
}));

import { MarketingPreferencesForm } from "./marketing-preferences-form";

describe("student marketing preferences", () => {
  it("renders only email marketing with the correct PrepDMAT brand", () => {
    const html = renderToStaticMarkup(
      <MarketingPreferencesForm emailOptIn={false} hasEmail />,
    );

    expect(html).toContain("dMAT preparation tips");
    expect(html).toContain("PrepDMAT news by email");
    expect(html).not.toMatch(/SMS|text message|marketingSmsOptIn/);
    expect(html).not.toContain("dMATPrep");
  });

  it("keeps phone and SMS controls out of the rendered profile page", () => {
    const profile = readFileSync(
      resolve(process.cwd(), "src/app/profile/page.tsx"),
      "utf8",
    );

    expect(profile).not.toContain("user.phone");
    expect(profile).not.toContain("marketing_sms_opt_in");
    expect(profile).not.toContain("hasPhone");
    expect(profile).not.toContain("smsOptIn");
    expect(profile).toContain(
      "Account verification and service messages do not depend on these optional choices.",
    );
  });
});
