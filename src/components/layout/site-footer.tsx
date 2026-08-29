import { Footer } from "@/components/layout/footer";

export function SiteFooter() {
  return (
    <Footer
      currentYear={new Date().getUTCFullYear()}
      instagramUrl={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
    />
  );
}
