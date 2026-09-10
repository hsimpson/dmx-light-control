CREATE TYPE "scene_object_geometry_kind" AS ENUM('Box', 'Gltf');--> statement-breakpoint
CREATE TABLE "project_3d_objects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_3d_objects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"project_id" integer NOT NULL,
	"scene_object_type_id" integer NOT NULL,
	"size_x" double precision,
	"size_y" double precision,
	"size_z" double precision,
	"transform" double precision[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_object_types" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scene_object_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL UNIQUE,
	"geometry_kind" "scene_object_geometry_kind" NOT NULL,
	"model_path" varchar(512),
	"is_scalable" boolean NOT NULL,
	"default_size_x" double precision NOT NULL,
	"default_size_y" double precision NOT NULL,
	"default_size_z" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_3d_objects" ADD CONSTRAINT "project_3d_objects_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "project_3d_objects" ADD CONSTRAINT "project_3d_objects_wdivx2ZeiInx_fkey" FOREIGN KEY ("scene_object_type_id") REFERENCES "scene_object_types"("id");--> statement-breakpoint
INSERT INTO "scene_object_types" ("public_id", "name", "geometry_kind", "model_path", "is_scalable", "default_size_x", "default_size_y", "default_size_z")
VALUES
	('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Box', 'Box', NULL, true, 2, 0.5, 1),
	('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Light stand', 'Gltf', '/assets/3d/light_stand.glb', false, 1, 1, 1);