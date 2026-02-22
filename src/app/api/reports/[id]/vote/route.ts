import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, votes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeScore } from "@/lib/scoring";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { vote_type, voter_fingerprint } = body;

  if (!vote_type || !voter_fingerprint) {
    return NextResponse.json(
      { error: "vote_type and voter_fingerprint are required" },
      { status: 400 }
    );
  }

  if (!["confirm", "deny"].includes(vote_type)) {
    return NextResponse.json(
      { error: "vote_type must be confirm or deny" },
      { status: 400 }
    );
  }

  // Check report exists
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (report.status === "expired") {
    return NextResponse.json(
      { error: "Cannot vote on expired reports" },
      { status: 400 }
    );
  }

  // Check for duplicate vote
  const existingVote = await db
    .select()
    .from(votes)
    .where(
      and(
        eq(votes.reportId, id),
        eq(votes.voterFingerprint, voter_fingerprint)
      )
    );

  if (existingVote.length > 0) {
    return NextResponse.json(
      { error: "You have already voted on this report" },
      { status: 409 }
    );
  }

  // Create vote
  await db.insert(votes).values({
    reportId: id,
    voteType: vote_type,
    voterFingerprint: voter_fingerprint,
  });

  // Update last_activity_at
  await db
    .update(reports)
    .set({ lastActivityAt: new Date() })
    .where(eq(reports.id, id));

  // Recompute score
  const allVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.reportId, id));

  const { score, status } = computeScore(
    allVotes.map((v) => ({ voteType: v.voteType, createdAt: v.createdAt }))
  );

  // Only auto-update status if not admin-locked
  if (!report.adminLockedAt) {
    await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, id));
  }

  const confirmCount = allVotes.filter((v) => v.voteType === "confirm").length;
  const denyCount = allVotes.filter((v) => v.voteType === "deny").length;

  // Fetch updated report
  const [updatedReport] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  const effectiveStatus = report.adminLockedAt ? report.status : status;

  return NextResponse.json({
    id: updatedReport.id,
    type: updatedReport.type,
    latitude: parseFloat(updatedReport.latitude),
    longitude: parseFloat(updatedReport.longitude),
    description: updatedReport.description,
    sourceUrl: updatedReport.sourceUrl,
    status: effectiveStatus,
    createdAt: updatedReport.createdAt.toISOString(),
    lastActivityAt: updatedReport.lastActivityAt.toISOString(),
    score,
    confirmCount,
    denyCount,
  });
}
