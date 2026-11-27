CREATE TABLE "shows" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"light_tracks" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shows_project_id_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "show_audio_clips" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "show_audio_clips_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"show_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"start_ms" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"beats_ms" jsonb NOT NULL,
	"peaks" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "show_audio_clips" ADD CONSTRAINT "show_audio_clips_show_id_shows_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE;