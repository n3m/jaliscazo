CREATE TYPE "public"."report_status" AS ENUM('unconfirmed', 'confirmed', 'denied', 'expired');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('armed_confrontation', 'road_blockade');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('confirm', 'deny');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "report_type" NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"description" text,
	"source_url" text,
	"status" "report_status" DEFAULT 'unconfirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"vote_type" "vote_type" NOT NULL,
	"voter_fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;