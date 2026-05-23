CREATE TYPE "public"."preset" AS ENUM('IntensityRed', 'IntensityGreen', 'IntensityBlue', 'IntensityWhite', 'IntensityAmber', 'IntensityUV', 'ShutterStrobeSlowFast', 'ShutterStrobeFastSlow', 'IntensityMasterDimmer', 'IntensityDimmer', 'Custom');--> statement-breakpoint
CREATE TABLE "channel_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "channel_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer NOT NULL,
	"channel_mode" integer NOT NULL,
	"channel_number" integer NOT NULL,
	"preset" "preset",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_assignments_externalId_unique" UNIQUE("external_id"),
	CONSTRAINT "channel_assignments_fixtureId_channelMode_channelNumber_unique" UNIQUE("fixture_id","channel_mode","channel_number")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_name_unique" UNIQUE("name"),
	CONSTRAINT "fixtures_externalId_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vendors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_name_unique" UNIQUE("name"),
	CONSTRAINT "vendors_externalId_unique" UNIQUE("external_id")
);
--> statement-breakpoint
ALTER TABLE "channel_assignments" ADD CONSTRAINT "channel_assignments_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;