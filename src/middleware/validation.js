const { validationResult } = require('express-validator');

function validateRequest(redirectTo) {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    req.session.flashMessage = {
      type: 'danger',
      text: errors.array().map((error) => error.msg).join(' ')
    };
    return res.redirect(redirectTo || req.get('referer') || '/');
  };
}

module.exports = { validateRequest };