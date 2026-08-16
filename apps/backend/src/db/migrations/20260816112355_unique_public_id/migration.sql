ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_public_id_key" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "fixture_channel_assignments" ADD CONSTRAINT "fixture_channel_assignments_public_id_key" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "fixture_channel_definitions" ADD CONSTRAINT "fixture_channel_definitions_public_id_key" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "fixture_channel_modes" ADD CONSTRAINT "fixture_channel_modes_public_id_key" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "fixture_channel_ranges" ADD CONSTRAINT "fixture_channel_ranges_public_id_key" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "fixture_vendors" ADD CONSTRAINT "fixture_vendors_public_id_key" UNIQUE("public_id");