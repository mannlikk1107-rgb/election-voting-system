jest.mock('../src/config/database', () => ({
  election: { findUnique: jest.fn() },
  voterEligibility: { findUnique: jest.fn(), upsert: jest.fn() },
  nomination: { findMany: jest.fn() },
  user: { updateMany: jest.fn() }
}));

const prisma = require('../src/config/database');
const { applyEligibility } = require('../src/controllers/electionController');

function responseDouble() {
  return { status: jest.fn().mockReturnThis(), render: jest.fn(), redirect: jest.fn() };
}

describe('voter eligibility requests', () => {
  beforeEach(() => jest.clearAllMocks());

  test('blocks a candidate from requesting voter approval with 403 before touching the database', async () => {
    const req = { params: { electionId: 'election-1' }, session: { user: { id: 'user-1', role: 'CANDIDATE' } } };
    const res = responseDouble();
    const next = jest.fn();

    await applyEligibility(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.render).toHaveBeenCalledWith('errors/403', expect.any(Object));
    expect(prisma.election.findUnique).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('lets an authenticated voter reach the eligibility flow', async () => {
    prisma.election.findUnique.mockResolvedValue({ id: 'election-1', status: 'NOMINATION' });
    prisma.voterEligibility.findUnique.mockResolvedValue(null);
    prisma.voterEligibility.upsert.mockResolvedValue({ id: 'eligibility-1' });
    const req = { params: { electionId: 'election-1' }, session: { user: { id: 'user-1', role: 'VOTER' } } };
    const res = responseDouble();
    const next = jest.fn();

    await applyEligibility(req, res, next);

    expect(prisma.voterEligibility.upsert).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith('/elections/election-1');
    expect(next).not.toHaveBeenCalled();
  });
});
