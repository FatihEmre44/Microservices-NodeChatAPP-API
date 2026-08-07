const UserRepository = require('../repositories/userrepository');
const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');

class UserService {
  constructor(userRepository = new UserRepository(), eventPublisher = rabbitmq) {
    this.userRepository = userRepository;
    this.eventPublisher = eventPublisher;
  }

  async createUser(input) {
    this._validateCreateInput(input);

    const exists = await this.userRepository.exists(input.phoneNumber);
    if (exists) {
      const error = new Error('User already exists');
      error.statusCode = 409;
      throw error;
    }

    const user = await this.userRepository.create({
      phoneNumber: input.phoneNumber,
      name: input.name || input.phoneNumber,
      bio: input.bio ?? null,
      status: input.status ?? 'active',
      photo: input.photo ?? null,
      isDeleted: false,
    });

    await this.eventPublisher.publish('user.created', {
      id: user._id.toString(),
      phoneNumber: user.phoneNumber,
      name: user.name,
      status: user.status,
    }, 'user.created');

    logger.info({ userId: user._id }, 'User created');
    return user;
  }

  async findById(id) {
    if (!id) {
      const error = new Error('User id is required');
      error.statusCode = 400;
      throw error;
    }
    return this.userRepository.findById(id);
  }

  async findByPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      const error = new Error('Phone number is required');
      error.statusCode = 400;
      throw error;
    }
    return this.userRepository.findByPhoneNumber(phoneNumber);
  }

  async exists(phoneNumber) {
    return this.userRepository.exists(phoneNumber);
  }

  async updateProfile(phoneNumber, updates) {
    this._validatePhoneNumber(phoneNumber);
    const allowedFields = ['name', 'bio'];
    const updatePayload = this._pickAllowedFields(updates, allowedFields);

    if (Object.keys(updatePayload).length === 0) {
      const error = new Error('No valid profile fields provided');
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepository.updateByPhoneNumber(phoneNumber, updatePayload);
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.updated', user, 'user.updated');
    return user;
  }

  async updatePhoto(phoneNumber, photo) {
    this._validatePhoneNumber(phoneNumber);
    if (!photo) {
      const error = new Error('Photo is required');
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepository.updateByPhoneNumber(phoneNumber, { photo });
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.updated', user, 'user.updated');
    return user;
  }

  async updateBio(phoneNumber, bio) {
    this._validatePhoneNumber(phoneNumber);
    const user = await this.userRepository.updateByPhoneNumber(phoneNumber, { bio: bio ?? null });
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.updated', user, 'user.updated');
    return user;
  }

  async updateStatus(phoneNumber, status) {
    this._validatePhoneNumber(phoneNumber);
    const allowedStatuses = ['active', 'banned', 'deleted'];
    if (!allowedStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.statusCode = 400;
      throw error;
    }

    const user = await this.userRepository.updateByPhoneNumber(phoneNumber, { status });
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.updated', user, 'user.updated');
    return user;
  }

  async updateLastSeen(phoneNumber) {
    this._validatePhoneNumber(phoneNumber);
    const user = await this.userRepository.updateByPhoneNumber(phoneNumber, { lastSeenAt: new Date() });
    if (!user) {
      throw this._notFoundError('User not found');
    }
    await this._publishUserEvent('user.updated', user, 'user.updated');
    return user;
  }

  async deactivateUser(phoneNumber) {
    this._validatePhoneNumber(phoneNumber);
    const user = await this.userRepository.softDeleteByPhoneNumber(phoneNumber);
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.deactivated', user, 'user.deactivated');
    return user;
  }

  async deleteUser(phoneNumber) {
    this._validatePhoneNumber(phoneNumber);
    const user = await this.userRepository.deleteByPhoneNumber(phoneNumber);
    if (!user) {
      throw this._notFoundError('User not found');
    }

    await this._publishUserEvent('user.deleted', user, 'user.deleted');
    return user;
  }

  async searchUsers(query = '', page = 1, limit = 20) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    return this.userRepository.search(query, pageNumber, limitNumber);
  }

  async getUsers(page = 1, limit = 20) {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    return this.userRepository.list(pageNumber, limitNumber);
  }

  async getUserCount() {
    return this.userRepository.count();
  }

  async handleAuthEvent(eventName, payload) {
    if (eventName === 'auth.created') {
      const phoneNumber = payload?.phoneNumber;
      if (!phoneNumber) {
        return null;
      }
      const exists = await this.userRepository.exists(phoneNumber);
      if (!exists) {
        return this.createUser({ phoneNumber, name: payload?.name || phoneNumber, status: payload?.status || 'active' });
      }
      return null;
    }

    if (eventName === 'auth.verified') {
      const phoneNumber = payload?.phoneNumber;
      if (!phoneNumber) {
        return null;
      }
      return this.updateStatus(phoneNumber, payload?.status || 'active');
    }

    return null;
  }

  _validateCreateInput(input) {
    if (!input || typeof input !== 'object') {
      const error = new Error('User input is required');
      error.statusCode = 400;
      throw error;
    }

    this._validatePhoneNumber(input.phoneNumber);
  }

  _validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      const error = new Error('Phone number is required');
      error.statusCode = 400;
      throw error;
    }
  }

  _pickAllowedFields(source, allowedFields) {
    return Object.entries(source || {}).reduce((acc, [key, value]) => {
      if (allowedFields.includes(key)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  async _publishUserEvent(eventName, user, routingKey) {
    await this.eventPublisher.publish(eventName, {
      id: user._id.toString(),
      phoneNumber: user.phoneNumber,
      name: user.name,
      status: user.status,
      isDeleted: user.isDeleted || false,
    }, routingKey);
  }

  _notFoundError(message) {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
  }
}

module.exports = UserService;
