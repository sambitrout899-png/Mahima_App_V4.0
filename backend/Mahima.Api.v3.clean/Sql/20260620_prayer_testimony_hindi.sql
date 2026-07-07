CREATE TABLE IF NOT EXISTS prayertestimonies (
    id bigserial PRIMARY KEY,
    prayerrequestid bigint NOT NULL UNIQUE,
    userid uuid NULL,
    title text NULL,
    testimonytext text NULL,
    testimonytexthindi text NULL,
    imageurl text NULL,
    voiceurl text NULL,
    createdat timestamp without time zone NOT NULL DEFAULT now(),
    updatedat timestamp without time zone NULL
);

ALTER TABLE prayertestimonies
    ADD COLUMN IF NOT EXISTS testimonytexthindi text NULL;

CREATE INDEX IF NOT EXISTS ix_prayertestimonies_missing_hindi
    ON prayertestimonies (id)
    WHERE NULLIF(trim(COALESCE(testimonytext, '')), '') IS NOT NULL
      AND NULLIF(trim(COALESCE(testimonytexthindi, '')), '') IS NULL;
