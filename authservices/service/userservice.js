const Auth = require('../models/auth');
const { publishAuthEvent } = require('../rabbit/publisher');

async function createAuth(input) {
	const auth = new Auth({
		phoneNumber: input.phoneNumber,
		twoStepPin: input.twoStepPin ?? null,
		isVerified: input.isVerified ?? true,
		status: input.status ?? 'active',
		refreshTokens: input.refreshTokens ?? [],
	});

	const savedAuth = await auth.save();

	try {
		await publishAuthEvent('created', {
			phoneNumber: savedAuth.phoneNumber,
			status: savedAuth.status,
			isVerified: savedAuth.isVerified,
		});
	} catch (error) {
		console.warn('Failed to publish auth.created event:', error.message);
	}

	return savedAuth;
}

async function findAuthByPhoneNumber(phoneNumber) {
	return Auth.findOne({ phoneNumber }).exec();
}

async function ensureAuth(phoneNumber) {
	const existingAuth = await findAuthByPhoneNumber(phoneNumber);

	if (existingAuth) {
		return existingAuth;
	}

	return createAuth({ phoneNumber });
}

async function updateAuthByPhoneNumber(phoneNumber, updates) {
	return Auth.findOneAndUpdate({ phoneNumber }, updates, {
		new: true,
		runValidators: true,
	}).exec();
}

async function markAuthVerified(phoneNumber) {
	const updatedAuth = await updateAuthByPhoneNumber(phoneNumber, {
		isVerified: true,
		twoStepPin: null,
	});

	if (updatedAuth) {
		try {
			await publishAuthEvent('verified', {
				phoneNumber: updatedAuth.phoneNumber,
				status: updatedAuth.status,
				isVerified: updatedAuth.isVerified,
			});
		} catch (error) {
			console.warn('Failed to publish auth.verified event:', error.message);
		}
	}

	return updatedAuth;
}

async function updateAuthStatus(phoneNumber, status) {
	return updateAuthByPhoneNumber(phoneNumber, { status });
}

async function addRefreshToken(phoneNumber, refreshToken) {
	return Auth.findOneAndUpdate(
		{ phoneNumber },
		{ $addToSet: { refreshTokens: refreshToken } },
		{ new: true, runValidators: true }
	).exec();
}

async function removeRefreshToken(phoneNumber, refreshToken) {
	return Auth.findOneAndUpdate(
		{ phoneNumber },
		{ $pull: { refreshTokens: refreshToken } },
		{ new: true, runValidators: true }
	).exec();
}

async function clearRefreshTokens(phoneNumber) {
	return Auth.findOneAndUpdate(
		{ phoneNumber },
		{ $set: { refreshTokens: [] } },
		{ new: true, runValidators: true }
	).exec();
}

module.exports = {
	createAuth,
	findAuthByPhoneNumber,
	ensureAuth,
	updateAuthByPhoneNumber,
	markAuthVerified,
	updateAuthStatus,
	addRefreshToken,
	removeRefreshToken,
	clearRefreshTokens,
};