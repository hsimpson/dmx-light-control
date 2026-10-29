CREATE TYPE "midi_control_type" AS ENUM('Button', 'Knob', 'Slider');--> statement-breakpoint
CREATE TYPE "midi_message_type" AS ENUM('Note', 'ControlChange');--> statement-breakpoint
CREATE TABLE "midi_mappings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "midi_mappings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "midi_mapping_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "midi_mapping_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"midi_mapping_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"control_type" "midi_control_type" NOT NULL,
	"message_type" "midi_message_type" NOT NULL,
	"channel" integer NOT NULL,
	"number" integer NOT NULL,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "midi_mapping_entries_midi_mapping_id_name_unique" UNIQUE("midi_mapping_id","name"),
	CONSTRAINT "midi_mapping_entries_address_unique" UNIQUE("midi_mapping_id","message_type","channel","number")
);
--> statement-breakpoint
ALTER TABLE "midi_mapping_entries" ADD CONSTRAINT "midi_mapping_entries_midi_mapping_id_midi_mappings_id_fkey" FOREIGN KEY ("midi_mapping_id") REFERENCES "midi_mappings"("id") ON DELETE CASCADE;