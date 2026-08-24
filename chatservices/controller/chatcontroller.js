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

async function getRoomMessages(req, res, next) {
  try {
    const messages = await chatService.getRoomMessages(req.params.roomId, req.authPhoneNumber, req.query.since);
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}

async function createOrFindRoom(req, res, next) {
  try {
    const room = await chatService.createOrFindRoom(req.authPhoneNumber, req.body.otherPhoneNumber);
    return res.status(201).json({ success: true, message: 'Room ready', data: room });
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
  getRoomMessages,
  createOrFindRoom,
  createGroupRoom,
  addMessage,
};
