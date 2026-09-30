require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const methodOverride = require('method-override');
const createSessionMiddleware = require('./config/session');
const csrfProtection = require('./middleware/csrfProtection');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0 }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.json({ limit: '32kb' }));
app.use(methodOverride('_method'));
app.use(createSessionMiddleware());
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flashMessage || null;
  delete req.session.flashMessage;
  res.locals.currentPath = req.path;
  next();
});
app.use(csrfProtection);
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
}));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/', require('./routes/mainRoutes'));
app.use('/', require('./routes/authRoutes'));
app.use('/elections', require('./routes/electionRoutes'));
app.use('/elections', require('./routes/nominationRoutes'));
app.use('/elections', require('./routes/votingRoutes'));
app.use('/results', require('./routes/resultRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use(notFound);
app.use(errorHandler);

module.exports = app;