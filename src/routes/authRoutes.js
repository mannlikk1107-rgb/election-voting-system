const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const controller = require('../controllers/authController');
const { requireAuthentication } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.'
});
const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
  .matches(/[A-Z]/).withMessage('Password must include an uppercase letter.')
  .matches(/[a-z]/).withMessage('Password must include a lowercase letter.')
  .matches(/[0-9]/).withMessage('Password must include a number.');

router.get('/login', controller.renderLogin);
router.post('/login', loginRateLimiter, [
  body('identifier').trim().notEmpty().withMessage('Enter your email or username.'),
  body('password').notEmpty().withMessage('Enter your password.')
], validateRequest('/login'), controller.login);
router.get('/register', controller.renderRegistration);
router.post('/register', [
  body('fullName').trim().isLength({ min: 2, max: 120 }).withMessage('Enter your full name.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('username').trim().matches(/^[a-zA-Z0-9_.-]{3,32}$/).withMessage('Username must be 3-32 characters and use letters, numbers, dots, dashes, or underscores.'),
  passwordRules,
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')
], validateRequest('/register'), controller.register);
router.post('/logout', requireAuthentication, controller.logout);

module.exports = router;