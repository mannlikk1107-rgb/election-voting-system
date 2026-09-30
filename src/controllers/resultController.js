const prisma = require('../config/database');
const { getElectionResults } = require('../services/resultService');

async function show(req, res, next) {
  try {
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    if (!election) return res.status(404).render('errors/404', { title: 'Election not found' });
    const administrator = req.session.user?.role === 'ADMINISTRATOR';
    if (election.status !== 'PUBLISHED' && !(administrator && election.status === 'CLOSED')) {
      return res.status(403).render('errors/403', { title: 'Results are not published' });
    }
    const results = await getElectionResults(election.id);
    return res.render('results/show', { title: 'Election results', results, preview: administrator && election.status === 'CLOSED' });
  } catch (error) { return next(error); }
}

module.exports = { show };