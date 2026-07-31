function notFoundHandler(req, res) {
	res.status(404).json({
		success: false,
		message: `Route not found: ${req.method} ${req.originalUrl}`,
	});
}

function errorHandler(error, req, res, next) {
	if (res.headersSent) {
		return next(error);
	}

	const statusCode = error.statusCode || error.status || 500;
	const message = error.message || 'Internal server error';

	res.status(statusCode).json({
		success: false,
		message,
	});
}

module.exports = {
	notFoundHandler,
	errorHandler,
};