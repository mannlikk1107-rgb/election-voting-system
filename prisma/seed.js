require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');

async function upsertUser(database, { email, username, fullName, passwordHash, role }) {
  return database.user.upsert({
    where: { email },
    update: { username, fullName, passwordHash, role, accountStatus: 'ACTIVE' },
    create: { email, username, fullName, passwordHash, role }
  });
}

async function seedDemoData(database, password) {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('SEED_ADMIN_PASSWORD must have 8+ characters, uppercase, lowercase, and a number.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const upsert = (account) => upsertUser(database, { ...account, passwordHash });
  const admin = await upsert({ email: 'admin@example.edu', username: 'admin', fullName: 'Election Administrator', role: 'ADMINISTRATOR' });
  const candidateOne = await upsert({ email: 'alex@example.edu', username: 'alexchen', fullName: 'Alex Chen', role: 'CANDIDATE' });
  const candidateTwo = await upsert({ email: 'sam@example.edu', username: 'sampatel', fullName: 'Sam Patel', role: 'CANDIDATE' });
  const candidateThree = await upsert({ email: 'casey@example.edu', username: 'caseymorgan', fullName: 'Casey Morgan', role: 'CANDIDATE' });
  const voterOne = await upsert({ email: 'voter@example.edu', username: 'studentvoter', fullName: 'Jordan Lee', role: 'VOTER' });
  const voterTwo = await upsert({ email: 'voter2@example.edu', username: 'studentvoter2', fullName: 'Taylor Nguyen', role: 'VOTER' });
  const pendingVoter = await upsert({ email: 'pending@example.edu', username: 'pendingstudent', fullName: 'Morgan Rivera', role: 'VOTER' });
  const now = new Date();
  const electionData = {
    title: 'Student Union Representative Election',
    description: 'Choose the next representative for the student union. Review each candidate manifesto before voting.',
    rules: 'Each approved voter may submit one confidential vote. The ballot is final once submitted.',
    nominationStart: new Date(now.getTime() - 20 * 86400000),
    nominationEnd: new Date(now.getTime() - 10 * 86400000),
    votingStart: new Date(now.getTime() - 5 * 86400000),
    votingEnd: new Date(now.getTime() + 5 * 86400000),
    status: 'VOTING',
    resultsPublishedAt: null,
    createdById: admin.id
  };
  const election = await database.election.upsert({
    where: { id: 'demo-student-union-election' },
    create: { id: 'demo-student-union-election', ...electionData },
    update: electionData
  });

  for (const [user, status] of [[voterOne, 'APPROVED'], [voterTwo, 'APPROVED'], [pendingVoter, 'PENDING']]) {
    await database.voterEligibility.upsert({
      where: { electionId_userId: { electionId: election.id, userId: user.id } },
      create: {
        electionId: election.id,
        userId: user.id,
        status,
        reviewedById: status === 'APPROVED' ? admin.id : null,
        reviewedAt: status === 'APPROVED' ? now : null
      },
      update: {
        status,
        reviewedById: status === 'APPROVED' ? admin.id : null,
        reviewedAt: status === 'APPROVED' ? now : null,
        rejectionReason: null
      }
    });
  }
  for (const [user, candidateDisplayName, biography, manifesto] of [
    [candidateOne, 'Alex Chen', 'A second-year student focused on accessible campus services and stronger student representation.', 'I will publish monthly updates, expand evening study access, and make student association budgets easier to understand.'],
    [candidateTwo, 'Sam Patel', 'A student volunteer who has worked with clubs and peer-support groups across campus.', 'I will improve club funding access, strengthen peer-support programs, and create regular open forums for student feedback.'],
    [candidateThree, 'Casey Morgan', 'A student representative focused on inclusive campus events and clear communication.', 'I will expand accessible events, publish concise council updates, and make it easier for students to raise shared concerns.']
  ]) {
    await database.nomination.upsert({
      where: { electionId_userId: { electionId: election.id, userId: user.id } },
      create: { electionId: election.id, userId: user.id, candidateDisplayName, biography, manifesto, status: 'APPROVED', reviewedById: admin.id, reviewedAt: now },
      update: { candidateDisplayName, biography, manifesto, status: 'APPROVED', reviewedById: admin.id, reviewedAt: now }
    });
  }
  return {
    election,
    users: { admin, candidateOne, candidateTwo, candidateThree, voterOne, voterTwo, pendingVoter }
  };
}

function getSeedPassword(environment = process.env) {
  if (!environment.SEED_ADMIN_PASSWORD) {
    throw new Error('Set SEED_ADMIN_PASSWORD in the private environment before seeding.');
  }
  return environment.SEED_ADMIN_PASSWORD;
}

async function main() {
  const password = getSeedPassword();
  const { election } = await seedDemoData(prisma, password);
  console.log(`Seeded demo accounts and election "${election.title}".`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { getSeedPassword, seedDemoData };