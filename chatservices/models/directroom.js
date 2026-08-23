const mongoose = require('mongoose');

const directRoomSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'Direct room must have exactly two participants',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DirectRoom', directRoomSchema);
