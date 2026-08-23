const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

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
    const authPhoneNumber = decoded && decoded.phoneNumber;

    if (!authPhoneNumber || typeof authPhoneNumber !== 'string' || !authPhoneNumber.trim()) {
      return res.status(401).json({ success: false, message: 'Token payload is invalid' });
    }

    const routePhoneNumber = req.params.phoneNumber;
    if (routePhoneNumber && routePhoneNumber !== authPhoneNumber) {
      return res.status(403).json({ success: false, message: 'Forbidden: phone number mismatch' });
    }

    req.authUser = decoded;
    req.authPhoneNumber = authPhoneNumber;
    req.phoneNumber = authPhoneNumber;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

const requirePhoneNumber = requireJwtAuth;

function requireBodyField(fieldName) {
  return function (req, res, next) {
    const value = req.body[fieldName];

    if (value === undefined || value === null || value === '') {
      return res.status(400).json({ success: false, message: `${fieldName} is required` });
    }

    next();
  };
}

function errorHandler(err, req, res, next) {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
}

module.exports = {
  requireJwtAuth,
  requirePhoneNumber,
  requireBodyField,
  errorHandler,
};
