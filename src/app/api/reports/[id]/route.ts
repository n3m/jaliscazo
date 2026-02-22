// src/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, votes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin";
import { computeScore } from "@/lib/scoring";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Votes cascade-delete via FK constraint
  await db.delete(reports).where(eq(reports.id, id));

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = verifyAdmin(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Build update object from allowed fields
  const updates: Record<string, unknown> = {};
  if (body.type && ["armed_confrontation", "road_blockade", "cartel_activity"].includes(body.type)) {
    updates.type = body.type;
  }
  if (body.status && ["unconfirmed", "confirmed", "denied", "expired"].includes(body.status)) {
    updates.status = body.status;
  }
  if (body.description !== undefined) {
    updates.description = body.description || null;
  }
  if (body.sourceUrl !== undefined) {
    updates.sourceUrl = body.sourceUrl || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(reports).set(updates).where(eq(reports.id, id));

  // Fetch updated report with vote counts
  const [updatedReport] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  const reportVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.reportId, id));

  const { score } = computeScore(
    reportVotes.map((v) => ({ voteType: v.voteType, createdAt: v.createdAt }))
  );

  const confirmCount = reportVotes.filter((v) => v.voteType === "confirm").length;
  const denyCount = reportVotes.filter((v) => v.voteType === "deny").length;

  return NextResponse.json({
    id: updatedReport.id,
    type: updatedReport.type,
    latitude: parseFloat(updatedReport.latitude),
    longitude: parseFloat(updatedReport.longitude),
    description: updatedReport.description,
    sourceUrl: updatedReport.sourceUrl,
    status: updatedReport.status,
    createdAt: updatedReport.createdAt.toISOString(),
    lastActivityAt: updatedReport.lastActivityAt.toISOString(),
    score,
    confirmCount,
    denyCount,
  });
}
