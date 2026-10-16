const { validationResult } = require('express-validator');
const prisma = require('../config/database');
const { transitionElection } = require('../services/electionService');
const { validateElectionDates } = require('../utils/dateValidation');

async function list(req, res, next) {
  try {
    const elections = await prisma.election.findMany({ orderBy: { votingStart: 'desc' } });
    return res.render('elections/index', { title: 'Elections', elections });
  } catch (error) { return next(error); }
}

async function show(req, res, next) {
  try {
    const election = await prisma.election.findUnique({
      where: { id: req.params.electionId },
      include: { nominations: { where: { status: 'APPROVED' }, orderBy: { candidateDisplayName: 'asc' } } }
    });
    if (!election) return res.status(404).render('errors/404', { title: 'Election not found' });
    let eligibility = null;
    let nomination = null;
    if (req.session.user) {
      [eligibility, nomination] = await Promise.all([
        prisma.voterEligibility.findUnique({ where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } } }),
        prisma.nomination.findUnique({ where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } } })
      ]);
    }
    return res.render('elections/show', { title: election.title, election, eligibility, nomination });
  } catch (error) { return next(error); }
}

function renderCreate(req, res) {
  res.render('admin/election-form', { title: 'Create election', election: {} });
}

async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    const dateError = validateElectionDates(req.body);
    if (!errors.isEmpty() || dateError) {
      req.session.flashMessage = { type: 'danger', text: dateError || errors.array()[0].msg };
      return res.redirect('/admin/elections/new');
    }
    const election = await prisma.election.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        rules: req.body.rules || '',
        nominationStart: new Date(req.body.nominationStart),
        nominationEnd: new Date(req.body.nominationEnd),
        votingStart: new Date(req.body.votingStart),
        votingEnd: new Date(req.body.votingEnd),
        createdById: req.session.user.id
      }
    });
    req.session.flashMessage = { type: 'success', text: 'Election created.' };
    return res.redirect(`/elections/${election.id}`);
  } catch (error) { return next(error); }
}

async function renderEdit(req, res, next) {
  try {
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    if (!election) return res.status(404).render('errors/404', { title: 'Election not found' });
    if (election.status !== 'DRAFT') {
      req.session.flashMessage = { type: 'warning', text: 'Only draft elections can be edited.' };
      return res.redirect(`/elections/${election.id}`);
    }
    return res.render('admin/election-form', { title: 'Edit election', election });
  } catch (error) { return next(error); }
}

async function update(req, res, next) {
  try {
    const dateError = validateElectionDates(req.body);
    if (!validationResult(req).isEmpty() || dateError) {
      req.session.flashMessage = { type: 'danger', text: dateError || validationResult(req).array()[0].msg };
      return res.redirect(`/admin/elections/${req.params.electionId}/edit`);
    }
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    if (!election || election.status !== 'DRAFT') throw Object.assign(new Error('Only draft elections can be edited.'), { status: 404 });
    await prisma.election.update({
      where: { id: election.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        rules: req.body.rules || '',
        nominationStart: new Date(req.body.nominationStart),
        nominationEnd: new Date(req.body.nominationEnd),
        votingStart: new Date(req.body.votingStart),
        votingEnd: new Date(req.body.votingEnd)
      }
    });
    req.session.flashMessage = { type: 'success', text: 'Election updated.' };
    return res.redirect(`/elections/${election.id}`);
  } catch (error) { return next(error); }
}

async function changeStatus(req, res, next) {
  try {
    await transitionElection(req.params.electionId, req.body.status, req.session.user.id);
    req.session.flashMessage = { type: 'success', text: `Election moved to ${req.body.status.toLowerCase()}.` };
    return res.redirect(`/elections/${req.params.electionId}`);
  } catch (error) { return next(error); }
}

async function applyEligibility(req, res, next) {
  try {
    if (req.session.user.role !== 'VOTER') {
      return res.status(403).render('errors/403', { title: 'Voter access required' });
    }
    const election = await prisma.election.findUnique({ where: { id: req.params.electionId } });
    if (!election || election.status === 'ARCHIVED') throw Object.assign(new Error('This election is unavailable.'), { status: 404 });
    const existing = await prisma.voterEligibility.findUnique({
      where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } },
      select: { status: true }
    });
    if (existing?.status === 'APPROVED') {
      req.session.flashMessage = { type: 'warning', text: 'You are already approved to vote in this election.' };
      return res.redirect(`/elections/${election.id}`);
    }
    await prisma.voterEligibility.upsert({
      where: { electionId_userId: { electionId: election.id, userId: req.session.user.id } },
      create: { electionId: election.id, userId: req.session.user.id },
      update: { status: 'PENDING', reviewedById: null, reviewedAt: null, rejectionReason: null }
    });
    req.session.flashMessage = { type: 'success', text: 'Voter approval request submitted.' };
    return res.redirect(`/elections/${election.id}`);
  } catch (error) { return next(error); }
}

module.exports = { applyEligibility, changeStatus, create, list, renderCreate, renderEdit, show, update };