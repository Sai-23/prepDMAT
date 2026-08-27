import type {
  MathematicalEquation,
  MathematicalEquationStructuredData,
} from "@/lib/generation/mathematical-equations";
import { renderMathematicalEquation } from "@/lib/generation/mathematical-equations";
import { cn } from "@/lib/utils";

export function equationText(equation: MathematicalEquation): string {
  return renderMathematicalEquation(equation);
}

export function EquationRenderer({
  data,
  className,
}: {
  data: MathematicalEquationStructuredData;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-workspace-border bg-code-background p-5",
        className,
      )}
    >
      <div className="space-y-3" role="list" aria-label="Equation system">
        {data.equations.map((equation, index) => (
          <div
            className="rounded-md bg-surface-lowest px-4 py-3 text-center font-mono text-xl font-semibold text-code-foreground"
            key={`${equationText(equation)}-${index}`}
            role="listitem"
          >
            {equationText(equation)}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Each letter is an integer from {data.domain.minimum} to {data.domain.maximum}.
      </p>
    </div>
  );
}
