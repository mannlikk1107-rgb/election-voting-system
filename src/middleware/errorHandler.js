function notFound(req, res) {
  res.status(404).render('errors/404', { title: 'Page not found' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number(error.status || error.statusCode) || 500;
  if (status >= 500) console.error(error);
  const view = status === 403 ? 'errors/403' : status === 404 ? 'errors/404' : status === 400 ? 'errors/400' : 'errors/500';
  res.status(status).render(view, {
    title: status === 403 ? 'Access denied' : status === 404 ? 'Page not found' : status === 400 ? 'Invalid request' : 'Something went wrong',
    message: process.env.NODE_ENV === 'production' && status >= 500
      ? 'Please try again later.'
      : error.message
  });
}

module.exports = { notFound, errorHandler };