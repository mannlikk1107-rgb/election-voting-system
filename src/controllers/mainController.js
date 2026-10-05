const prisma = require('../config/database');

async function home(req, res) {
  res.render('home', { title: 'University Elections', elections: [] });
}

async function dashboard(req, res, next) {
  try {
    if (req.session.user.role === 'ADMINISTRATOR') return res.redirect('/admin');
    const elections = await prisma.election.findMany({
      where: { status: { in: ['NOMINATION', 'VOTING', 'CLOSED', 'PUBLISHED'] } },
      orderBy: { votingStart: 'asc' },
      take: 8,
      include: {
        eligibilities: { where: { userId: req.session.user.id }, select: { status: true } },
        nominations: { where: { userId: req.session.user.id }, select: { status: true } },
        votes: { where: { voterId: req.session.user.id }, select: { id: true }, take: 1 }
      }
    });
    return res.render('auth/dashboard', { title: 'Your dashboard', elections });
  } catch (error) {
    return next(error);
  }
}

async function candidateDashboard(req, res, next) {
  try {
    const nominations = await prisma.nomination.findMany({
      where: { userId: req.session.user.id },
      include: { election: { select: { id: true, title: true, status: true, nominationEnd: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.render('auth/candidate-dashboard', { title: 'Candidate dashboard', nominations });
  } catch (error) { return next(error); }
}

module.exports = { candidateDashboard, dashboard, home };