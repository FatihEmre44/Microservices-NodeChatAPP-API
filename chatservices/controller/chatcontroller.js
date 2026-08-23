const ChatService = require('../services/chatservice');

const chatService = new ChatService();

async function getRooms(req, res, next) {
  try {
    const rooms = await chatService.getRoomsForUser(req.authPhoneNumber);
    return res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

async function getRoomById(req, res, next) {
  try {
    const room = await chatService.getRoomById(req.params.roomId, req.authPhoneNumber);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
}

async function createDirectRoom(req, res, next) {
  try {
    const room = await chatService.createDirectRoom(req.authPhoneNumber, req.body.participantPhoneNumber);
    return res.status(201).json({ success: true, message: 'Direct room created', data: room });
  } catch (error) {
    next(error);
  }
}

async function createGroupRoom(req, res, next) {
  try {
    const room = await chatService.createGroupRoom(req.authPhoneNumber, req.body);
    return res.status(201).json({ success: true, message: 'Group room created', data: room });
  } catch (error) {
    next(error);
  }
}

async function addMessage(req, res, next) {
  try {
    const message = await chatService.addMessage(
      req.params.roomId,
      req.authPhoneNumber,
      req.body.content,
      req.roomType
    );
    return res.status(201).json({ success: true, message: 'Message added', data: message });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRooms,
  getRoomById,
  createDirectRoom,
  createGroupRoom,
  addMessage,
};
