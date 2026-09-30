function requireRole(role, message) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) {
      return res.status(403).render('errors/403', { title: message || 'Access denied' });
    }
    return next();
  };
}

const requireAdministrator = requireRole('ADMINISTRATOR', 'Administrator access required');
const requireCandidate = requireRole('CANDIDATE', 'Candidate access required');

module.exports = { requireAdministrator, requireCandidate };