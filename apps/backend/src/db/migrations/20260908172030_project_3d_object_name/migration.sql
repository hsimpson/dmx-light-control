ALTER TABLE "project_3d_objects" ADD COLUMN "name" varchar(255);--> statement-breakpoint
UPDATE project_3d_objects AS o
SET name = s.type_name || ' ' || s.n::text
FROM (
  SELECT
    o2.id,
    t.name AS type_name,
    row_number() OVER (PARTITION BY o2.project_id, o2.scene_object_type_id ORDER BY o2.id) AS n
  FROM project_3d_objects o2
  INNER JOIN scene_object_types t ON t.id = o2.scene_object_type_id
) AS s
WHERE o.id = s.id;--> statement-breakpoint
ALTER TABLE "project_3d_objects" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_3d_objects" ADD CONSTRAINT "project_3d_objects_project_id_name_unique" UNIQUE("project_id","name");
