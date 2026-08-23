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
const { requireJwtAuth, requireBodyField, errorHandler } = require('../middlewares/authmiddleware');

const router = express.Router();

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/:phoneNumber', requireJwtAuth, getUser);
router.post('/', requireBodyField('phoneNumber'), createUser);
router.patch('/:phoneNumber', requireJwtAuth, updateUser);
router.patch('/:phoneNumber/photo', requireJwtAuth, requireBodyField('photo'), updatePhoto);
router.patch('/:phoneNumber/bio', requireJwtAuth, updateBio);
router.patch('/:phoneNumber/status', requireJwtAuth, requireBodyField('status'), updateStatus);
router.patch('/:phoneNumber/deactivate', requireJwtAuth, deactivateUser);
router.delete('/:phoneNumber', requireJwtAuth, deleteUser);

router.use(errorHandler);

module.exports = router;
