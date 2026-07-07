-- Run the SELECT first. If it returns rows, merge/fix those duplicate users before
-- creating the unique index.
WITH normalized_users AS (
    SELECT
        id,
        displayname,
        username,
        phone,
        CASE
            WHEN length(raw_phone) > 10 AND raw_phone LIKE '91%' THEN right(raw_phone, 10)
            ELSE raw_phone
        END AS normalized_phone
    FROM (
        SELECT
            id,
            displayname,
            username,
            phone,
            regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS raw_phone
        FROM public.users
    ) u
)
SELECT
    normalized_phone,
    count(*) AS duplicate_count,
    array_agg(id) AS user_ids,
    array_agg(coalesce(displayname, username)) AS user_names,
    array_agg(phone) AS stored_phones
FROM normalized_users
WHERE normalized_phone <> ''
GROUP BY normalized_phone
HAVING count(*) > 1
ORDER BY duplicate_count DESC, normalized_phone;

-- Run this only after the duplicate report above returns zero rows.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_phone_normalized_not_blank
ON public.users ((
    CASE
        WHEN length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) > 10
             AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') LIKE '91%'
            THEN right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
        ELSE regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    END
))
WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> '';
