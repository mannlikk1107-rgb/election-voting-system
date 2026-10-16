const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditLogger');
const { reconcileCandidateRoles } = require('../utils/candidateRole');

async function dashboard(req, res, next) {
  try {
    const [totalUsers, pendingEligibility, activeElections, pendingNominations, totalVotes, awaitingPublication] = await Promise.all([
      prisma.user.count(),
      prisma.voterEligibility.count({ where: { status: 'PENDING' } }),
      prisma.election.count({ where: { status: { in: ['NOMINATION', 'VOTING'] } } }),
      prisma.nomination.count({ where: { status: 'PENDING' } }),
      prisma.vote.count(),
      prisma.election.count({ where: { status: 'CLOSED' } })
    ]);
    return res.render('admin/dashboard', {
      title: 'Administrator dashboard',
      stats: { totalUsers, pendingEligibility, activeElections, pendingNominations, totalVotes, awaitingPublication }
    });
  } catch (error) { return next(error); }
}

async function eligibilities(req, res, next) {
  try {
    const records = await prisma.voterEligibility.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { user: { select: { id: true, fullName: true, email: true, username: true } }, election: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' }
    });
    const votes = records.length ? await prisma.vote.findMany({
      where: { OR: records.map((record) => ({ electionId: record.electionId, voterId: record.userId })) },
      select: { electionId: true, voterId: true }
    }) : [];
    const voted = new Set(votes.map((vote) => `${vote.electionId}:${vote.voterId}`));
    return res.render('admin/eligibilities', {
      title: 'Voter approvals',
      records: records.map((record) => ({ ...record, hasVoted: voted.has(`${record.electionId}:${record.userId}`) }))
    });
  } catch (error) { return next(error); }
}

async function reviewEligibility(req, res, next) {
  try {
    const status = req.body.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await prisma.voterEligibility.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.session.user.id, reviewedAt: new Date(), rejectionReason: status === 'REJECTED' ? req.body.rejectionReason : null }
    });
    await recordAudit({ actorUserId: req.session.user.id, action: `ELIGIBILITY_${status}`, entityType: 'VoterEligibility', entityId: req.params.id });
    req.session.flashMessage = { type: 'success', text: `Voter request ${status.toLowerCase()}.` };
    return res.redirect('/admin/eligibilities');
  } catch (error) { return next(error); }
}

async function nominations(req, res, next) {
  try {
    const records = await prisma.nomination.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { fullName: true, username: true } }, election: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'asc' }
    });
    return res.render('admin/nominations', { title: 'Nomination approvals', records });
  } catch (error) { return next(error); }
}

async function reviewNomination(req, res, next) {
  try {
    const status = req.body.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    const nomination = await prisma.nomination.update({
      where: { id: req.params.id },
      data: { status, reviewedById: req.session.user.id, reviewedAt: new Date(), rejectionReason: status === 'REJECTED' ? req.body.rejectionReason : null },
      select: { id: true, userId: true, electionId: true }
    });
    if (status === 'APPROVED') {
      await prisma.user.updateMany({ where: { id: nomination.userId, role: 'VOTER' }, data: { role: 'CANDIDATE' } });
    } else {
      // A rejected nomination revokes candidacy: restore VOTER unless the user
      // still holds another active approved nomination.
      await reconcileCandidateRoles([nomination.userId]);
    }
    await recordAudit({ actorUserId: req.session.user.id, action: `NOMINATION_${status}`, entityType: 'Nomination', entityId: nomination.id });
    req.session.flashMessage = { type: 'success', text: `Nomination ${status.toLowerCase()}.` };
    return res.redirect('/admin/nominations');
  } catch (error) { return next(error); }
}

async function auditLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { fullName: true, username: true } } }
    });
    return res.render('admin/audit-logs', { title: 'Audit log', logs });
  } catch (error) { return next(error); }
}

module.exports = { auditLogs, dashboard, eligibilities, nominations, reviewEligibility, reviewNomination };