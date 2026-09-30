function validateElectionDates(dates) {
  const nominationStart = new Date(dates.nominationStart);
  const nominationEnd = new Date(dates.nominationEnd);
  const votingStart = new Date(dates.votingStart);
  const votingEnd = new Date(dates.votingEnd);

  if ([nominationStart, nominationEnd, votingStart, votingEnd].some((date) => Number.isNaN(date.getTime()))) {
    return 'Enter valid dates for all election periods.';
  }
  if (nominationStart >= nominationEnd) return 'Nomination start must be before nomination end.';
  if (nominationEnd > votingStart) return 'Nomination must end before or when voting starts.';
  if (votingStart >= votingEnd) return 'Voting start must be before voting end.';
  return null;
}

module.exports = { validateElectionDates };