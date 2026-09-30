const { isWithinVotingPeriod } = require('../src/utils/electionStatus');
jest.mock('../src/config/database', () => ({ $transaction: jest.fn() }));
const prisma = require('../src/config/database');
const { submitVote } = require('../src/services/votingService');

function createTransaction(overrides = {}) {
  const now = new Date();
  return {
    election: { findUnique: jest.fn().mockResolvedValue({
      id: 'election-1', status: 'VOTING',
      votingStart: new Date(now.getTime() - 60_000), votingEnd: new Date(now.getTime() + 60_000)
    }) },
    voterEligibility: { findUnique: jest.fn().mockResolvedValue({ status: 'APPROVED' }) },
    nomination: { findFirst: jest.fn().mockResolvedValue({ id: 'nom-1' }) },
    vote: { create: jest.fn().mockResolvedValue({ id: 'vote-1' }) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    ...overrides
  };
}

describe('voting window', () => {
  const election = {
    status: 'VOTING',
    votingStart: new Date('2026-10-01T09:00:00Z'),
    votingEnd: new Date('2026-10-10T09:00:00Z')
  };

  test('accepts a vote during the election voting window', () => {
    expect(isWithinVotingPeriod(election, new Date('2026-10-05T09:00:00Z'))).toBe(true);
  });

  test('rejects votes before opening, after closing, and outside the voting state', () => {
    expect(isWithinVotingPeriod(election, new Date('2026-10-01T08:59:59Z'))).toBe(false);
    expect(isWithinVotingPeriod(election, new Date('2026-10-10T09:00:01Z'))).toBe(false);
    expect(isWithinVotingPeriod({ ...election, status: 'CLOSED' }, new Date('2026-10-05T09:00:00Z'))).toBe(false);
  });

  test('records an approved matching candidate in one transaction without logging the choice', async () => {
    const transaction = createTransaction();
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    const result = await submitVote({ electionId: 'election-1', voterId: 'voter-1', nominationId: 'nom-1' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.nomination.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'nom-1', electionId: 'election-1', status: 'APPROVED' }
    }));
    expect(transaction.vote.create).toHaveBeenCalledWith({
      data: { electionId: 'election-1', voterId: 'voter-1', nominationId: 'nom-1' }
    });
    expect(transaction.auditLog.create.mock.calls[0][0].data).not.toHaveProperty('nominationId');
    expect(result.receipt).toEqual(expect.any(String));
  });

  test('rejects a nomination that does not belong to the election', async () => {
    const transaction = createTransaction({
      nomination: { findFirst: jest.fn().mockResolvedValue(null) }
    });
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    await expect(submitVote({ electionId: 'election-1', voterId: 'voter-1', nominationId: 'nom-other' }))
      .rejects.toMatchObject({ status: 400 });
    expect(transaction.vote.create).not.toHaveBeenCalled();
  });

  test('translates a database uniqueness error to a duplicate-vote response', async () => {
    const transaction = createTransaction({
      vote: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) }
    });
    prisma.$transaction.mockImplementation((callback) => callback(transaction));
    await expect(submitVote({ electionId: 'election-1', voterId: 'voter-1', nominationId: 'nom-1' }))
      .rejects.toMatchObject({ status: 409, message: expect.stringMatching(/already been recorded/) });
  });
});