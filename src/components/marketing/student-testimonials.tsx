import type { PublicTestimonial } from "@/lib/feedback/model";

export function StudentTestimonials({ testimonials }: { testimonials: PublicTestimonial[] }) {
  const visibleTestimonials = testimonials.slice(0, 3);
  if (!visibleTestimonials.length) return null;
  return (
    <section aria-labelledby="student-testimonials-title">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary">Student feedback</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight" id="student-testimonials-title">What students say</h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {visibleTestimonials.map((testimonial) => (
          <figure className="rounded-lg border border-workspace-border bg-surface-lowest p-5" key={testimonial.id}>
            <div aria-label={`${testimonial.rating} out of 5 stars`} className="text-lg text-primary">{"★".repeat(testimonial.rating)}{"☆".repeat(5 - testimonial.rating)}</div>
            <blockquote className="mt-3 text-sm leading-6 text-on-surface">“{testimonial.testimonial}”</blockquote>
            <figcaption className="mt-4 text-sm font-semibold text-on-surface-variant">{testimonial.displayName}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
