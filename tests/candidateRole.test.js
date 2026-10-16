jest.mock('../src/config/database', () => ({
  nomination: { findMany: jest.fn() },
  user: { updateMany: jest.fn() }
}));

const prisma = require('../src/config/database');
const { reconcileCandidateRoles } = require('../src/utils/candidateRole');

describe('candidate role reconciliation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('restores VOTER when the user has no active approved nomination left', async () => {
    prisma.nomination.findMany.mockResolvedValue([]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const restored = await reconcileCandidateRoles(['user-1']);

    expect(prisma.nomination.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user-1'] }, status: 'APPROVED', election: { status: { not: 'ARCHIVED' } } },
      select: { userId: true }
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-1'] }, role: 'CANDIDATE' },
      data: { role: 'VOTER' }
    });
    expect(restored).toEqual(['user-1']);
  });

  test('keeps CANDIDATE for users who still hold another active approved nomination', async () => {
    prisma.nomination.findMany.mockResolvedValue([{ userId: 'user-1' }]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const restored = await reconcileCandidateRoles(['user-1', 'user-2']);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-2'] }, role: 'CANDIDATE' },
      data: { role: 'VOTER' }
    });
    expect(restored).toEqual(['user-2']);
  });

  test('skips the database entirely for empty input and collapses duplicate ids', async () => {
    await expect(reconcileCandidateRoles([])).resolves.toEqual([]);
    await expect(reconcileCandidateRoles([null, undefined])).resolves.toEqual([]);
    expect(prisma.nomination.findMany).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();

    prisma.nomination.findMany.mockResolvedValue([]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    const restored = await reconcileCandidateRoles(['user-1', 'user-1']);

    expect(prisma.nomination.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: { in: ['user-1'] } })
    }));
    expect(restored).toEqual(['user-1']);
  });
});
