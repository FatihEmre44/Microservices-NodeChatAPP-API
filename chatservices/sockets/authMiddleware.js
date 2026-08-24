const jwt = require('jsonwebtoken');

function socketAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return next(new Error('Authorization token is required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'authservice-secret');
    const phoneNumber = decoded && decoded.phoneNumber;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return next(new Error('Token payload is invalid'));
    }

    socket.authUser = decoded;
    socket.phoneNumber = phoneNumber;
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;