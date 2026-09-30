CREATE TYPE "UserRole" AS ENUM ('VOTER', 'CANDIDATE', 'ADMINISTRATOR');
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'NOMINATION', 'VOTING', 'CLOSED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "EligibilityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "NominationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VOTER',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '',
    "nominationStart" TIMESTAMP(3) NOT NULL,
    "nominationEnd" TIMESTAMP(3) NOT NULL,
    "votingStart" TIMESTAMP(3) NOT NULL,
    "votingEnd" TIMESTAMP(3) NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'DRAFT',
    "resultsPublishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VoterEligibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "status" "EligibilityStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VoterEligibility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "candidateDisplayName" TEXT NOT NULL,
    "biography" TEXT NOT NULL,
    "manifesto" TEXT NOT NULL,
    "status" "NominationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "Election_status_votingStart_votingEnd_idx" ON "Election"("status", "votingStart", "votingEnd");
CREATE INDEX "Election_createdById_idx" ON "Election"("createdById");
CREATE INDEX "VoterEligibility_electionId_status_idx" ON "VoterEligibility"("electionId", "status");
CREATE INDEX "VoterEligibility_userId_idx" ON "VoterEligibility"("userId");
CREATE UNIQUE INDEX "VoterEligibility_electionId_userId_key" ON "VoterEligibility"("electionId", "userId");
CREATE INDEX "Nomination_electionId_status_idx" ON "Nomination"("electionId", "status");
CREATE UNIQUE INDEX "Nomination_electionId_userId_key" ON "Nomination"("electionId", "userId");
CREATE UNIQUE INDEX "Nomination_electionId_id_key" ON "Nomination"("electionId", "id");
CREATE INDEX "Vote_electionId_nominationId_idx" ON "Vote"("electionId", "nominationId");
CREATE UNIQUE INDEX "Vote_electionId_voterId_key" ON "Vote"("electionId", "voterId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

ALTER TABLE "Election" ADD CONSTRAINT "Election_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VoterEligibility" ADD CONSTRAINT "VoterEligibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoterEligibility" ADD CONSTRAINT "VoterEligibility_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoterEligibility" ADD CONSTRAINT "VoterEligibility_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_nominationId_fkey" FOREIGN KEY ("electionId", "nominationId") REFERENCES "Nomination"("electionId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;