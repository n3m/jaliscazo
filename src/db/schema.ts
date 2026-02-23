import {
  pgTable,
  uuid,
  pgEnum,
  decimal,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const reportTypeEnum = pgEnum("report_type", [
  "armed_confrontation",
  "road_blockade",
  "cartel_activity",
  "building_fire",
  "looting",
  "general_danger",
  "criminal_activity",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "unconfirmed",
  "confirmed",
  "denied",
  "expired",
]);

export const voteTypeEnum = pgEnum("vote_type", ["confirm", "deny"]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: reportTypeEnum("type").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  description: text("description"),
  sourceUrl: text("source_url"),
  creatorFingerprint: text("creator_fingerprint"),
  status: reportStatusEnum("status").notNull().default("unconfirmed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  adminLockedAt: timestamp("admin_locked_at", { withTimezone: true }),
});

export const votes = pgTable("votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  voteType: voteTypeEnum("vote_type").notNull(),
  voterFingerprint: text("voter_fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  senderFingerprint: text("sender_fingerprint").notNull(),
  aliasNumber: integer("alias_number").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  addedByFingerprint: text("added_by_fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
