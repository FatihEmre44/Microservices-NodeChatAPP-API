const express = require('express');
const {
  getRooms,
  getRoomById,
  createDirectRoom,
  createGroupRoom,
  addMessage,
} = require('../controller/chatcontroller');
const { requireJwtAuth, requireBodyField } = require('../middlewares/authmiddleware');
const requireRoomParticipant = require('../middlewares/requireRoomParticipant');

const router = express.Router();

router.get('/', requireJwtAuth, getRooms);
router.get('/:roomId', requireJwtAuth, requireRoomParticipant, getRoomById);
router.post('/direct', requireJwtAuth, requireBodyField('participantPhoneNumber'), createDirectRoom);
router.post('/group', requireJwtAuth, requireBodyField('groupName'), requireBodyField('participants'), createGroupRoom);
router.post('/:roomId/messages', requireJwtAuth, requireRoomParticipant, requireBodyField('content'), addMessage);

module.exports = router;
