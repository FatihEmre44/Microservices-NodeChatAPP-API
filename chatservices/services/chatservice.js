const http = require('http');
const jwt = require('jsonwebtoken');
const DirectRoom = require('../models/directroom');
const GroupRoom = require('../models/grouproom');
const Message = require('../models/message');
const UserCache = require('../models/usercache');
const rabbitmq = require('../config/rabbitmq');

const USERSERVICE_BASE_URL = process.env.USERSERVICE_URL || 'http://localhost:4002';

class ChatService {
  constructor(eventPublisher = rabbitmq) {
    this.eventPublisher = eventPublisher;
  }

  /**
   * UserCache'te kayıt arar; bulamazsa userservice'e HTTP GET isteği atıp
   * sonucu cache'e yazar (fallback).
   */
  async getUserFromCache(phoneNumber) {
    if (!phoneNumber) return null;

    const cached = await UserCache.findOne({ phoneNumber }).lean().exec();
    if (cached) return cached;

    try {
      const userData = await this._fetchUserFromService(phoneNumber);
      if (!userData) return null;

      return UserCache.findOneAndUpdate(
        { phoneNumber },
        {
          phoneNumber,
          name: userData.name || phoneNumber,
          photo: userData.photo || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean().exec();
    } catch (error) {
      console.warn('UserCache fallback failed for', phoneNumber, error.message);
      return null;
    }
  }

  /**
   * Userservice'e service-to-service HTTP GET isteği.
   * JWT_SECRET ile geçici bir token üretip Authorization header'ına ekler.
   */
  _fetchUserFromService(phoneNumber) {
    return new Promise((resolve, reject) => {
      const secret = process.env.JWT_SECRET || 'authservice-secret';
      const serviceToken = jwt.sign({ phoneNumber, service: 'chatservice' }, secret, { expiresIn: '30s' });

      const url = new URL(`/users/${encodeURIComponent(phoneNumber)}`, USERSERVICE_BASE_URL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceToken}`,
          'Accept': 'application/json',
        },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return resolve(null);
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.data || parsed);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }

  async getRoomsForUser(phoneNumber) {
    const [directRooms, groupRooms] = await Promise.all([
      DirectRoom.find({ participants: phoneNumber }).sort({ updatedAt: -1 }).lean().exec(),
      GroupRoom.find({ participants: phoneNumber }).sort({ updatedAt: -1 }).lean().exec(),
    ]);

    return {
      directRooms,
      groupRooms,
    };
  }

  async createOrFindRoom(ownerPhoneNumber, otherPhoneNumber) {
    if (!otherPhoneNumber || typeof otherPhoneNumber !== 'string' || !otherPhoneNumber.trim()) {
      const error = new Error('otherPhoneNumber is required');
      error.statusCode = 400;
      throw error;
    }

    const participants = [ownerPhoneNumber, otherPhoneNumber.trim()];
    if (participants[0] === participants[1]) {
      const error = new Error('otherPhoneNumber must be different from your phone number');
      error.statusCode = 400;
      throw error;
    }

    const existingRoom = await DirectRoom.findOne({
      participants: { $all: participants, $size: 2 },
    }).lean().exec();

    if (existingRoom) {
      return { roomType: 'direct', room: existingRoom };
    }

    const room = await DirectRoom.create({ participants });

    await this.eventPublisher.publish('chat.created', {
      roomId: room._id.toString(),
      roomType: 'direct',
      participants: room.participants,
    }, 'chat.created');

    return { roomType: 'direct', room };
  }

  async createGroupRoom(ownerPhoneNumber, payload) {
    const participants = Array.from(new Set([ownerPhoneNumber, ...(payload.participants || [])]));
    const adminIds = Array.from(new Set([ownerPhoneNumber, ...(payload.adminIds || [])]));

    if (!payload.groupName || typeof payload.groupName !== 'string' || !payload.groupName.trim()) {
      const error = new Error('groupName is required');
      error.statusCode = 400;
      throw error;
    }

    if (participants.length < 2) {
      const error = new Error('Group room requires at least two participants');
      error.statusCode = 400;
      throw error;
    }

    const room = await GroupRoom.create({
      participants,
      adminIds,
      groupName: payload.groupName.trim(),
      groupPhoto: payload.groupPhoto || null,
    });

    await this.eventPublisher.publish('chat.group.created', {
      roomId: room._id.toString(),
      roomType: 'group',
      participants: room.participants,
      groupName: room.groupName,
    }, 'chat.group.created');

    return room;
  }

  async getRoomMessages(roomId, phoneNumber, since = null) {
    const room = await this._findAccessibleRoom(roomId, phoneNumber);

    const query = { roomId: room._id };
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    return Message.find(query).sort({ createdAt: 1 }).lean().exec();
  }

  async addMessage(roomId, senderId, content, roomType = null) {
    if (!content || typeof content !== 'string' || !content.trim()) {
      const error = new Error('content is required');
      error.statusCode = 400;
      throw error;
    }

    const room = await this._findAccessibleRoom(roomId, senderId);
    const resolvedRoomType = roomType || room.roomType || (room.groupRoom ? 'group' : 'direct');

    const message = await Message.create({
      roomId: room._id,
      roomType: resolvedRoomType,
      senderId,
      content: content.trim(),
    });

    await this.eventPublisher.publish('chat.message.created', {
      roomId,
      roomType: resolvedRoomType,
      senderId,
      content: message.content,
      sentAt: message.createdAt,
    }, 'chat.message.created');

    return message;
  }

  async handleEvent(eventName, payload) {
    if (eventName === 'user.updated' || eventName === 'auth.created') {
      const phoneNumber = payload?.phoneNumber;
      if (!phoneNumber) {
        return { eventName, payload };
      }

      await UserCache.findOneAndUpdate(
        { phoneNumber: payload?.phoneNumber },
        {
          phoneNumber,
          name: payload?.name || phoneNumber,
          photo: payload?.photo || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
    }

    return { eventName, payload };
  }

  async _findAccessibleRoom(roomId, participantPhoneNumber) {
    const [directRoom, groupRoom] = await Promise.all([
      DirectRoom.findOne({ _id: roomId, participants: participantPhoneNumber }).lean().exec(),
      GroupRoom.findOne({ _id: roomId, participants: participantPhoneNumber }).lean().exec(),
    ]);

    if (groupRoom) {
      return { _id: groupRoom._id, roomType: 'group', groupRoom };
    }

    if (directRoom) {
      return { _id: directRoom._id, roomType: 'direct', directRoom };
    }

    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }
}

module.exports = ChatService;
