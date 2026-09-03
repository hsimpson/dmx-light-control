ALTER TABLE "projects" ADD COLUMN "room_width" double precision DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "room_length" double precision DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "room_height" double precision DEFAULT 5 NOT NULL;