import type { ReportStatus } from "@/types";

interface VoteInput {
  voteType: "confirm" | "deny";
  createdAt: Date;
}

interface ScoreResult {
  score: number;
  status: ReportStatus;
}

export function computeScore(votes: VoteInput[], now = new Date()): ScoreResult {
  let score = 0;

  for (const vote of votes) {
    const hoursSince =
      (now.getTime() - vote.createdAt.getTime()) / (1000 * 60 * 60);
    const weight = 1 / (1 + hoursSince);

    if (vote.voteType === "confirm") {
      score += weight;
    } else {
      score -= weight;
    }
  }

  let status: ReportStatus;
  if (score >= 2.0) {
    status = "confirmed";
  } else if (score <= -2.0) {
    status = "denied";
  } else {
    status = "unconfirmed";
  }

  return { score: Math.round(score * 100) / 100, status };
}
