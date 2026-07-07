UPDATE public."Tasks"
SET "Status" = 2
WHERE lower(coalesce("ProcessStage", '')) = 'done'
  AND coalesce("Status", 0) <> 2;

UPDATE public."Tasks"
SET "ProcessStage" = 'done'
WHERE "Status" = 2
  AND lower(coalesce("ProcessStage", '')) <> 'done';
