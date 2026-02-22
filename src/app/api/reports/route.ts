import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, votes } from "@/db/schema";
import { eq, and, ne, gte, lte, sql } from "drizzle-orm";
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
  const conditions = [ne(reports.status, "expired")];

  if (swLat && swLng && neLat && neLng) {
    conditions.push(gte(reports.latitude, swLat));
    conditions.push(lte(reports.latitude, neLat));
    conditions.push(gte(reports.longitude, swLng));
    conditions.push(lte(reports.longitude, neLng));
  }

  const allReports = await db
    .select()
    .from(reports)
    .where(and(...conditions));

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
      };
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, latitude, longitude, description, source_url } = body;

  if (!type || !latitude || !longitude) {
    return NextResponse.json(
      { error: "type, latitude, and longitude are required" },
      { status: 400 }
    );
  }

  if (!["armed_confrontation", "road_blockade", "cartel_activity", "building_fire"].includes(type)) {
    return NextResponse.json(
      { error: "type must be armed_confrontation, road_blockade, cartel_activity, or building_fire" },
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
      status: "unconfirmed",
    })
    .returning();

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
    },
    { status: 201 }
  );
}
