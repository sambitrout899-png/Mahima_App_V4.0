-- Adds team-assignment support for tasks.
-- Pairs with the existing public."TaskAssignees" table (Task ↔ User, Guid).
-- This table holds Task ↔ Team mappings since teams use bigint IDs.

CREATE TABLE IF NOT EXISTS public."TaskTeamAssignees" (
    "TaskId" bigint NOT NULL,
    "TeamId" bigint NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "PK_TaskTeamAssignees" PRIMARY KEY ("TaskId", "TeamId"),
    CONSTRAINT "FK_TaskTeamAssignees_Tasks" FOREIGN KEY ("TaskId") REFERENCES public."Tasks"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_TaskTeamAssignees_Teams" FOREIGN KEY ("TeamId") REFERENCES public."Teams"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_TaskTeamAssignees_TeamId"
    ON public."TaskTeamAssignees" ("TeamId");
