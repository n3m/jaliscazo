import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, messages } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get("since");

  // Get the report to check creatorFingerprint
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, id));

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Build conditions
  const conditions = [eq(messages.reportId, id)];

  if (since) {
    conditions.push(gt(messages.createdAt, new Date(since)));
  }

  const result = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(messages.createdAt);

  const response = result.map((msg) => ({
    id: msg.id,
    reportId: msg.reportId,
    content: msg.content,
    aliasNumber: msg.aliasNumber,
    isOp: report.creatorFingerprint !== null &&
      msg.senderFingerprint === report.creatorFingerprint,
    createdAt: msg.createdAt.toISOString(),
  }));

  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { content, sender_fingerprint } = body;

  // Validation
  if (!content || !sender_fingerprint) {
    return NextResponse.json(
      { error: "content and sender_fingerprint are required" },
      { status: 400 }
    );
  }

  if (content.length > 280) {
    return NextResponse.json(
      { error: "content must be 280 characters or less" },
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
      { error: "Cannot send messages on expired reports" },
      { status: 400 }
    );
  }

  // Rate limit: check if sender sent a message in last 30s for this report
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const recentMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.reportId, id),
        eq(messages.senderFingerprint, sender_fingerprint),
        gt(messages.createdAt, thirtySecondsAgo)
      )
    );

  if (recentMessages.length > 0) {
    return NextResponse.json(
      { error: "Please wait before sending another message" },
      { status: 429 }
    );
  }

  // Alias assignment: check if sender already has an alias for this report
  const existingMessages = await db
    .select({ aliasNumber: messages.aliasNumber })
    .from(messages)
    .where(
      and(
        eq(messages.reportId, id),
        eq(messages.senderFingerprint, sender_fingerprint)
      )
    )
    .limit(1);

  let aliasNumber: number;

  if (existingMessages.length > 0) {
    aliasNumber = existingMessages[0].aliasNumber;
  } else {
    // Find the max alias number for this report
    const [maxResult] = await db
      .select({ maxAlias: sql<number>`coalesce(max(${messages.aliasNumber}), 0)` })
      .from(messages)
      .where(eq(messages.reportId, id));

    aliasNumber = maxResult.maxAlias + 1;
  }

  // Insert the message
  const [message] = await db
    .insert(messages)
    .values({
      reportId: id,
      senderFingerprint: sender_fingerprint,
      aliasNumber,
      content,
    })
    .returning();

  // Update report's lastActivityAt
  await db
    .update(reports)
    .set({ lastActivityAt: new Date() })
    .where(eq(reports.id, id));

  const isOp =
    report.creatorFingerprint !== null &&
    sender_fingerprint === report.creatorFingerprint;

  return NextResponse.json(
    {
      id: message.id,
      reportId: message.reportId,
      content: message.content,
      aliasNumber: message.aliasNumber,
      isOp,
      createdAt: message.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
