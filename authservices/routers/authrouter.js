const express = require('express');
const {
	requirePhoneNumber,
	requireStatus,
	requireRefreshToken,
} = require('../middlewares/authmiddleware');
const {
	registerAuth,
	upsertAuth,
	getAuth,
	verifyAuth,
	updateStatus,
	addToken,
	removeToken,
	clearTokens,
} = require('../controller/authcontroller');

const router = express.Router();

router.post('/register', requirePhoneNumber, registerAuth);
router.post('/upsert', requirePhoneNumber, upsertAuth);
router.get('/', requirePhoneNumber, getAuth);
router.patch('/verify', requirePhoneNumber, verifyAuth);
router.patch('/status', requirePhoneNumber, requireStatus, updateStatus);
router.post('/token', requirePhoneNumber, requireRefreshToken, addToken);
router.delete('/token', requirePhoneNumber, requireRefreshToken, removeToken);
router.delete('/tokens', requirePhoneNumber, clearTokens);

module.exports = router;