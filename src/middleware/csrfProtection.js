const crypto = require('crypto');

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (!unsafeMethods.has(req.method)) return next();

  const submitted = req.get('x-csrf-token') || req.body?._csrf;
  const expected = req.session.csrfToken;
  if (typeof submitted !== 'string' || submitted.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))) {
    return next(Object.assign(new Error('Your form expired. Reload the page and try again.'), { status: 403 }));
  }
  return next();
}

module.exports = csrfProtection;