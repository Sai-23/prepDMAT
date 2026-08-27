import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/guards";
import { getCoreProgress } from "@/lib/progress/data";

export async function GET() {
  const user = await requireUser();
  try {
    return NextResponse.json(await getCoreProgress(user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load progress." }, { status: 500 });
  }
}

