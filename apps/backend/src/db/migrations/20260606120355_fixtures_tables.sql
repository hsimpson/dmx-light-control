CREATE TYPE "public"."preset" AS ENUM('IntensityRed', 'IntensityGreen', 'IntensityBlue', 'IntensityWhite', 'IntensityAmber', 'IntensityUV', 'ShutterStrobeSlowFast', 'ShutterStrobeFastSlow', 'IntensityMasterDimmer', 'IntensityDimmer', 'Custom');--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_channel_mode_id" integer NOT NULL,
	"fixture_channel_definition_id" integer NOT NULL,
	"channel_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_assignments_fixtureChannelModeId_channelNumber_unique" UNIQUE("fixture_channel_mode_id","channel_number")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"preset" "preset" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_definitions_fixtureId_name_unique" UNIQUE("fixture_id","name")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_modes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_modes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_modes_fixtureId_name_unique" UNIQUE("fixture_id","name")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_ranges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_ranges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_channel_definition_id" integer NOT NULL,
	"dmx_start" integer NOT NULL,
	"dmx_end" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dmx_start_bounds" CHECK ("fixture_channel_ranges"."dmx_start" BETWEEN 0 AND 255),
	CONSTRAINT "dmx_end_bounds" CHECK ("fixture_channel_ranges"."dmx_end" BETWEEN 0 AND 255),
	CONSTRAINT "valid_range_order" CHECK ("fixture_channel_ranges"."dmx_start" <= "fixture_channel_ranges"."dmx_end")
);
--> statement-breakpoint
CREATE TABLE "fixture_vendors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_vendors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_vendors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_vendor_id_fixture_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."fixture_vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_channel_assignments" ADD CONSTRAINT "fixture_channel_assignments_fixture_channel_mode_id_fixture_channel_modes_id_fk" FOREIGN KEY ("fixture_channel_mode_id") REFERENCES "public"."fixture_channel_modes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_channel_assignments" ADD CONSTRAINT "fixture_channel_assignments_fixture_channel_definition_id_fixture_channel_definitions_id_fk" FOREIGN KEY ("fixture_channel_definition_id") REFERENCES "public"."fixture_channel_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_channel_definitions" ADD CONSTRAINT "fixture_channel_definitions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_channel_modes" ADD CONSTRAINT "fixture_channel_modes_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_channel_ranges" ADD CONSTRAINT "fixture_channel_ranges_fixture_channel_definition_id_fixture_channel_definitions_id_fk" FOREIGN KEY ("fixture_channel_definition_id") REFERENCES "public"."fixture_channel_definitions"("id") ON DELETE cascade ON UPDATE no action;