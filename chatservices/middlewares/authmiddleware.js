const jwt = require('jsonwebtoken');

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

    req.authUser = decoded;
    req.authPhoneNumber = authPhoneNumber;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
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

module.exports = {
  requireJwtAuth,
  requireBodyField,
};
