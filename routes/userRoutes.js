const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getCollectors,
  getAdminStatistics,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/collectors', getCollectors);
router.get('/admin/statistics', authorize('admin'), getAdminStatistics);

router
  .route('/')
  .get(authorize('admin'), getAllUsers);

router
  .route('/:id')
  .get(authorize('admin'), getUser)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;