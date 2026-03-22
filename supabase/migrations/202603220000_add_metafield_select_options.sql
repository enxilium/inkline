-- Add self-contained option registries for select metafields.
-- Select options are stored per-metafield definition (no global catalog).
-- Safe to run multiple times.

create extension if not exists pgcrypto;

alter table if exists public.metafield_definitions
  add column if not exists select_options_json jsonb;

update public.metafield_definitions
set select_options_json = '[]'::jsonb
where select_options_json is null;

alter table if exists public.metafield_definitions
  alter column select_options_json set default '[]'::jsonb,
  alter column select_options_json set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'metafield_definitions'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'metafield_definitions_select_options_json_check'
      and conrelid = 'public.metafield_definitions'::regclass
  ) then
    alter table public.metafield_definitions
      add constraint metafield_definitions_select_options_json_check
      check (jsonb_typeof(select_options_json) = 'array');
  end if;
end $$;

-- Backfill select options from existing assignment labels (for legacy data only).
-- Invalid or malformed values are dropped.
with existing_select_option_count as (
  select
    md.id as definition_id,
    jsonb_array_length(md.select_options_json) as option_count
  from public.metafield_definitions md
  where md.value_type = 'string[]'
),
raw_assignment_values as (
  select
    ma.definition_id,
    ma.id as assignment_id,
    ma.created_at as assignment_created_at,
    case
      when jsonb_typeof(ma.value_json) = 'object'
        and ma.value_json->>'kind' = 'select'
        and jsonb_typeof(ma.value_json->'value') = 'array'
      then ma.value_json->'value'
      when jsonb_typeof(ma.value_json) = 'array'
      then ma.value_json
      else '[]'::jsonb
    end as values_array
  from public.metafield_assignments ma
  join public.metafield_definitions md
    on md.id = ma.definition_id
  join existing_select_option_count esc
    on esc.definition_id = md.id
  where md.value_type = 'string[]'
    and esc.option_count = 0
),
label_candidates as (
  select
    rav.definition_id,
    rav.assignment_created_at,
    elem.ordinality as item_ordinality,
    trim(both from elem.value #>> '{}') as label
  from raw_assignment_values rav
  cross join lateral jsonb_array_elements(rav.values_array) with ordinality as elem(value, ordinality)
  where jsonb_typeof(elem.value) = 'string'
),
normalized_labels as (
  select
    definition_id,
    label,
    lower(label) as label_normalized,
    assignment_created_at,
    item_ordinality
  from label_candidates
  where label <> ''
    and label !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
),
first_seen_labels as (
  select distinct on (definition_id, label_normalized)
    definition_id,
    label,
    label_normalized,
    assignment_created_at,
    item_ordinality
  from normalized_labels
  order by definition_id, label_normalized, assignment_created_at, item_ordinality
),
ordered_labels as (
  select
    definition_id,
    label,
    label_normalized,
    row_number() over (
      partition by definition_id
      order by assignment_created_at, item_ordinality, label
    ) - 1 as order_index
  from first_seen_labels
),
option_rows as (
  select
    definition_id,
    jsonb_build_object(
      'id', gen_random_uuid()::text,
      'label', label,
      'label_normalized', label_normalized,
      'order_index', order_index,
      'created_at', timezone('utc'::text, now()),
      'updated_at', timezone('utc'::text, now())
    ) as option_json,
    order_index
  from ordered_labels
),
option_payloads as (
  select
    definition_id,
    jsonb_agg(option_json order by order_index) as options_json
  from option_rows
  group by definition_id
)
update public.metafield_definitions md
set select_options_json = op.options_json,
    updated_at = timezone('utc'::text, now())
from option_payloads op
where md.id = op.definition_id
  and md.value_type = 'string[]'
  and jsonb_array_length(md.select_options_json) = 0;

-- Convert assignment values from legacy labels to option IDs.
with definition_option_map as (
  select
    md.id as definition_id,
    option_entry->>'id' as option_id,
    option_entry->>'label_normalized' as label_normalized
  from public.metafield_definitions md
  cross join lateral jsonb_array_elements(md.select_options_json) as option_entry
  where md.value_type = 'string[]'
),
assignment_source as (
  select
    ma.id as assignment_id,
    ma.value_json,
    case
      when jsonb_typeof(ma.value_json) = 'object'
        and ma.value_json->>'kind' = 'select'
        and jsonb_typeof(ma.value_json->'value') = 'array'
      then ma.value_json->'value'
      when jsonb_typeof(ma.value_json) = 'array'
      then ma.value_json
      else '[]'::jsonb
    end as values_array,
    ma.definition_id
  from public.metafield_assignments ma
  join public.metafield_definitions md
    on md.id = ma.definition_id
  where md.value_type = 'string[]'
),
assignment_ids as (
  select
    src.assignment_id,
    coalesce(
      jsonb_agg(to_jsonb(matches.option_id) order by elem.ordinality)
        filter (where matches.option_id is not null),
      '[]'::jsonb
    ) as selected_option_ids
  from assignment_source src
  cross join lateral jsonb_array_elements(src.values_array) with ordinality as elem(value, ordinality)
  left join definition_option_map matches
    on matches.definition_id = src.definition_id
   and matches.label_normalized = lower(trim(both from elem.value #>> '{}'))
  where jsonb_typeof(elem.value) = 'string'
  group by src.assignment_id
)
update public.metafield_assignments ma
set value_json = jsonb_build_object(
      'kind', 'select',
      'value', coalesce(ai.selected_option_ids, '[]'::jsonb)
    ),
    updated_at = timezone('utc'::text, now())
from assignment_source src
left join assignment_ids ai
  on ai.assignment_id = src.assignment_id
where ma.id = src.assignment_id;
