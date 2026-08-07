const logger = require('../utils/logger');

function requirePhoneNumber(req, res, next) {
  const phoneNumber = req.params.phoneNumber || req.body.phoneNumber || req.query.phoneNumber;

  if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return res.status(400).json({ success: false, message: 'phoneNumber is required' });
  }

  req.phoneNumber = phoneNumber;
  next();
}

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
  requirePhoneNumber,
  requireBodyField,
  errorHandler,
};
