CREATE TYPE "midi_led_type" AS ENUM('Rgb', 'Single');--> statement-breakpoint
ALTER TABLE "midi_mappings" ADD COLUMN "led_palettes" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "midi_mapping_entries" ADD COLUMN "led_type" "midi_led_type";