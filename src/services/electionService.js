const prisma = require('../config/database');
const { canTransitionElection } = require('../utils/electionStatus');
const { recordAudit } = require('../utils/auditLogger');

async function transitionElection(electionId, status, actorUserId) {
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) throw Object.assign(new Error('Election not found.'), { status: 404 });
  if (!canTransitionElection(election, status)) {
    throw Object.assign(new Error(`Election cannot move from ${election.status} to ${status} now.`), { status: 400 });
  }
  const updated = await prisma.election.update({
    where: { id: electionId },
    data: {
      status,
      ...(status === 'PUBLISHED' ? { resultsPublishedAt: new Date() } : {})
    }
  });
  await recordAudit({ actorUserId, action: `ELECTION_${status}`, entityType: 'Election', entityId: electionId });
  return updated;
}

module.exports = { transitionElection };