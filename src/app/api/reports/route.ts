import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, votes, messages, sources } from "@/db/schema";
import { eq, and, ne, gte, lte, sql, count } from "drizzle-orm";
import { computeScore } from "@/lib/scoring";

const EXPIRY_HOURS = 4;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const swLat = searchParams.get("swLat");
  const swLng = searchParams.get("swLng");
  const neLat = searchParams.get("neLat");
  const neLng = searchParams.get("neLng");

  // Expire old reports
  const expiryTime = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000);
  await db
    .update(reports)
    .set({ status: "expired" })
    .where(
      and(ne(reports.status, "expired"), lte(reports.lastActivityAt, expiryTime))
    );

  // Build conditions
  const conditions = [];

  if (swLat && swLng && neLat && neLng) {
    conditions.push(gte(reports.latitude, swLat));
    conditions.push(lte(reports.latitude, neLat));
    conditions.push(gte(reports.longitude, swLng));
    conditions.push(lte(reports.longitude, neLng));
  }

  const allReports = await db
    .select()
    .from(reports)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  // For each report, get votes and compute score
  const result = await Promise.all(
    allReports.map(async (report) => {
      const reportVotes = await db
        .select()
        .from(votes)
        .where(eq(votes.reportId, report.id));

      const { score, status } = computeScore(
        reportVotes.map((v) => ({
          voteType: v.voteType,
          createdAt: v.createdAt,
        }))
      );

      // Update status in DB if it changed (skip admin-locked reports)
      if (status !== report.status && report.status !== "expired" && !report.adminLockedAt) {
        await db
          .update(reports)
          .set({ status })
          .where(eq(reports.id, report.id));
      }

      const effectiveStatus = report.adminLockedAt ? report.status : status;

      const confirmCount = reportVotes.filter(
        (v) => v.voteType === "confirm"
      ).length;
      const denyCount = reportVotes.filter(
        (v) => v.voteType === "deny"
      ).length;

      const [{ count: msgCount }] = await db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.reportId, report.id));

      const [{ count: srcCount }] = await db
        .select({ count: count() })
        .from(sources)
        .where(eq(sources.reportId, report.id));

      return {
        id: report.id,
        type: report.type,
        latitude: parseFloat(report.latitude),
        longitude: parseFloat(report.longitude),
        description: report.description,
        sourceUrl: report.sourceUrl,
        status: effectiveStatus,
        createdAt: report.createdAt.toISOString(),
        lastActivityAt: report.lastActivityAt.toISOString(),
        score,
        confirmCount,
        denyCount,
        messageCount: msgCount,
        sourceCount: srcCount,
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, latitude, longitude, description, source_url, creator_fingerprint } = body;

  if (!type || !latitude || !longitude) {
    return NextResponse.json(
      { error: "type, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  if (!["armed_confrontation", "road_blockade", "cartel_activity", "building_fire", "looting", "general_danger", "criminal_activity"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid report type" },
      { status: 400 }
    );
  }

  const [report] = await db
    .insert(reports)
    .values({
      type,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      description: description || null,
      sourceUrl: source_url || null,
      creatorFingerprint: creator_fingerprint || null,
      status: "unconfirmed",
    })
    .returning();

  // If source_url provided, also create a sources row
  if (source_url && creator_fingerprint) {
    await db.insert(sources).values({
      reportId: report.id,
      url: source_url,
      addedByFingerprint: creator_fingerprint,
    });
  }

  return NextResponse.json(
    {
      id: report.id,
      type: report.type,
      latitude: parseFloat(report.latitude),
      longitude: parseFloat(report.longitude),
      description: report.description,
      sourceUrl: report.sourceUrl,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      lastActivityAt: report.lastActivityAt.toISOString(),
      score: 0,
      confirmCount: 0,
      denyCount: 0,
      messageCount: 0,
      sourceCount: source_url ? 1 : 0,
    },
    { status: 201 }
  );
}
