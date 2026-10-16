const prisma = require('../config/database');

// Roles are mutually exclusive: an approved nomination grants the CANDIDATE
// role, and losing the last active nomination restores the VOTER role.
// An "active" nomination is APPROVED and belongs to an election that is not
// yet ARCHIVED. Users who still hold another active nomination keep CANDIDATE.
async function reconcileCandidateRoles(userIds) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (!unique.length) return [];

  const activeNominations = await prisma.nomination.findMany({
    where: {
      userId: { in: unique },
      status: 'APPROVED',
      election: { status: { not: 'ARCHIVED' } }
    },
    select: { userId: true }
  });
  const stillActive = new Set(activeNominations.map((nomination) => nomination.userId));
  const toRestore = unique.filter((userId) => !stillActive.has(userId));
  if (!toRestore.length) return [];

  await prisma.user.updateMany({
    where: { id: { in: toRestore }, role: 'CANDIDATE' },
    data: { role: 'VOTER' }
  });
  return toRestore;
}

module.exports = { reconcileCandidateRoles };
