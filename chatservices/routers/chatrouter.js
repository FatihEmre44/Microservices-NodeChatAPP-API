const express = require('express');
const {
  getRooms,
  getRoomMessages,
  createOrFindRoom,
  createGroupRoom,
  addMessage,
} = require('../controller/chatcontroller');
const { requireJwtAuth, requireBodyField } = require('../middlewares/authmiddleware');
const requireRoomParticipant = require('../middlewares/requireRoomParticipant');

const router = express.Router();

router.get('/rooms', requireJwtAuth, getRooms);
router.get('/rooms/:roomId/messages', requireJwtAuth, requireRoomParticipant, getRoomMessages);
router.post('/rooms', requireJwtAuth, requireBodyField('otherPhoneNumber'), createOrFindRoom);
router.post('/group', requireJwtAuth, requireBodyField('groupName'), requireBodyField('participants'), createGroupRoom);
router.post('/rooms/:roomId/messages', requireJwtAuth, requireRoomParticipant, requireBodyField('content'), addMessage);

module.exports = router;
