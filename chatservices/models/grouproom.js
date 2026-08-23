const mongoose = require('mongoose');

const groupRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: 'Group room must have at least two participants',
      },
    },
    adminIds: {
      type: [String],
      default: [],
    },
    groupName: {
      type: String,
      required: true,
      trim: true,
    },
    groupPhoto: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GroupRoom', groupRoomSchema);
