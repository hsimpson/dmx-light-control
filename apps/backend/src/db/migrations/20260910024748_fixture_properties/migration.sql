ALTER TABLE "fixtures" ADD COLUMN "weight" double precision;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "width" double precision;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "length" double precision;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "height" double precision;--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "picture_path" varchar(512);--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "picture2d_path" varchar(512);--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "model3d_path" varchar(512);--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixture_weight_non_negative" CHECK ("weight" IS NULL OR "weight" >= 0);--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixture_width_positive" CHECK ("width" IS NULL OR "width" > 0);--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixture_length_positive" CHECK ("length" IS NULL OR "length" > 0);--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixture_height_positive" CHECK ("height" IS NULL OR "height" > 0);