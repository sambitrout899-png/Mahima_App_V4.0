WITH ranked_device_tokens AS (
    SELECT
        tenant_id,
        key,
        row_number() OVER (
            PARTITION BY split_part(key, ':', 3)
            ORDER BY updated_at_utc DESC, key DESC
        ) AS rn
    FROM public.ministry_automation_settings
    WHERE key LIKE 'DeviceToken:%'
)
DELETE FROM public.ministry_automation_settings s
USING ranked_device_tokens r
WHERE s.tenant_id = r.tenant_id
  AND s.key = r.key
  AND r.rn > 1;
