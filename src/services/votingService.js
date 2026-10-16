const prisma = require('../config/database');
const { isWithinVotingPeriod } = require('../utils/electionStatus');

async function submitVote({ electionId, voterId, nominationId }) {
  return prisma.$transaction(async (transaction) => {
    const election = await transaction.election.findUnique({ where: { id: electionId } });
    if (!election || !isWithinVotingPeriod(election)) {
      throw Object.assign(new Error('Voting is not open for this election.'), { status: 400 });
    }

    const [voter, eligibility, nomination] = await Promise.all([
      transaction.user.findUnique({ where: { id: voterId }, select: { role: true } }),
      transaction.voterEligibility.findUnique({
        where: { electionId_userId: { electionId, userId: voterId } }
      }),
      transaction.nomination.findFirst({
        where: { id: nominationId, electionId, status: 'APPROVED' },
        select: { id: true }
      })
    ]);
    if (!voter || voter.role !== 'VOTER') {
      throw Object.assign(new Error('Only approved voters may cast a ballot in this election.'), { status: 403 });
    }
    if (!eligibility || eligibility.status !== 'APPROVED') {
      throw Object.assign(new Error('You are not approved to vote in this election.'), { status: 403 });
    }
    if (!nomination) {
      throw Object.assign(new Error('Choose an approved candidate from this election.'), { status: 400 });
    }

    try {
      await transaction.vote.create({ data: { electionId, voterId, nominationId } });
    } catch (error) {
      if (error.code === 'P2002') {
        throw Object.assign(new Error('A vote has already been recorded for you in this election.'), { status: 409 });
      }
      throw error;
    }
    await transaction.auditLog.create({
      data: {
        actorUserId: voterId,
        action: 'VOTE_SUBMITTED',
        entityType: 'Election',
        entityId: electionId
      }
    });
    return { electionId, receipt: require('crypto').randomUUID() };
  });
}

module.exports = { submitVote };