const express = require('express');
const { getUser, createUser, updateUser } = require('../controller/usercontroller');

const router = express.Router();

router.get('/:phoneNumber', getUser);
router.post('/', createUser);
router.patch('/:phoneNumber', updateUser);

module.exports = router;
