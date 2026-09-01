import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PrivacyPage from "./page";

describe("privacy policy", () => {
  it("renders an accessible, product-specific public policy", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Information we collect");
    expect(html).toContain("Cookies and local storage");
    expect(html).toContain("Supabase");
    expect(html).toContain("Vercel");
    expect(html).toContain("Google");
    expect(html).toContain('href="mailto:info@prepdmat.in"');
    expect(html).toContain("does not currently offer an SMS marketing option");
    expect(html).not.toMatch(/Google Analytics|Stripe|Facebook Pixel|data broker/i);
  });
});
