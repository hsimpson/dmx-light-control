CREATE TABLE "project_fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"fixture_id" integer NOT NULL,
	"fixture_channel_mode_id" integer NOT NULL,
	"start_address" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_fixture_start_address_bounds" CHECK ("start_address" BETWEEN 1 AND 512)
);
--> statement-breakpoint
ALTER TABLE "project_fixtures" ADD CONSTRAINT "project_fixtures_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_fixtures" ADD CONSTRAINT "project_fixtures_fixture_id_fixtures_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id");--> statement-breakpoint
ALTER TABLE "project_fixtures" ADD CONSTRAINT "project_fixtures_mB7hpqY8pNN3_fkey" FOREIGN KEY ("fixture_channel_mode_id") REFERENCES "fixture_channel_modes"("id");