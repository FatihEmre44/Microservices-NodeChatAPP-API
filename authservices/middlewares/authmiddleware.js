const jwt = require('jsonwebtoken');

const AUTH_STATUSES = new Set(['active', 'banned', 'deleted']);

function sendValidationError(res, message) {
	return res.status(400).json({
		success: false,
		message,
	});
}

function getPhoneNumber(req) {
	return req.body.phoneNumber || req.params.phoneNumber || req.query.phoneNumber;
}

function requirePhoneNumber(req, res, next) {
	const phoneNumber = getPhoneNumber(req);

	if (!phoneNumber) {
		return sendValidationError(res, 'phoneNumber is required');
	}

	req.authPhoneNumber = phoneNumber;
	next();
}

function requireStatus(req, res, next) {
	const status = req.body.status;

	if (!AUTH_STATUSES.has(status)) {
		return sendValidationError(res, 'status must be active, banned, or deleted');
	}

	req.authStatus = status;
	next();
}

function requireRefreshToken(req, res, next) {
	const refreshToken = req.body.refreshToken;

	if (!refreshToken) {
		return sendValidationError(res, 'refreshToken is required');
	}

	req.authRefreshToken = refreshToken;
	next();
}

function requireJwtAuth(req, res, next) {
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.startsWith('Bearer ')
		? authHeader.slice(7).trim()
		: null;

	if (!token) {
		return res.status(401).json({ success: false, message: 'Authorization token is required' });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'authservice-secret');
		req.authUser = decoded;
		req.authPhoneNumber = decoded.phoneNumber;
		next();
	} catch (error) {
		return res.status(401).json({ success: false, message: 'Invalid or expired token' });
	}
}

module.exports = {
	requirePhoneNumber,
	requireStatus,
	requireRefreshToken,
	requireJwtAuth,
};