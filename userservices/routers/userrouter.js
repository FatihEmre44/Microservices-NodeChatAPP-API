const express = require('express');
const {
  getUser,
  createUser,
  updateUser,
  getUsers,
  searchUsers,
  updatePhoto,
  updateBio,
  updateStatus,
  deactivateUser,
  deleteUser,
} = require('../controller/usercontroller');
const { requirePhoneNumber, requireBodyField, errorHandler } = require('../middlewares/authmiddleware');

const router = express.Router();

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/:phoneNumber', requirePhoneNumber, getUser);
router.post('/', requireBodyField('phoneNumber'), createUser);
router.patch('/:phoneNumber', requirePhoneNumber, updateUser);
router.patch('/:phoneNumber/photo', requirePhoneNumber, requireBodyField('photo'), updatePhoto);
router.patch('/:phoneNumber/bio', requirePhoneNumber, updateBio);
router.patch('/:phoneNumber/status', requirePhoneNumber, requireBodyField('status'), updateStatus);
router.patch('/:phoneNumber/deactivate', requirePhoneNumber, deactivateUser);
router.delete('/:phoneNumber', requirePhoneNumber, deleteUser);

router.use(errorHandler);

module.exports = router;
