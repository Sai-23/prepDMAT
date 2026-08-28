"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  LatinSquareStructuredData,
  LatinSymbol,
} from "@/lib/generation/latin-squares";

export function LatinSquareRenderer({
  data,
  value,
  onChange,
  disabled = false,
  correctValue,
  revealCorrectness = false,
  showResponseOptions = true,
  className,
}: {
  data: LatinSquareStructuredData;
  value?: LatinSymbol | null;
  onChange?: (symbol: LatinSymbol) => void;
  disabled?: boolean;
  correctValue?: LatinSymbol | null;
  revealCorrectness?: boolean;
  showResponseOptions?: boolean;
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState<LatinSymbol | null>(null);
  const selected = value === undefined ? internalValue : value;
  const select = (symbol: LatinSymbol) => {
    if (onChange) onChange(symbol);
    else setInternalValue(symbol);
  };

  useEffect(() => {
    if (disabled || !showResponseOptions) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const symbol = event.key.toUpperCase() as LatinSymbol;
      if (!data.symbols.includes(symbol)) return;
      event.preventDefault();
      select(symbol);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className={cn("space-y-3", className)} data-latin-assessment-layout>
      <div className="mx-auto w-[min(100%,clamp(17.5rem,43dvh,21.5rem))] overflow-hidden rounded-lg border-2 border-on-surface bg-on-surface">
        <div
          aria-label="Five by five Latin square"
          className="grid grid-cols-5 gap-px"
          role="grid"
        >
          {data.grid.flatMap((row, rowIndex) =>
            row.map((symbol, columnIndex) => {
              const isTarget =
                rowIndex === data.target.row && columnIndex === data.target.column;
              const label = isTarget
                ? `Target cell, row ${rowIndex + 1}, column ${columnIndex + 1}`
                : symbol
                  ? `${symbol}, row ${rowIndex + 1}, column ${columnIndex + 1}`
                  : `Blank cell, row ${rowIndex + 1}, column ${columnIndex + 1}`;
              return (
                <div
                  aria-label={label}
                  className={cn(
                    "flex aspect-square items-center justify-center bg-surface-lowest text-xl font-semibold sm:text-2xl",
                    isTarget && "bg-error-container text-error-container-foreground",
                  )}
                  key={`${rowIndex}:${columnIndex}`}
                  role="gridcell"
                >
                  {isTarget ? "?" : symbol}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {showResponseOptions ? (
        <div>
          <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Select the target letter
          </p>
          <div
            aria-label="Latin-square answer options"
            className="mx-auto grid w-[min(100%,21.5rem)] grid-cols-5 gap-2"
            data-response-interface="latin-square"
            role="radiogroup"
          >
            {data.symbols.map((symbol) => {
              const isSelected = selected === symbol;
              const isCorrect = revealCorrectness && correctValue === symbol;
              const isIncorrect = revealCorrectness && isSelected && !isCorrect;
              return (
              <button
                aria-label={`${symbol}${isCorrect ? ", correct answer" : isIncorrect ? ", your answer, incorrect" : isSelected ? ", selected" : ""}`}
                aria-checked={isSelected}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-md border text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isCorrect
                    ? "border-success bg-success-container text-success-container-foreground"
                    : isIncorrect
                      ? "border-error bg-error-container text-error-container-foreground"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                    : "border-workspace-border bg-surface-lowest hover:border-primary hover:bg-primary-muted",
                )}
                disabled={disabled}
                key={symbol}
                onClick={() => select(symbol)}
                role="radio"
                type="button"
              >
                {isSelected && !revealCorrectness ? <Check aria-hidden="true" className="mr-1 h-4 w-4" /> : null}{symbol}
                {isCorrect ? <span className="sr-only"> Correct answer</span> : null}
                {isIncorrect ? <span className="sr-only"> Your answer is incorrect</span> : null}
              </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
