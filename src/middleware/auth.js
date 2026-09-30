const prisma = require('../config/database');

function requireAuthentication(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    req.session.flashMessage = { type: 'warning', text: 'Please sign in to continue.' };
    return res.redirect('/login');
  }
  return next();
}

function requireApprovedVoter(req, res, next) {
  const electionId = req.params.electionId || req.params.id;
  if (!electionId) {
    return res.status(400).render('errors/400', { title: 'Election required' });
  }

  prisma.voterEligibility.findUnique({
    where: { electionId_userId: { electionId, userId: req.session.user.id } }
  }).then((eligibility) => {
    if (!eligibility || eligibility.status !== 'APPROVED') {
      return res.status(403).render('errors/403', { title: 'Voter approval required' });
    }
    req.voterEligibility = eligibility;
    return next();
  }).catch(next);
}

module.exports = { requireAuthentication, requireApprovedVoter };