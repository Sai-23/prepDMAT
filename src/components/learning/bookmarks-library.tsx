"use client";

import type { Route } from "next";
import { BookmarkX, Search, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { toggleBookmarkAction } from "@/app/learning/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BookmarkQuestion } from "@/lib/learning/schemas";

export function BookmarksLibrary({
  initialBookmarks,
}: {
  initialBookmarks: BookmarkQuestion[];
}) {
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return bookmarks.filter(
      (bookmark) =>
        (module === "all" || bookmark.questionType === module) &&
        (difficulty === "all" || bookmark.difficulty === difficulty) &&
        (!normalizedQuery ||
          bookmark.questionText.toLowerCase().includes(normalizedQuery) ||
          bookmark.topic.toLowerCase().includes(normalizedQuery)),
    );
  }, [bookmarks, difficulty, module, query]);

  const remove = (questionId: string) => {
    setError(null);
    startTransition(async () => {
      const response = await toggleBookmarkAction({
        questionId,
        bookmarked: false,
      });
      if (response.error) {
        setError(response.error);
        return;
      }
      setBookmarks((current) =>
        current.filter((bookmark) => bookmark.id !== questionId),
      );
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_190px_180px]">
          <label className="relative">
            <span className="sr-only">Search bookmarks</span>
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search question or topic"
              type="search"
              value={query}
            />
          </label>
          <select aria-label="Filter by module" className="h-12 rounded-xl border border-slate-300 bg-white px-4" onChange={(event) => setModule(event.target.value)} value={module}>
            <option value="all">All modules</option>
            <option value="figure_sequence">Figure Sequences</option>
            <option value="mathematical_equation">Mathematical Equations</option>
            <option value="latin_square">Latin Squares</option>
          </select>
          <select
            aria-label="Filter by difficulty"
            className="h-12 rounded-xl border border-slate-300 bg-white px-4"
            onChange={(event) => setDifficulty(event.target.value)}
            value={difficulty}
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-sm text-slate-500">
        Showing {visible.length} of {bookmarks.length} saved questions
      </p>

      {visible.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((bookmark) => {
            const practiceUrl =
              `/practice?question=${bookmark.id}&module=core` as Route;
            return (
              <Card className="flex flex-col" key={bookmark.id}>
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{bookmark.difficulty}</Badge>
                    <Badge variant="subtle">
                      Core Module
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-lg leading-7">
                    {bookmark.questionText}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {bookmark.topic}
                    {bookmark.subtopic ? ` · ${bookmark.subtopic}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto flex flex-wrap gap-3">
                  <Button asChild size="sm">
                    <Link href={practiceUrl}>
                      <Target className="h-4 w-4" />
                      Practice question
                    </Link>
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => remove(bookmark.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <BookmarkX className="h-4 w-4" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-slate-600">
            No saved questions match these filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
