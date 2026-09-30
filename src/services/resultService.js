const prisma = require('../config/database');
const { calculateResults } = require('../utils/resultCalculation');

async function getElectionResults(electionId) {
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) throw Object.assign(new Error('Election not found.'), { status: 404 });
  const [nominations, voteGroups, eligibleVoterCount] = await Promise.all([
    prisma.nomination.findMany({
      where: { electionId, status: 'APPROVED' },
      orderBy: { candidateDisplayName: 'asc' },
      select: { id: true, candidateDisplayName: true }
    }),
    prisma.vote.groupBy({ by: ['nominationId'], where: { electionId }, _count: { _all: true } }),
    prisma.voterEligibility.count({ where: { electionId, status: 'APPROVED' } })
  ]);
  const voteCounts = voteGroups.map((group) => ({ nominationId: group.nominationId, count: group._count._all }));
  return calculateResults(election, nominations, voteCounts, eligibleVoterCount);
}

module.exports = { getElectionResults };