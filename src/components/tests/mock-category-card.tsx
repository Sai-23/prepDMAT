import { ChevronRight } from "lucide-react";
import Link from "next/link";

import type { MockCategoryDefinition } from "@/lib/tests/catalog";

type CategoryProgress = {
  completedCount: number;
  totalCount: number;
  percentage: number | null;
};

const motifTone: Record<MockCategoryDefinition["key"], string> = {
  "figure-sequences": "bg-primary-muted text-primary",
  "mathematical-equations":
    "bg-tertiary-container text-tertiary-container-foreground",
  "latin-squares":
    "bg-secondary-container text-secondary-container-foreground",
  "mixed-core": "bg-surface-high text-on-surface-variant",
};

export function CoreModuleMotif({
  moduleType,
}: {
  moduleType: MockCategoryDefinition["moduleType"];
}) {
  const shared = {
    "aria-hidden": true,
    className: "h-full w-full",
    focusable: false,
    viewBox: "0 0 160 120",
  } as const;

  if (moduleType === "figure_sequence") {
    return (
      <svg {...shared}>
        <path d="M18 60h94" fill="none" stroke="currentColor" strokeDasharray="5 6" strokeWidth="2" />
        <path d="m106 53 12 7-12 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="3" width="28" x="18" y="46" />
        <path d="m68 45 16 29H52z" fill="currentColor" opacity=".45" />
        <circle cx="103" cy="60" fill="none" r="15" stroke="currentColor" strokeWidth="3" />
        <rect fill="currentColor" height="8" opacity=".8" rx="2" width="8" x="132" y="27" />
        <rect fill="currentColor" height="8" opacity=".45" rx="2" width="8" x="144" y="27" />
        <rect fill="currentColor" height="8" opacity=".45" rx="2" width="8" x="132" y="39" />
        <rect fill="currentColor" height="8" opacity=".8" rx="2" width="8" x="144" y="39" />
      </svg>
    );
  }

  if (moduleType === "mathematical_equation") {
    return (
      <svg {...shared}>
        <path d="M24 35h28M38 21v28M68 29h34M68 41h34" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
        <path d="M25 78h30M30 66l20 24M50 66 30 90" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
        <path d="M76 64c-10 0-14 7-14 16s4 16 14 16M112 64c10 0 14 7 14 16s-4 16-14 16" fill="none" stroke="currentColor" strokeWidth="3" />
        <text fill="currentColor" fontFamily="monospace" fontSize="27" fontWeight="700" x="78" y="89">a+b</text>
      </svg>
    );
  }

  if (moduleType === "latin_square") {
    return (
      <svg {...shared}>
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect height="90" rx="5" width="90" x="35" y="15" />
          <path d="M53 15v90M71 15v90M89 15v90M107 15v90M35 33h90M35 51h90M35 69h90M35 87h90" />
        </g>
        <g fill="currentColor" fontFamily="monospace" fontSize="11" fontWeight="700" textAnchor="middle">
          <text x="44" y="29">A</text><text x="62" y="47">B</text><text x="80" y="65">C</text>
          <text x="98" y="83">D</text><text x="116" y="101">E</text><text opacity=".5" x="116" y="29">?</text>
        </g>
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <rect fill="none" height="34" rx="4" stroke="currentColor" strokeWidth="3" width="34" x="17" y="18" />
      <path d="m75 18 17 31H58z" fill="currentColor" opacity=".45" />
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect height="46" rx="4" width="46" x="99" y="12" />
        <path d="M114 12v46M130 12v46M99 27h46M99 43h46" />
      </g>
      <path d="M23 84h30M38 69v30M72 76h32M72 89h32" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
      <circle cx="130" cy="84" fill="none" r="17" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function CategoryCardContent({
  category,
  progress,
}: {
  category: MockCategoryDefinition;
  progress: CategoryProgress;
}) {
  const countLabel = `${progress.totalCount} ${progress.totalCount === 1 ? "mock" : "mocks"}`;
  return (
    <>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-on-surface">
            {category.title}
          </h3>
          <p className="mt-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            {countLabel}
          </p>
        </div>
        <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-on-surface-variant transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
      </div>

      <div
        aria-hidden="true"
        className={`absolute right-3 top-14 h-24 w-32 rounded-xl opacity-65 ${motifTone[category.key]}`}
      >
        <CoreModuleMotif moduleType={category.moduleType} />
      </div>

      <div className="relative z-10 mt-auto pt-14">
        {progress.percentage === null ? (
          <p className="text-sm font-medium text-on-surface-variant">
            No mocks available yet
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-on-surface">
                {progress.completedCount} of {progress.totalCount} completed
              </span>
              <span className="font-semibold text-on-surface">
                {progress.percentage}%
              </span>
            </div>
            <div
              aria-label={`${category.title}: ${progress.completedCount} of ${progress.totalCount} mocks completed`}
              aria-valuemax={progress.totalCount}
              aria-valuemin={0}
              aria-valuenow={progress.completedCount}
              className="h-2 overflow-hidden rounded-full bg-surface-highest"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function MockCategoryCard({
  category,
  progress,
  canOpen = progress.totalCount > 0,
}: {
  category: MockCategoryDefinition;
  progress: CategoryProgress;
  canOpen?: boolean;
}) {
  const className = [
    "group relative flex min-h-52 overflow-hidden rounded-xl border bg-surface-lowest p-5 text-left",
    canOpen
      ? "cursor-pointer border-workspace-border shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none motion-reduce:transition-none"
      : "cursor-default border-workspace-border opacity-80",
  ].join(" ");

  if (!canOpen) {
    return (
      <article className={className} data-category={category.key}>
        <CategoryCardContent category={category} progress={progress} />
      </article>
    );
  }

  return (
    <Link
      aria-label={`Open ${category.title}: ${progress.totalCount} ${progress.totalCount === 1 ? "mock" : "mocks"}`}
      className={className}
      data-category={category.key}
      href={{ pathname: "/tests", query: { category: category.key } }}
    >
      <CategoryCardContent category={category} progress={progress} />
    </Link>
  );
}
