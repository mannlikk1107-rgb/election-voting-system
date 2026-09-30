const { authenticateUser, registerUser } = require('../services/authService');

function renderLogin(req, res) {
  res.render('auth/login', { title: 'Sign in' });
}

function renderRegistration(req, res) {
  res.render('auth/register', { title: 'Create account', formData: {} });
}

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);
    req.session.user = user;
    req.session.flashMessage = { type: 'success', text: 'Your account is ready. Apply for voter approval for an election to vote.' };
    return res.redirect('/dashboard');
  } catch (error) {
    if (error.code === 'P2002') {
      req.session.flashMessage = { type: 'danger', text: 'That email or username is already registered.' };
      return res.redirect('/register');
    }
    if (error.status === 409) {
      req.session.flashMessage = { type: 'danger', text: error.message };
      return res.redirect('/register');
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authenticateUser(req.body.identifier, req.body.password);
    if (!user) {
      req.session.flashMessage = { type: 'danger', text: 'The email/username or password is incorrect.' };
      return res.redirect('/login');
    }
    const returnTo = req.session.returnTo;
    return req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = user;
      return req.session.save((saveError) => {
        if (saveError) return next(saveError);
        const safeReturnTo = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : '/dashboard';
        return res.redirect(safeReturnTo);
      });
    });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('election.sid');
    return res.redirect('/');
  });
}

module.exports = { login, logout, register, renderLogin, renderRegistration };