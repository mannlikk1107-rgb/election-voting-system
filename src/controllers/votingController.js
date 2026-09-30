const prisma = require('../config/database');
const { isWithinVotingPeriod } = require('../utils/electionStatus');
const { submitVote } = require('../services/votingService');

async function ballot(req, res, next) {
  try {
    const election = await prisma.election.findUnique({
      where: { id: req.params.electionId },
      include: { nominations: { where: { status: 'APPROVED' }, orderBy: { candidateDisplayName: 'asc' } } }
    });
    if (!election) return res.status(404).render('errors/404', { title: 'Election not found' });
    if (!isWithinVotingPeriod(election)) {
      req.session.flashMessage = { type: 'warning', text: 'Voting is not open for this election.' };
      return res.redirect(`/elections/${election.id}`);
    }
    const existingVote = await prisma.vote.findUnique({
      where: { electionId_voterId: { electionId: election.id, voterId: req.session.user.id } },
      select: { submittedAt: true }
    });
    if (existingVote) {
      return res.render('voting/success', {
        title: 'Vote recorded',
        submittedAt: existingVote.submittedAt,
        receipt: req.session.voteReceipts?.[election.id] || null
      });
    }
    return res.render('voting/ballot', { title: 'Cast your vote', election });
  } catch (error) { return next(error); }
}

async function confirm(req, res, next) {
  try {
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    const nomination = election && await prisma.nomination.findFirst({
      where: { id: req.body.nominationId, electionId: election.id, status: 'APPROVED' }
    });
    if (!election || !nomination || !isWithinVotingPeriod(election)) {
      req.session.flashMessage = { type: 'danger', text: 'Select an available candidate while voting is open.' };
      return res.redirect(`/elections/${req.params.electionId}/vote`);
    }
    req.session.pendingVote = { electionId: election.id, nominationId: nomination.id };
    return res.render('voting/confirm', { title: 'Confirm your vote', election, nomination });
  } catch (error) { return next(error); }
}

async function cast(req, res, next) {
  try {
    const pendingVote = req.session.pendingVote;
    if (!pendingVote || pendingVote.electionId !== req.params.electionId) {
      req.session.flashMessage = { type: 'warning', text: 'Please select a candidate first.' };
      return res.redirect(`/elections/${req.params.electionId}/vote`);
    }
    const receipt = await submitVote({
      electionId: pendingVote.electionId,
      voterId: req.session.user.id,
      nominationId: pendingVote.nominationId
    });
    delete req.session.pendingVote;
    req.session.voteReceipts = req.session.voteReceipts || {};
    req.session.voteReceipts[receipt.electionId] = receipt.receipt;
    return res.render('voting/success', { title: 'Vote recorded', submittedAt: new Date(), receipt: receipt.receipt });
  } catch (error) {
    if (error.code === 'P2002' || error.status === 409) {
      req.session.flashMessage = { type: 'warning', text: 'A vote has already been recorded for you in this election.' };
      return res.redirect(`/elections/${req.params.electionId}`);
    }
    return next(error);
  }
}

module.exports = { ballot, cast, confirm };