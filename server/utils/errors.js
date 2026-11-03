export function notFound(req, res) { res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'A record with that value already exists.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(' ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'That record could not be found.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Resume must be 5 MB or smaller.' });
  if (err.name === 'MulterError') return res.status(400).json({ message: err.message });
  if (err instanceof URIError || err.message?.startsWith('Upload a PDF')) return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server.' });
}
