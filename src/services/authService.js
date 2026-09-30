const bcrypt = require('bcrypt');
const prisma = require('../config/database');

async function registerUser({ fullName, email, username, password }) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { username }] },
    select: { email: true, username: true }
  });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'email' : 'username';
    throw Object.assign(new Error(`That ${field} is already registered.`), { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { fullName, email: email.toLowerCase(), username, passwordHash, role: 'VOTER' },
    select: { id: true, fullName: true, email: true, username: true, role: true, accountStatus: true }
  });
}

async function authenticateUser(identifier, password) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] }
  });
  if (!user || user.accountStatus !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = { authenticateUser, registerUser };