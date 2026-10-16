const prisma = require('../config/database');
const { isWithinNominationPeriod } = require('../utils/electionStatus');

async function submit(req, res, next) {
  try {
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    if (!election || !isWithinNominationPeriod(election)) {
      req.session.flashMessage = { type: 'danger', text: 'Nominations are not open for this election.' };
      return res.redirect(`/elections/${req.params.electionId}`);
    }
    const existing = await prisma.nomination.findUnique({
      where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } },
      select: { status: true }
    });
    if (existing?.status === 'APPROVED') {
      req.session.flashMessage = { type: 'warning', text: 'Your nomination is already approved and cannot be resubmitted.' };
      return res.redirect(`/elections/${election.id}`);
    }
    await prisma.nomination.upsert({
      where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } },
      create: {
        electionId: election.id,
        userId: req.session.user.id,
        candidateDisplayName: req.body.candidateDisplayName.trim(),
        biography: req.body.biography.trim(),
        manifesto: req.body.manifesto.trim()
      },
      update: {
        candidateDisplayName: req.body.candidateDisplayName.trim(),
        biography: req.body.biography.trim(),
        manifesto: req.body.manifesto.trim(),
        status: 'PENDING',
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null
      }
    });
    req.session.flashMessage = { type: 'success', text: 'Your nomination was submitted for review.' };
    return res.redirect(`/elections/${election.id}`);
  } catch (error) { return next(error); }
}

module.exports = { submit };