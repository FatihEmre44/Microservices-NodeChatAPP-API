const DirectRoom = require('../models/directroom');
const GroupRoom = require('../models/grouproom');

async function requireRoomParticipant(req, res, next) {
  try {
    const roomId = req.params.roomId || req.body.roomId || req.query.roomId;
    const authPhoneNumber = req.authPhoneNumber;

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'roomId is required' });
    }

    if (!authPhoneNumber) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const [directRoom, groupRoom] = await Promise.all([
      DirectRoom.findById(roomId).select('participants').lean().exec(),
      GroupRoom.findById(roomId).select('participants').lean().exec(),
    ]);

    const room = groupRoom || directRoom;
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.participants.includes(authPhoneNumber)) {
      return res.status(403).json({ success: false, message: 'Forbidden: not a room participant' });
    }

    req.roomType = groupRoom ? 'group' : 'direct';
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireRoomParticipant;
