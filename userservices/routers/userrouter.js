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
const { requireJwtAuth, requireSelf, requireBodyField, errorHandler } = require('../middlewares/authmiddleware');

const router = express.Router();

router.get('/', getUsers);
router.get('/search', searchUsers);
router.get('/:phoneNumber', requireJwtAuth, getUser);
router.post('/', requireBodyField('phoneNumber'), createUser);
router.patch('/:phoneNumber', requireJwtAuth, requireSelf, updateUser);
router.patch('/:phoneNumber/photo', requireJwtAuth, requireSelf, requireBodyField('photo'), updatePhoto);
router.patch('/:phoneNumber/bio', requireJwtAuth, requireSelf, updateBio);
router.patch('/:phoneNumber/status', requireJwtAuth, requireSelf, requireBodyField('status'), updateStatus);
router.patch('/:phoneNumber/deactivate', requireJwtAuth, requireSelf, deactivateUser);
router.delete('/:phoneNumber', requireJwtAuth, requireSelf, deleteUser);

router.use(errorHandler);

module.exports = router;
