const DirectRoom = require('../models/directroom');
const GroupRoom = require('../models/grouproom');
const Message = require('../models/message');
const UserCache = require('../models/usercache');
const rabbitmq = require('../config/rabbitmq');

class ChatService {
  constructor(eventPublisher = rabbitmq) {
    this.eventPublisher = eventPublisher;
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

  async getRoomById(roomId, phoneNumber) {
    const [directRoom, groupRoom] = await Promise.all([
      DirectRoom.findOne({ _id: roomId, participants: phoneNumber }).lean().exec(),
      GroupRoom.findOne({ _id: roomId, participants: phoneNumber }).lean().exec(),
    ]);

    if (groupRoom) {
      return { roomType: 'group', room: groupRoom };
    }

    if (directRoom) {
      return { roomType: 'direct', room: directRoom };
    }

    return null;
  }

  async createDirectRoom(ownerPhoneNumber, participantPhoneNumber) {
    const participants = Array.from(new Set([ownerPhoneNumber, participantPhoneNumber]));

    if (participants.length !== 2) {
      const error = new Error('Direct room requires exactly two distinct participants');
      error.statusCode = 400;
      throw error;
    }

    const room = await DirectRoom.create({
      participants,
    });

    await this.eventPublisher.publish('chat.created', {
      roomId: room._id.toString(),
      roomType: 'direct',
      participants: room.participants,
    }, 'chat.created');

    return room;
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

  async addMessage(roomId, senderId, content, roomType = null) {
    if (!content || typeof content !== 'string' || !content.trim()) {
      const error = new Error('content is required');
      error.statusCode = 400;
      throw error;
    }

    const resolvedRoomType = await this._resolveRoomType(roomId, roomType, senderId);

    const message = await Message.create({
      roomId,
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
      await UserCache.findOneAndUpdate(
        { phoneNumber: payload?.phoneNumber },
        {
          phoneNumber: payload?.phoneNumber,
          name: payload?.name || payload?.phoneNumber,
          photo: payload?.photo || null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
    }

    return { eventName, payload };
  }

  async _resolveRoomType(roomId, roomType, participantPhoneNumber) {
    if (roomType === 'direct' || roomType === 'group') {
      return roomType;
    }

    const [directRoom, groupRoom] = await Promise.all([
      DirectRoom.findOne({ _id: roomId, participants: participantPhoneNumber }).select('_id').lean().exec(),
      GroupRoom.findOne({ _id: roomId, participants: participantPhoneNumber }).select('_id').lean().exec(),
    ]);

    if (groupRoom) {
      return 'group';
    }

    if (directRoom) {
      return 'direct';
    }

    const error = new Error('Room not found');
    error.statusCode = 404;
    throw error;
  }
}

module.exports = ChatService;
