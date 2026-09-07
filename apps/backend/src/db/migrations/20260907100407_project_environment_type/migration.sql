CREATE TYPE "project_environment_type" AS ENUM('SimpleGround', 'Room');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "environment_type" "project_environment_type" DEFAULT 'SimpleGround'::"project_environment_type" NOT NULL;--> statement-breakpoint
UPDATE "projects" SET "environment_type" = 'Room';