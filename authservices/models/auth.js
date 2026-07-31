const mongoose = require('mongoose');

const authSchema = new mongoose.Schema(
	{
		phoneNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		twoStepPin: {
			type: String,
			default: null,
		},
		status: {
			type: String,
			enum: ['active', 'banned', 'deleted'],
			default: 'active',
		},
		refreshTokens: [
			{
				type: String,
			},
		],
	},
	{
		timestamps: true,
	}
);

const Auth = mongoose.model('Auth', authSchema);

module.exports = Auth;