-- Add optional icon key to persisted select option objects.
-- Safe to run multiple times.

update public.metafield_definitions md
set select_options_json = mapped.options_json,
    updated_at = timezone('utc'::text, now())
from (
    select
        base.id,
        coalesce(
            jsonb_agg(
                case
                    when jsonb_typeof(entry.value) = 'object' and not (entry.value ? 'icon')
                        then entry.value || jsonb_build_object('icon', null)
                    else entry.value
                end
                order by entry.ordinality
            ),
            '[]'::jsonb
        ) as options_json
    from public.metafield_definitions base
    cross join lateral jsonb_array_elements(base.select_options_json) with ordinality as entry(value, ordinality)
    where base.value_type = 'string[]'
      and jsonb_typeof(base.select_options_json) = 'array'
    group by base.id
) mapped
where md.id = mapped.id
  and md.value_type = 'string[]'
  and jsonb_typeof(md.select_options_json) = 'array';
