CREATE TYPE "preset" AS ENUM('IntensityRed', 'IntensityGreen', 'IntensityBlue', 'IntensityWhite', 'IntensityAmber', 'IntensityUV', 'ShutterStrobeSlowFast', 'ShutterStrobeFastSlow', 'IntensityMasterDimmer', 'IntensityDimmer', 'Custom');--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_channel_mode_id" integer NOT NULL,
	"fixture_channel_definition_id" integer NOT NULL,
	"channel_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_assignments_fixture_channel_mode_id_channel_number_unique" UNIQUE("fixture_channel_mode_id","channel_number")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"preset" "preset" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_definitions_fixture_id_name_unique" UNIQUE("fixture_id","name")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_modes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_modes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixture_channel_modes_fixture_id_name_unique" UNIQUE("fixture_id","name")
);
--> statement-breakpoint
CREATE TABLE "fixture_channel_ranges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_channel_ranges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"fixture_channel_definition_id" integer NOT NULL,
	"dmx_start" integer NOT NULL,
	"dmx_end" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dmx_start_bounds" CHECK ("dmx_start" BETWEEN 0 AND 255),
	CONSTRAINT "dmx_end_bounds" CHECK ("dmx_end" BETWEEN 0 AND 255),
	CONSTRAINT "valid_range_order" CHECK ("dmx_start" <= "dmx_end")
);
--> statement-breakpoint
CREATE TABLE "fixture_vendors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixture_vendors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"publicId" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_vendor_id_fixture_vendors_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "fixture_vendors"("id");--> statement-breakpoint
ALTER TABLE "fixture_channel_assignments" ADD CONSTRAINT "fixture_channel_assignments_Tu2E6gqIi4cf_fkey" FOREIGN KEY ("fixture_channel_mode_id") REFERENCES "fixture_channel_modes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fixture_channel_assignments" ADD CONSTRAINT "fixture_channel_assignments_ufwBjiyPf2qP_fkey" FOREIGN KEY ("fixture_channel_definition_id") REFERENCES "fixture_channel_definitions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fixture_channel_definitions" ADD CONSTRAINT "fixture_channel_definitions_fixture_id_fixtures_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fixture_channel_modes" ADD CONSTRAINT "fixture_channel_modes_fixture_id_fixtures_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fixture_channel_ranges" ADD CONSTRAINT "fixture_channel_ranges_QCGXYihtroF9_fkey" FOREIGN KEY ("fixture_channel_definition_id") REFERENCES "fixture_channel_definitions"("id") ON DELETE CASCADE;