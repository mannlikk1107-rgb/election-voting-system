const app = require('./app');

const port = Number(process.env.PORT) || 8888;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Election Voting System listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);