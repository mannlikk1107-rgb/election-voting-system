const transitions = {
  DRAFT: ['NOMINATION'],
  NOMINATION: ['VOTING'],
  VOTING: ['CLOSED'],
  CLOSED: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: []
};

function getElectionStatus(election, now = new Date()) {
  if (election.status === 'ARCHIVED' || election.status === 'PUBLISHED' || election.status === 'CLOSED') {
    return election.status;
  }
  if (election.status === 'VOTING' && now > new Date(election.votingEnd)) return 'CLOSED';
  if (election.status === 'NOMINATION' && now > new Date(election.nominationEnd)) return 'VOTING';
  return election.status;
}

function canTransitionElection(election, nextStatus, now = new Date()) {
  if (!transitions[election.status]?.includes(nextStatus)) return false;
  if (nextStatus === 'NOMINATION') {
    return now >= new Date(election.nominationStart) && now <= new Date(election.nominationEnd);
  }
  if (nextStatus === 'VOTING') {
    return now >= new Date(election.votingStart) && now <= new Date(election.votingEnd);
  }
  return true;
}

function isWithinVotingPeriod(election, now = new Date()) {
  return election.status === 'VOTING'
    && now >= new Date(election.votingStart)
    && now <= new Date(election.votingEnd);
}

function isWithinNominationPeriod(election, now = new Date()) {
  return election.status === 'NOMINATION'
    && now >= new Date(election.nominationStart)
    && now <= new Date(election.nominationEnd);
}

module.exports = { canTransitionElection, getElectionStatus, isWithinNominationPeriod, isWithinVotingPeriod };