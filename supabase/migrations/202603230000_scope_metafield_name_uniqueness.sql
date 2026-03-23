-- Align metafield uniqueness with scoped definitions.
-- Custom metafields are isolated by scope (character/location/organization/project).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'metafield_definitions_project_id_name_normalized_key'
      AND conrelid = 'public.metafield_definitions'::regclass
  ) THEN
    ALTER TABLE public.metafield_definitions
      DROP CONSTRAINT metafield_definitions_project_id_name_normalized_key;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'metafield_definitions_project_scope_name_normalized_key'
      AND conrelid = 'public.metafield_definitions'::regclass
  ) THEN
    ALTER TABLE public.metafield_definitions
      ADD CONSTRAINT metafield_definitions_project_scope_name_normalized_key
      UNIQUE (project_id, scope, name_normalized);
  END IF;
END $$;
