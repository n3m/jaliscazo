import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, sources } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reportSources = await db
    .select()
    .from(sources)
    .where(eq(sources.reportId, id))
    .orderBy(asc(sources.createdAt));

  return NextResponse.json(
    reportSources.map((s) => ({
      id: s.id,
      reportId: s.reportId,
      url: s.url,
      createdAt: s.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { url, added_by_fingerprint } = body;

  if (!url) {
    return NextResponse.json(
      { error: "url is required" },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL" },
      { status: 400 }
    );
  }

  if (!added_by_fingerprint) {
    return NextResponse.json(
      { error: "added_by_fingerprint is required" },
      { status: 400 }
    );
  }

  // Check report exists and is not expired
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status === "expired") {
    return NextResponse.json(
      { error: "Cannot add sources to expired reports" },
      { status: 400 }
    );
  }

  // Insert the source
  const [source] = await db
    .insert(sources)
    .values({
      reportId: id,
      url,
      addedByFingerprint: added_by_fingerprint,
    })
    .returning();

  // Update report's lastActivityAt
  await db
    .update(reports)
    .set({ lastActivityAt: new Date() })
    .where(eq(reports.id, id));

  return NextResponse.json(
    {
      id: source.id,
      reportId: source.reportId,
      url: source.url,
      createdAt: source.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
