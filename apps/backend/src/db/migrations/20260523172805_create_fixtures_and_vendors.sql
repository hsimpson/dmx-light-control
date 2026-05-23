CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixtures_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vendors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"external_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;