export type ReportType = "armed_confrontation" | "road_blockade" | "cartel_activity" | "building_fire" | "looting" | "general_danger" | "criminal_activity";
export type ReportStatus = "unconfirmed" | "confirmed" | "denied" | "expired";
export type VoteType = "confirm" | "deny";

export interface Report {
  id: string;
  type: ReportType;
  latitude: number;
  longitude: number;
  description: string | null;
  sourceUrl: string | null;
  status: ReportStatus;
  adminLockedAt: string | null;
  createdAt: string;
  lastActivityAt: string;
  score: number;
  confirmCount: number;
  denyCount: number;
}

export interface Vote {
  id: string;
  reportId: string;
  voteType: VoteType;
  voterFingerprint: string;
  createdAt: string;
}
