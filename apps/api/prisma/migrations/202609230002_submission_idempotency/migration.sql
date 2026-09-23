ALTER TABLE "Case" ADD COLUMN "retained" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Case" SET "retained" = true WHERE id IN (SELECT "caseId" FROM "Analysis" WHERE "historyConsent" = true);
CREATE TABLE "SubmissionRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "bodyHash" TEXT NOT NULL,
  "analysisId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubmissionRequest_userId_key_key" ON "SubmissionRequest"("userId", "key");
ALTER TABLE "SubmissionRequest" ADD CONSTRAINT "SubmissionRequest_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
