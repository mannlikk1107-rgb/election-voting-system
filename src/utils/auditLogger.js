const prisma = require('../config/database');

async function recordAudit({ actorUserId, action, entityType, entityId, details }) {
  return prisma.auditLog.create({
    data: {
      actorUserId: actorUserId || null,
      action,
      entityType,
      entityId: entityId || null,
      details
    }
  });
}

module.exports = { recordAudit };